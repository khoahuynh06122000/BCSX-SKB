# -*- coding: utf-8 -*-
"""
BOT CẢNH BÁO SỰ CỐ — app BCSX-SKB (anh Khoa 27/11/2026, học theo bot `agent/canh-bao.mjs` của app Kiểm kê).

Chạy trên MÁY ADMIN (Task Scheduler 17h hằng ngày — anh Khoa chọn 27/11/2026; chạy tay thêm lúc nào cũng được), đọc / ghi Firestore bằng PHIÊN FIREBASE CLI của máy
(như agent danh bạ — không có khoá nào nằm trên GitHub / Vercel). Nhắn Telegram qua bot cảnh báo dùng chung
với app Kiểm kê: biến môi trường người dùng TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID (không có thì chỉ ghi nhật ký).

Mỗi lượt:
  1. Kiểm: web mở được + đúng bản mới nhất · Firestore trả lời (thử lại sau 45 giây) · lỗi người dùng từ lượt
     trước (`loi_app`, gộp + phân mức S1/S2/S3) · hạn mức lượt đọc ngày · hóa đơn trùng số / chờ điền số > 3 ngày ·
     agent danh bạ không chạy.
  2. Mở / cập nhật / đóng sự cố ở `su_co` — mỗi sự cố MỘT tin mở + MỘT tin ✅ khi hết dấu hiệu; tăng mức báo thêm;
     admin đánh dấu đã xử lý thì thôi nhắc. Dấu hiệu khớp bài học cũ → ♻️ TÁI PHÁT.
  3. Lượt đầu tiên trong ngày: tin tóm tắt.
  4. Học từ git: commit có dòng `Sua-loi:` → bài học `git-<sha7>` trong `so_tay`; xuất docs/SO-TAY-SU-CO.md,
     commit + đẩy đúng tệp đó khi nội dung đổi.

Chạy tay:  python agent/canh_bao.py --thu      (chỉ in ra, không nhắn, không ghi, không commit)
"""
import datetime as dt
import hashlib
import json
import os
import re
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import so_tay_mau  # noqa: E402

THU = '--thu' in sys.argv
KHONG_GIT = '--khong-git' in sys.argv or THU
REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NHAT_KY = os.path.join(REPO, 'agent', 'nhat_ky_canh_bao.txt')
PRJ = 'gen-lang-client-0780471401'
DB = 'ai-studio-af5bc7f8-4722-4e10-9425-1bdf47646982'
GOC = f'https://firestore.googleapis.com/v1/projects/{PRJ}/databases/{DB}/documents'
WEB = 'https://bcsx-skb.vercel.app'
HAN_MUC_DOC = 50_000
VN = dt.timezone(dt.timedelta(hours=7))
TEN_MUC = {'S1': '🔴 SỰ CỐ KHẨN', 'S2': '🟠 SỰ CỐ NẶNG', 'S3': '🟡 LỖI NHẸ'}
THU_TU = {'S3': 1, 'S2': 2, 'S1': 3}

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass


def bay_gio():
    return dt.datetime.now(VN)


def ghi_nhat_ky(cau):
    dong = f'{bay_gio():%H:%M %d/%m/%Y} — {cau}'
    print(dong)
    if THU:
        return
    try:
        with open(NHAT_KY, 'a', encoding='utf-8') as f:
            f.write(dong + '\n')
    except Exception:
        pass


# ------------------------------------------------------------------ Firestore REST (phiên Firebase CLI)
def lay_token():
    p = os.path.expanduser('~/.config/configstore/firebase-tools.json')
    cfg = json.load(open(p, encoding='utf-8'))
    body = urllib.parse.urlencode({
        'grant_type': 'refresh_token', 'refresh_token': cfg['tokens']['refresh_token'],
        # client công khai của Firebase CLI (không phải bí mật)
        'client_id': '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com',
        'client_secret': 'j9iVZfS8kkCEFUPaAeJV0sAi'}).encode()
    return json.load(urllib.request.urlopen('https://oauth2.googleapis.com/token', body, timeout=30))['access_token']


TOKEN = ''


def goi(url, data=None, method=None):
    h = {'Authorization': 'Bearer ' + TOKEN, 'Content-Type': 'application/json'}
    r = urllib.request.Request(url, data=json.dumps(data).encode() if data is not None else None, headers=h, method=method)
    return json.load(urllib.request.urlopen(r, timeout=60))


