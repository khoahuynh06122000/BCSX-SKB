/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * CHẶN CỬA CHO CÁC ENDPOINT AI
 *
 * Trước đây `/api/gemini/scan-invoice` và `/api/gemini/verify-slip` không kiểm
 * người gọi. Ai biết URL cũng gọi được: đốt quota Gemini của chủ app, và vì
 * endpoint nhận ảnh tới 25MB nên còn có thể bị dùng làm chỗ xả dữ liệu.
 *
 * Cách chặn ở đây: bắt buộc gửi kèm **Firebase ID token** của người đã đăng
 * nhập, rồi hỏi lại Google xem token đó có thật và có thuộc đúng project này
 * không.
 *
 * Vì sao không dùng firebase-admin: nó cần khoá tài khoản dịch vụ (service
 * account) — thêm một bí mật nữa phải quản, mà đặt sai là mất quyền quản trị
 * cả project. Cách gọi Identity Toolkit dưới đây chỉ cần đúng web API key vốn
 * đã có trong biến môi trường, và nó vẫn xác minh chữ ký token phía Google nên
 * không thể giả mạo. Đổi lại là mất một lượt gọi mạng (~100-300ms) mỗi request
 * — chấp nhận được với thao tác quét ảnh vốn đã mất vài giây.
 */

interface VerifiedUser {
  uid: string;
  email: string;
  emailVerified: boolean;
}

/** Đọc token từ header `Authorization: Bearer <token>`. */
function readBearer(req: any): string | null {
  const raw =
    req?.headers?.authorization || req?.headers?.Authorization || "";
  const m = String(raw).match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : null;
}

/**
 * Xác minh token với Google. Trả về null nếu token sai / hết hạn / khác project.
 */
async function verifyIdToken(idToken: string): Promise<VerifiedUser | null> {
  // Cùng một web API key mà trình duyệt đang dùng. Key này vốn được thiết kế
  // để công khai; nó chỉ định danh project, không cấp quyền gì thêm.
  const apiKey =
    process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Thiếu biến môi trường VITE_FIREBASE_API_KEY (hoặc FIREBASE_API_KEY) — không xác minh được người gọi.",
    );
  }

  const resp = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    },
  );

  if (!resp.ok) return null;

  const data: any = await resp.json().catch(() => null);
  const u = data?.users?.[0];
  if (!u) return null;

  return {
    uid: String(u.localId || ""),
    email: String(u.email || ""),
    emailVerified: Boolean(u.emailVerified),
  };
}

/**
 * Cửa chặn dùng chung. Trả về người dùng đã xác minh, hoặc null nếu đã tự trả
 * lời lỗi cho client (nơi gọi chỉ cần `return` là xong).
 *
 * Ngoài việc token phải thật, còn bắt buộc email đã xác minh — chặn trường hợp
 * tạo tài khoản bằng email người khác mà chưa chứng minh quyền sở hữu hộp thư.
 *
 * Muốn siết thêm thì đặt biến môi trường AI_ALLOWED_EMAILS (danh sách email
 * cách nhau bởi dấu phẩy); để trống thì mọi người đã đăng nhập đều dùng được.
 */
export async function requireUser(req: any, res: any): Promise<VerifiedUser | null> {
  const token = readBearer(req);
  if (!token) {
    res.status(401).json({
      error: "Thiếu thông tin đăng nhập. Hãy đăng nhập lại rồi thử lại.",
    });
    return null;
  }

  let user: VerifiedUser | null;
  try {
    user = await verifyIdToken(token);
  } catch (e: any) {
    // Thiếu cấu hình phía máy chủ là lỗi của hệ thống, không phải của người gọi
    console.error("Lỗi xác minh token:", e?.message || e);
    res.status(500).json({ error: "Máy chủ chưa cấu hình đủ để xác minh." });
    return null;
  }

  if (!user) {
    res.status(401).json({
      error: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn.",
    });
    return null;
  }

  if (!user.emailVerified) {
    res.status(403).json({ error: "Email chưa được xác minh." });
    return null;
  }

  const allowList = String(process.env.AI_ALLOWED_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  if (allowList.length > 0 && !allowList.includes(user.email.toLowerCase())) {
    res.status(403).json({ error: "Tài khoản này không được phép dùng AI." });
    return null;
  }

  return user;
}