def giai(v):
    k, x = next(iter(v.items()))
    if k == 'mapValue':
        return {a: giai(b) for a, b in x.get('fields', {}).items()}
    if k == 'arrayValue':
        return [giai(i) for i in x.get('values', [])]
    if k == 'integerValue':
        return int(x)
    if k == 'doubleValue':
        return float(x)
    if k == 'nullValue':
        return None
    return x


def ma_hoa(v):
    if v is None:
        return {'nullValue': None}
    if isinstance(v, bool):
        return {'booleanValue': v}
    if isinstance(v, int):
        return {'integerValue': str(v)}
    if isinstance(v, float):
        return {'doubleValue': v}
    if isinstance(v, (list, tuple)):
        return {'arrayValue': {'values': [ma_hoa(i) for i in v]}}
    if isinstance(v, dict):
        return {'mapValue': {'fields': {a: ma_hoa(b) for a, b in v.items()}}}
    return {'stringValue': str(v)}


def tai_lieu(d):
    f = {a: giai(b) for a, b in d.get('fields', {}).items()}
    f['_id'] = d['name'].split('/')[-1]
    return f


def truy_van(bang, where=None, order=None, limit=None):
    sq = {'from': [{'collectionId': bang}]}
    if where:
        sq['where'] = where
    if order:
        sq['orderBy'] = order
    if limit:
        sq['limit'] = limit
    kq = goi(GOC + ':runQuery', {'structuredQuery': sq})
    return [tai_lieu(x['document']) for x in kq if 'document' in x]


def ca_bang(bang):
    ra, tk = [], ''
    while True:
        u = f'{GOC}/{bang}?pageSize=300' + (f'&pageToken={tk}' if tk else '')
        r = goi(u)
        ra += [tai_lieu(d) for d in r.get('documents', [])]
        tk = r.get('nextPageToken')
        if not tk:
            return ra


def doc_mot(bang, ma):
    try:
        return tai_lieu(goi(f'{GOC}/{bang}/{urllib.parse.quote(ma, safe="")}'))
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return None
        raise


def ghi(viec):
    """viec: [(bang, ma, du_lieu, gop)] — gop=True thì chỉ ghi các trường đưa vào (merge)."""
    if THU or not viec:
        return
    for i in range(0, len(viec), 400):
        writes = []
        for bang, ma, du, gop in viec[i:i + 400]:
            w = {'update': {'name': f'projects/{PRJ}/databases/{DB}/documents/{bang}/{ma}',
                            'fields': {a: ma_hoa(b) for a, b in du.items()}}}
            if gop:
                w['updateMask'] = {'fieldPaths': [f'`{a}`' if not re.match(r'^[A-Za-z_][A-Za-z0-9_]*$', a) else a for a in du]}
            writes.append(w)
        goi(GOC + ':commit', {'writes': writes})


# ------------------------------------------------------------------ phép tính (giống src/lib/suCo.ts)
def che_loi(s, toi_da=600):
    s = re.sub(r'<[^>]*>', ' ', str(s or ''))
    s = re.sub(r'AIza[0-9A-Za-z_-]{20,}', '[khoá]', s)
    s = re.sub(r'eyJ[0-9A-Za-z_-]{10,}\.[0-9A-Za-z_-]{10,}\.[0-9A-Za-z_-]*', '[jwt]', s)
    s = re.sub(r'Bearer\s+[0-9A-Za-z._-]+', 'Bearer [ẩn]', s, flags=re.I)
    return re.sub(r'\s+', ' ', s).strip()[:toi_da]


def khoa_gop(cau):
    s = che_loi(cau, 300).lower()
    s = re.sub(r'[0-9a-f]{8,}', '#', s)
    s = re.sub(r'\d+([.,]\d+)*', '#', s)
    s = re.sub(r'#(\s*#)+', '#', s)
    return s[:160]


def muc_nhom(so_nguoi, so_lan, ma):
    tu_choi = bool(re.search(r'permission-denied|failed-precondition|resource-exhausted', ma or ''))
    if so_nguoi >= 4 or so_lan >= 30 or (tu_choi and so_nguoi >= 2):
        return 'S1'
    if so_nguoi >= 2 or so_lan >= 8 or (tu_choi and so_lan >= 3):
        return 'S2'
    return 'S3'


def gop_loi(ds):
    m = {}
    for l in ds:
        k = khoa_gop(l.get('thongDiep', ''))
        n = m.setdefault(k, {'khoa': k, 'thongDiep': l.get('thongDiep', ''), 'ma': l.get('ma', ''), 'loai': l.get('loai', ''),
                             'lan': 0, 'nguoi': set(), 'man': set(), 'ban': set()})
        n['lan'] += 1
        n['nguoi'].add(l.get('uid', ''))
        if l.get('man'):
            n['man'].add(l['man'])
        if l.get('ban'):
            n['ban'].add(l['ban'])
    ra = list(m.values())
    for n in ra:
        n['muc'] = muc_nhom(len(n['nguoi']), n['lan'], n['ma'])
    return sorted(ra, key=lambda n: (-len(n['nguoi']), -n['lan']))


def khop_bai_hoc(cau='', ma_su_co='', so_tay=()):
    cau, ma = (cau or '').lower(), (ma_su_co or '').lower()
    for b in so_tay:
        for x in str(b.get('khoaNhanDien') or '').split('|'):
            x = x.strip().lower()
            if len(x) >= 4 and ((cau and x in cau) or (ma and ma.startswith(x))):
                return b
    return None


def bam(s):
    return hashlib.sha1(s.encode('utf-8')).hexdigest()[:10]


def ngay_la(t=None):
    """Ngày hạn mức Firestore (giờ Los Angeles, có giờ mùa hè)."""
    t = t or dt.datetime.now(dt.timezone.utc)
    try:
        from zoneinfo import ZoneInfo
        la = t.astimezone(ZoneInfo('America/Los_Angeles'))
    except Exception:
        la = t.astimezone(dt.timezone(dt.timedelta(hours=-8)))
    return la


# ------------------------------------------------------------------ các phép kiểm
def kiem_web(dau_hieu):
    """Web mở được + bản trên Vercel = commit mới nhất trên origin/main."""
    try:
        html = urllib.request.urlopen(WEB + '/', timeout=30).read().decode('utf-8', 'ignore')
    except Exception as e:
        time.sleep(45)
        try:
            html = urllib.request.urlopen(WEB + '/', timeout=30).read().decode('utf-8', 'ignore')
        except Exception:
            dau_hieu.append(dict(id='web_khong_mo', muc='S1', tieuDe='Trang app không mở được',
                                 dauHieu=f'{WEB} không trả lời 2 lần cách 45 giây ({str(e)[:80]})',
                                 canLam='Mở Vercel xem deployment; nếu bản mới hỏng thì Promote bản trước.',
                                 traO='vercel.com → bcsx-skb → Deployments'))
            return None
    m = re.search(r'/assets/index-[^"]+\.js', html)
    try:
        subprocess.run(['git', '-C', REPO, 'fetch', '-q', 'origin'], timeout=60, capture_output=True)
        dong = subprocess.run(['git', '-C', REPO, 'log', '-1', '--format=%h|%cI', 'origin/main'],
                              capture_output=True, text=True, timeout=30).stdout.strip()
        sha, luc = dong.split('|')
        tuoi = (dt.datetime.now(dt.timezone.utc) - dt.datetime.fromisoformat(luc)).total_seconds() / 60
    except Exception:
        return None
    if not m:
        return sha
    js = urllib.request.urlopen(WEB + m.group(0), timeout=60).read().decode('utf-8', 'ignore')
    ban = re.findall(r'"([0-9a-f]{7})"', js)
    if sha not in ban and tuoi > 15:
        dau_hieu.append(dict(id='web_ban_cu', muc='S1', tieuDe='Vercel chưa chạy bản mới nhất (build hỏng?)',
                             dauHieu=f'Commit mới nhất {sha} đẩy {int(tuoi)} phút trước, trang chưa có mã build này.',
                             canLam='Xem log build trên Vercel; sửa lỗi build hoặc Redeploy.',
                             traO='vercel.com → bcsx-skb → Deployments'))
    return sha


def kiem_du_lieu(dau_hieu, moc, so_tay, tom):
    # Lỗi người dùng từ lượt trước
    loi = truy_van('loi_app', where={'fieldFilter': {'field': {'fieldPath': 'luc'}, 'op': 'GREATER_THAN_OR_EQUAL',
                                                     'value': {'stringValue': moc}}}, limit=1000)
    loi = [l for l in loi if not l.get('daXuLy')]
    nhom = gop_loi(loi)
    tom['loi'] = nhom
    for n in nhom:
        b = khop_bai_hoc(n['thongDiep'], '', so_tay)
        muc = n['muc']
        if b and muc == 'S3':
            muc = 'S2'  # lỗi đã từng sửa mà quay lại — không để chìm
        if muc == 'S3':
            continue
        dau_hieu.append(dict(
            id=('taiphat|' + b['_id']) if b and n['muc'] == 'S3' else 'loi|' + bam(n['khoa']), muc=muc,
            tieuDe='Người dùng gặp lỗi: ' + n['thongDiep'][:90],
            dauHieu=f"{len(n['nguoi'])} người · {n['lan']} lần · màn {', '.join(sorted(n['man'])) or '—'} · bản {', '.join(sorted(n['ban'])) or '—'}",
            lyDo=[x for x in [n['ma'] and f"Mã lỗi: {n['ma']}", n['loai'] and f"Loại: {n['loai']}"] if x],
            canLam='Đọc nhóm lỗi trong app, dựng lại lỗi, sửa; xong đánh dấu đã xử lý.',
            traO='App → Sự cố hệ thống → Lỗi 24 giờ', baiHoc=b))

    # Hạn mức lượt đọc ngày (giờ LA)
    la = ngay_la()
    hom_nay = la.strftime('%Y-%m-%d')
    dl = doc_mot('do_luong', hom_nay) or {}
    da_doc = int(dl.get('doc') or 0)
    phut = la.hour * 60 + la.minute
    du_bao = round(da_doc * 1440 / max(60, phut))
    hom_qua = doc_mot('do_luong', (la - dt.timedelta(days=1)).strftime('%Y-%m-%d')) or {}
    tom['han_muc'] = (da_doc, du_bao, int(hom_qua.get('doc') or 0))
    muc = 'S1' if da_doc >= HAN_MUC_DOC else ('S2' if du_bao >= HAN_MUC_DOC or da_doc >= HAN_MUC_DOC * 0.8 else None)
    if muc:
        dau_hieu.append(dict(id='han_muc', muc=muc, tieuDe='Lượt đọc Firebase sắp / đã vượt hạn mức ngày',
                             dauHieu=f'Đã đọc {da_doc:,} / {HAN_MUC_DOC:,} · dự báo cuối ngày {du_bao:,}'.replace(',', '.'),
                             canLam='Nhắc đóng bớt tab, bớt F5; xem ai đọc nhiều. Hạn mức đặt lại 14–15h giờ VN.',
                             traO='App → Cài đặt → Lượt gọi Firebase'))

    # Hóa đơn: trùng số · chờ điền số quá 3 ngày
    hd = [h for h in ca_bang('hoa_don') if not h.get('biThayTheBoi')]
    theo_so = {}
    for h in hd:
        so = str(h.get('soHoaDon') or '').strip().upper()
        if so:
            theo_so.setdefault(so, []).append(h)
    trung = {so: ds for so, ds in theo_so.items() if len(ds) > 1}
    if trung:
        dau_hieu.append(dict(id='hd_trung_so', muc='S1', tieuDe='Hai tờ hóa đơn trùng một số',
                             dauHieu='; '.join(f"{so}: " + ', '.join(f"{x.get('donVi')} {x.get('tuNgay')}→{x.get('denNgay')}" for x in ds)
                                               for so, ds in list(trung.items())[:5]),
                             canLam='Sửa số đúng cho tờ gõ nhầm, hoặc lập hóa đơn thay thế.',
                             traO='App → Công nợ · Hóa đơn → Đã xuất → Tra cứu'))
    han = (bay_gio() - dt.timedelta(days=3)).isoformat()
    # Chỉ xét tờ tải SAU tờ đầu tiên có số trong app (trước đó số hóa đơn chưa ghi vào app — thiếu là bình thường).
    dau_co_so = min((str(h.get('ngayKetXuat') or '9') for h in hd if str(h.get('soHoaDon') or '').strip()), default='')
    cho = [h for h in hd if not str(h.get('soHoaDon') or '').strip() and str(h.get('ngayKetXuat') or '').strip()
           and str(h.get('ngayKetXuat')) >= dau_co_so]
    tom['hd_cho'] = len(cho)
    lau = [h for h in cho if str(h.get('ngayKetXuat'))[:19] < han[:19]]
    if lau:
        dau_hieu.append(dict(id='hd_cho_so', muc='S2', tieuDe=f'{len(lau)} hóa đơn đã tải tệp TEMPLATE quá 3 ngày chưa điền số',
                             dauHieu='; '.join(f"{h.get('donVi')} đợt {h.get('tuNgay')}→{h.get('denNgay')} (tải {str(h.get('ngayKetXuat'))[:10]})"
                                               for h in sorted(lau, key=lambda x: x.get('tuNgay', ''))[:8]),
                             lyDo=['Tra cứu chỉ hiện tờ đã có số nên tờ chờ số dễ bị quên',
                                   'Lâu không điền thì dãy số hóa đơn trong app hở, đối chiếu thuế khó'],
                             canLam='Kế toán đối chiếu hệ thống hóa đơn điện tử, điền số + ngày.',
                             traO='App → Công nợ · Hóa đơn → Đã xuất → Chờ điền số'))

    # Agent danh bạ (Chủ nhật 17h) không chạy quá 8 ngày
    ns = truy_van('nhan_su', order=[{'field': {'fieldPath': 'cap_nhat_luc'}, 'direction': 'DESCENDING'}], limit=1)
    if ns:
        moi = str(ns[0].get('cap_nhat_luc') or '')
        try:
            tuoi = (dt.datetime.now(dt.timezone.utc) - dt.datetime.fromisoformat(moi.replace('Z', '+00:00'))).days
        except Exception:
            tuoi = 0
        if tuoi > 8:
            dau_hieu.append(dict(id='danhba', muc='S2', tieuDe='Agent danh bạ MySun không chạy',
                                 dauHieu=f'Danh bạ cập nhật lần cuối {moi[:10]} ({tuoi} ngày).',
                                 canLam='Mở Task Scheduler "KiemKe - Danh ba MySun"; hết phiên thì chạy firebase login --reauth.',
                                 traO='agent-mysun/nhat_ky (máy admin)'))


# ------------------------------------------------------------------ Telegram
def gui_telegram(html):
    tk, chat = os.environ.get('TELEGRAM_BOT_TOKEN', ''), os.environ.get('TELEGRAM_CHAT_ID', '')
    if THU:
        print('--- [thử] tin Telegram ---\n' + html + '\n---')
        return True
    if not tk or not chat:
        ghi_nhat_ky('Chưa có TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID — chỉ ghi nhật ký.')
        return False
    try:
        body = urllib.parse.urlencode({'chat_id': chat, 'text': html, 'parse_mode': 'HTML',
                                       'disable_web_page_preview': 'true'}).encode()
        urllib.request.urlopen(f'https://api.telegram.org/bot{tk}/sendMessage', body, timeout=30)
        return True
    except Exception as e:
        ghi_nhat_ky(f'Gửi Telegram hỏng: {str(e)[:120]}')
        return False


def thoat(s):
    return str(s or '').replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')


def tin_su_co(d, tang=False):
    dong = [f"<b>[BCSX] {TEN_MUC[d['muc']]}{' (TĂNG MỨC)' if tang else ''}</b>", f"<b>{thoat(d['tieuDe'])}</b>", '',
            f"<b>Dấu hiệu:</b> {thoat(d.get('dauHieu'))}"]
    if d.get('lyDo'):
        dong += ['<b>Vì sao là lỗi:</b>'] + [f'• {thoat(x)}' for x in d['lyDo']]
    b = d.get('baiHoc')
    if b:
        dong += ['', f"♻️ <b>TÁI PHÁT</b> — đã sửa {thoat(b.get('banSua') or b.get('ngaySua') or '')}: {thoat(b.get('tieuDe'))}",
                 f"Bài học cũ: {thoat(b.get('chanTaiPhat') or '')}"]
    if d.get('canLam'):
        dong += ['', f"<blockquote><b>CẦN LÀM:</b> {thoat(d['canLam'])}" +
                 (f"\n🔎 Tra ở: <code>{thoat(d['traO'])}</code>" if d.get('traO') else '') + '</blockquote>']
    dong += [f"<i>{thoat(d['id'])} · {bay_gio():%H:%M %d/%m}</i>"]
    return '\n'.join(dong)


def tin_on_lai(s):
    try:
        mo = dt.datetime.fromisoformat(s['moLuc'])
        phut = int((bay_gio() - mo).total_seconds() // 60)
        keo = f" · kéo dài {phut // 60} giờ {phut % 60} phút" if phut >= 60 else f' · kéo dài {phut} phút'
    except Exception:
        keo = ''
    return f"✅ <b>[BCSX] Đã ổn lại</b> · {thoat(s.get('tieuDe'))}\n<i>{thoat(s['_id'])}{keo}</i>"


# ------------------------------------------------------------------ học từ git + xuất sổ tay
KHOA_TRAILER = {'sua-loi': 'tieuDe', 'muc': 'muc', 'trieu-chung': 'trieuChung', 'nguyen-nhan': 'nguyenNhan',
                'cach-sua': 'xuLy', 'chan-tai-phat': 'chanTaiPhat', 'nhan-dien': 'khoaNhanDien', 'su-co': 'maSuCo'}


def bai_hoc_tu_git():
    SEP, END = '\x1e', '\x1d'
    try:
        raw = subprocess.run(['git', '-C', REPO, 'log', '--since=60 days ago', '--no-merges', f'--format=%h{SEP}%cI{SEP}%B{END}'],
                             capture_output=True, text=True, encoding='utf-8', timeout=60).stdout
    except Exception:
        return []
    ra = []
    for khoi in raw.split(END):
        p = khoi.lstrip().split(SEP)
        if len(p) < 3 or not re.search(r'^\s*Sua-loi\s*:', p[2], re.M | re.I):
            continue
        r = {'id': 'git-' + p[0][:7], 'loai': 'bai_hoc', 'ngaySua': p[1][:10], 'banSua': p[0][:7],
             'capNhatBoi': f'bot (commit {p[0][:7]})'}
        for dong in p[2].splitlines():
            m = re.match(r'^\s*([A-Za-z-]+)\s*:\s*(.+?)\s*$', dong)
            if m and KHOA_TRAILER.get(m.group(1).lower()) and KHOA_TRAILER[m.group(1).lower()] not in r:
                r[KHOA_TRAILER[m.group(1).lower()]] = m.group(2)[:1000]
        if r.get('tieuDe'):
            if r.get('muc') not in ('S1', 'S2', 'S3'):
                r['muc'] = 'S2'
            ra.append(r)
    return ra


def xuat_so_tay(so_tay, su_co):
    tm = {'S1': '🔴 KHẨN', 'S2': '🟠 NẶNG', 'S3': '🟡 NHẸ'}
    hd = sorted([x for x in so_tay if x.get('loai') == 'huong_dan'], key=lambda x: x.get('tieuDe', ''))
    bh = sorted([x for x in so_tay if x.get('loai') == 'bai_hoc'], key=lambda x: str(x.get('ngaySua') or ''), reverse=True)
    moc = (bay_gio() - dt.timedelta(days=30)).isoformat()
    sc = sorted([x for x in su_co if not x['_id'].startswith('_') and str(x.get('moLuc') or '') >= moc],
                key=lambda x: str(x.get('moLuc')), reverse=True)
    L = ['# Sổ tay xử lý lỗi & bài học — app BCSX-SKB', '',
         '> File này do bot `agent/canh_bao.py` **tự xuất** từ bảng `so_tay` + `su_co` sau mỗi lượt kiểm (17h). '
         '**Đừng sửa tay** — sửa trong app: *Sự cố hệ thống → Sổ tay & bài học* (chỉ admin). Bài học có **dấu hiệu nhận diện** '
         'thì bot tự báo ♻️ TÁI PHÁT khi lỗi quay lại.', '',
         f'Cập nhật: {bay_gio():%H:%M %d/%m/%Y} · {len(hd)} hướng dẫn · {len(bh)} bài học · {len(sc)} sự cố 30 ngày', '',
         '**Trước khi sửa lỗi nào: đọc file này. Lỗi đang sửa trùng / gần bài học cũ thì làm đúng mục "Chặn tái phát".**', '']

    def muc(x):
        out = [f"### {x.get('tieuDe', '')}", '', f"- **Mức:** {tm.get(x.get('muc'), x.get('muc'))}"]
        for k, n in [('trieuChung', 'Triệu chứng'), ('nguyenNhan', 'Nguyên nhân'), ('kiemTra', 'Kiểm tra'), ('xuLy', 'Xử lý'),
                     ('chanTaiPhat', 'Chặn tái phát'), ('khoaNhanDien', 'Nhận diện')]:
            if x.get(k):
                v = f"`{x[k]}`" if k == 'khoaNhanDien' else x[k]
                out.append(f'- **{n}:** {v}')
        if x.get('banSua') or x.get('ngaySua'):
            out.append(f"- **Sửa ở:** {x.get('banSua') or ''} {x.get('ngaySua') or ''}".rstrip())
        if x.get('taiPhatLan'):
            out.append(f"- **♻️ Tái phát:** {x['taiPhatLan']} lần")
        return out + ['']

    L += ['## Hướng dẫn xử lý', '']
    for x in hd:
        L += muc(x)
    L += ['## Bài học đã sửa', '']
    for x in bh:
        L += muc(x)
    L += ['## Sự cố 30 ngày gần đây', '', '| Mở lúc | Mức | Sự cố | Đóng |', '|---|---|---|---|']
    for x in sc:
        L.append(f"| {str(x.get('moLuc'))[:16].replace('T', ' ')} | {x.get('muc')} | {str(x.get('tieuDe', '')).replace('|', '/')} | "
                 f"{'admin xử lý' if x.get('daXuLy') else (str(x.get('dongLuc') or '')[:16].replace('T', ' ') or 'đang mở')} |")
    return '\n'.join(L) + '\n'


def cap_nhat_tep_so_tay(noi_dung):
    p = os.path.join(REPO, 'docs', 'SO-TAY-SU-CO.md')
    bo_gio = lambda s: re.sub(r'^Cập nhật: .*$', '', s, flags=re.M)
    cu = open(p, encoding='utf-8').read() if os.path.exists(p) else ''
    if bo_gio(cu) == bo_gio(noi_dung):
        return
    if THU:
        print(f'[thử] sổ tay sẽ đổi ({len(noi_dung)} ký tự)')
        return
    os.makedirs(os.path.dirname(p), exist_ok=True)
    open(p, 'w', encoding='utf-8', newline='\n').write(noi_dung)
    if KHONG_GIT:
        return
    g = lambda *a: subprocess.run(['git', '-C', REPO, *a], capture_output=True, text=True, timeout=120)
    g('add', 'docs/SO-TAY-SU-CO.md')
    r = g('commit', '-q', '-m', 'So tay su co: bot cap nhat docs/SO-TAY-SU-CO.md', '--', 'docs/SO-TAY-SU-CO.md')
    if r.returncode != 0:
        ghi_nhat_ky('Không commit được sổ tay: ' + (r.stderr or r.stdout)[:150])
        return
    if g('push', '-q').returncode != 0:
        if not g('status', '--porcelain', '--untracked-files=no').stdout.strip():
            g('pull', '--rebase', '-q')
            if g('push', '-q').returncode == 0:
                return
        ghi_nhat_ky('Đã commit sổ tay trên máy nhưng chưa đẩy được (cây làm việc đang có thay đổi) — lần đẩy sau sẽ kèm.')


# ------------------------------------------------------------------ lượt chạy
def chay():
    global TOKEN
    luc = bay_gio().isoformat(timespec='seconds')
    try:
        TOKEN = lay_token()
    except Exception as e:
        ghi_nhat_ky(f'Không lấy được phiên Firebase CLI — chạy `firebase login --reauth`. ({str(e)[:100]})')
        gui_telegram('<b>[BCSX] 🟠 Bot cảnh báo không đọc được Firestore</b>\nPhiên Firebase CLI trên máy admin hết hạn — chạy '
                     '<code>firebase login --reauth</code>.')
        return

    dau_hieu, tom = [], {}
    sha = kiem_web(dau_hieu)

    # Firestore trả lời không (thử lại sau 45 giây)
    try:
        moc_doc = doc_mot('su_co', '_moc') or {}
    except Exception:
        time.sleep(45)
        try:
            moc_doc = doc_mot('su_co', '_moc') or {}
        except Exception as e:
            ghi_nhat_ky(f'Firestore không trả lời: {str(e)[:120]}')
            gui_telegram(tin_su_co(dict(id='firestore', muc='S1', tieuDe='Firestore không trả lời',
                                        dauHieu=str(e)[:200], canLam='Xem Firebase console / status.firebase.google.com.',
                                        traO='console.firebase.google.com')))
            return
    moc = moc_doc.get('lanChay') or (bay_gio() - dt.timedelta(hours=12)).isoformat()
    moc = max(moc, (bay_gio() - dt.timedelta(hours=24)).isoformat())
    # loi_app ghi giờ UTC (toISOString) — đổi mốc sang UTC để so chuỗi
    moc_utc = dt.datetime.fromisoformat(moc).astimezone(dt.timezone.utc).strftime('%Y-%m-%dT%H:%M:%S')

    # Sổ tay: thêm mục khởi đầu + bài học từ git còn thiếu
    so_tay = ca_bang('so_tay')
    co = {x['_id'] for x in so_tay}
    moi = [x for x in list(so_tay_mau.tat_ca()) + bai_hoc_tu_git() if x['id'] not in co]
    if moi:
        ghi([('so_tay', x['id'], {k: v for k, v in x.items() if k != 'id'} | {'id': x['id'], 'capNhatLuc': luc}, False) for x in moi])
        so_tay += [{**x, '_id': x['id']} for x in moi]
        ghi_nhat_ky(f'Sổ tay: thêm {len(moi)} mục.')

    kiem_du_lieu(dau_hieu, moc_utc, so_tay, tom)

    # Mở / cập nhật / đóng sự cố
    su_co = [x for x in ca_bang('su_co') if not x['_id'].startswith('_')]
    theo_id = {x['_id']: x for x in su_co}
    viec, da_bao = [], 0
    thay = set()
    for d in dau_hieu:
        thay.add(d['id'])
        cu = theo_id.get(d['id'])
        b = d.get('baiHoc') or khop_bai_hoc('', d['id'], so_tay)
        if b:
            d['baiHoc'] = b
        luu = {k: v for k, v in d.items() if k not in ('baiHoc', 'id')}
        luu |= {'capNhatLuc': luc, **({'taiPhat': b['_id']} if b else {})}
        dang_mo = cu and not cu.get('dongLuc')
        if dang_mo:
            tang = THU_TU[d['muc']] > THU_TU.get(cu.get('muc'), 0)
            viec.append(('su_co', d['id'], luu | ({} if tang else {'muc': cu.get('muc')}), True))
            if tang and not cu.get('daXuLy'):
                da_bao += gui_telegram(tin_su_co(d, tang=True))
        else:
            viec.append(('su_co', d['id'], luu | {'moLuc': luc, 'daXuLy': False, 'dongLuc': ''}, False))
            da_bao += gui_telegram(tin_su_co(d))
            if b:
                viec.append(('so_tay', b['_id'], {'taiPhatLan': int(b.get('taiPhatLan') or 0) + 1}, True))
    dong = [x for x in su_co if not x.get('dongLuc') and x['_id'] not in thay]
    for x in dong:
        viec.append(('su_co', x['_id'], {'dongLuc': luc, 'capNhatLuc': luc}, True))
        if not x.get('daXuLy'):
            da_bao += gui_telegram(tin_on_lai(x))

    # Tóm tắt: lượt chạy ĐẦU TIÊN mỗi ngày (anh Khoa 27/11/2026 chỉ đặt lịch 17h)
    hom_nay = bay_gio().strftime('%Y-%m-%d')
    if moc_doc.get('tomTatNgay') != hom_nay:
        dm, qua, hq = tom.get('han_muc', (0, 0, 0))
        con_mo = [x for x in su_co if not x.get('dongLuc') and x['_id'] not in {d['_id'] for d in dong}] + \
                 [d for d in dau_hieu if d['id'] not in theo_id or theo_id[d['id']].get('dongLuc')]
        dem = {m: sum(1 for x in con_mo if x.get('muc') == m) for m in ('S1', 'S2')}
        loi = tom.get('loi', [])
        L = [f'☀️ <b>[BCSX] Tóm tắt {bay_gio():%H:%M %d/%m}</b>',
             f"• Tình trạng: {'✅ ổn' if not con_mo else f'{len(con_mo)} sự cố đang mở'} (S1: {dem['S1']} · S2: {dem['S2']})",
             f"• Lỗi người dùng từ lượt trước: {sum(n['lan'] for n in loi)} lần · {len(loi)} loại"]
        L += [f"   – {thoat(n['thongDiep'][:70])} ({len(n['nguoi'])} người, {n['lan']} lần)" for n in loi[:3]]
        L += [f"• Lượt đọc Firebase hôm qua {hq:,} / {HAN_MUC_DOC:,}".replace(',', '.'),
              f"• Hóa đơn chờ điền số: {tom.get('hd_cho', 0)}",
              f"• Bản đang chạy: {sha or '?'}"]
        gui_telegram('\n'.join(L))
        moc_doc['tomTatNgay'] = hom_nay

    viec.append(('su_co', '_moc', {'lanChay': luc, 'tomTatNgay': moc_doc.get('tomTatNgay', '')}, True))
    ghi(viec)

    # Xuất sổ tay ra repo
    try:
        so_tay2 = ca_bang('so_tay') if not THU else so_tay
        su_co2 = ca_bang('su_co') if not THU else su_co
        cap_nhat_tep_so_tay(xuat_so_tay(so_tay2, su_co2))
    except Exception as e:
        ghi_nhat_ky(f'Xuất sổ tay hỏng: {str(e)[:120]}')

    ghi_nhat_ky(f"Xong: {len(dau_hieu)} dấu hiệu, {len(dong)} sự cố đóng, {da_bao} tin đã gửi.")


if __name__ == '__main__':
    try:
        chay()
    except Exception as e:  # bot không được chết im lặng
        ghi_nhat_ky(f'Bot hỏng: {type(e).__name__}: {str(e)[:200]}')
        gui_telegram(f'<b>[BCSX] 🟠 Bot cảnh báo hỏng</b>\n{thoat(type(e).__name__)}: {thoat(str(e)[:200])}')
        sys.exit(1)
