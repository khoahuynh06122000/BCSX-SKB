/**
 * ĐỐI SOÁT PHIẾU NHẬP KHO ĐÃ KÝ (Vercel Serverless Function)
 *
 * Khác hẳn với /api/gemini/scan-invoice: ở đó AI phải TỰ ĐỌC số từ tờ giấy
 * (dễ sai). Ở đây ta ĐƯA TRƯỚC số đúng từ hệ thống rồi chỉ yêu cầu AI SO SÁNH
 * với tờ giấy. So sánh bao giờ cũng chắc hơn trích xuất, vì AI chỉ cần trả
 * lời "khớp hay không khớp" thay vì đoán con số từ đầu.
 *
 * Ba việc AI được giao:
 *   1. Tờ phiếu đã có chữ ký chưa, ký ở những ô nào.
 *   2. Số trên giấy có khớp với số trong hệ thống không.
 *   3. Có dấu hiệu sửa số bằng tay không (tẩy xoá, viết đè, khác màu mực).
 *
 * LƯU Ý VỀ ĐỘ TIN CẬY: mục 3 chỉ là CẢNH BÁO ĐỂ NGƯỜI XEM LẠI, không phải
 * kết luận giám định. AI có thể bỏ sót sửa đổi tinh vi, hoặc báo nhầm khi
 * người viết chữ xấu / giấy nhăn / ảnh chụp mờ.
 */
import { GoogleGenAI, Type } from '@google/genai';
import { requireUser } from '../_auth';

export const config = {
  api: {
    bodyParser: { sizeLimit: '10mb' },
  },
};

let aiInstance: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('Thiếu biến môi trường GEMINI_API_KEY.');
    aiInstance = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
    });
  }
  return aiInstance;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Chi nguoi da dang nhap moi goi duoc - xem api/_auth.ts.
  const user = await requireUser(req, res);
  if (!user) return;

  try {
    const { image, expected } = req.body || {};
    if (!image) return res.status(400).json({ error: 'Thiếu ảnh phiếu.' });
    if (!expected?.rows?.length) {
      return res.status(400).json({ error: 'Thiếu dữ liệu đối chiếu.' });
    }

    const imagePart = {
      inlineData: {
        mimeType: 'image/jpeg',
        data: String(image).split(',')[1] || image,
      },
    };

    // Bảng số liệu chuẩn từ hệ thống, đánh số để AI tham chiếu lại chính xác
    const expectedTable = expected.rows
      .map(
        (r: any, i: number) =>
          `${i + 1}. ${r.name} | số lô: ${r.batch || '—'} | số lượng: ${r.quantity} ${r.unit || ''}`,
      )
      .join('\n');

    const prompt = `Bạn đang kiểm tra một PHIẾU NHẬP KHO đã được in ra từ hệ thống rồi ký tay.

DƯỚI ĐÂY LÀ SỐ LIỆU CHUẨN TRONG HỆ THỐNG (đây là bản gốc đúng):
Mã phiếu: ${expected.code}
Ngày: ${expected.date}
${expectedTable}

Hãy xem ảnh tờ phiếu và trả lời CHÍNH XÁC ba việc sau:

1. CHỮ KÝ: Tờ phiếu có chữ ký tay không? Ở phần chân phiếu có 4 ô: "Người lập phiếu", "Thủ kho", "Kế toán", "Trưởng bộ phận". Hãy liệt kê tên những ô ĐÃ CÓ chữ ký hoặc chữ viết tay. Nếu tờ phiếu hoàn toàn trắng chỗ ký thì signaturePresent = false.

2. ĐỐI CHIẾU SỐ: Với TỪNG dòng hàng trong bảng ở trên, hãy tìm dòng tương ứng trên ảnh và đọc số lượng ghi trên giấy. So sánh với số trong hệ thống.
   - Nếu đọc được và bằng nhau: matched = true.
   - Nếu đọc được nhưng khác: matched = false, ghi số đọc được vào paperQuantity.
   - Nếu không đọc được / không tìm thấy dòng đó: matched = true và paperQuantity = null (KHÔNG báo lệch chỉ vì ảnh mờ).

3. DẤU HIỆU SỬA SỐ: Có chỗ nào bị tẩy xoá, gạch đi viết lại, viết đè lên số in, dùng bút khác màu để sửa, hay dán che không? Nếu có, mô tả rõ vị trí (tên mặt hàng nào, số nào). Chỉ báo alterationSuspected = true khi thực sự nhìn thấy dấu vết, KHÔNG suy đoán.

Trả lời bằng tiếng Việt, ngắn gọn, theo đúng cấu trúc JSON được yêu cầu.`;

    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: [imagePart, { text: prompt }] },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            signaturePresent: {
              type: Type.BOOLEAN,
              description: 'Tờ phiếu có chữ ký tay hay không',
            },
            signedBoxes: {
              type: Type.ARRAY,
              description: 'Tên các ô đã có chữ ký',
              items: { type: Type.STRING },
            },
            rows: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING, description: 'Tên mặt hàng' },
                  expectedQuantity: {
                    type: Type.NUMBER,
                    description: 'Số lượng trong hệ thống',
                  },
                  paperQuantity: {
                    type: Type.NUMBER,
                    description: 'Số lượng đọc được trên giấy, để trống nếu không đọc được',
                  },
                  matched: { type: Type.BOOLEAN },
                },
                required: ['name', 'matched'],
              },
            },
            alterationSuspected: {
              type: Type.BOOLEAN,
              description: 'Có nhìn thấy dấu vết sửa chữa số hay không',
            },
            alterationNotes: {
              type: Type.STRING,
              description: 'Mô tả vị trí và loại dấu vết sửa chữa',
            },
            imageQualityNote: {
              type: Type.STRING,
              description: 'Ghi chú nếu ảnh mờ, thiếu sáng, che khuất',
            },
          },
          required: ['signaturePresent', 'rows', 'alterationSuspected'],
        },
      },
    });

    const result = JSON.parse(response.text || '{}');

    // Tự tổng kết ở phía máy chủ để giao diện chỉ việc hiển thị
    const mismatches = (result.rows || []).filter((r: any) => r.matched === false);
    const verdict =
      result.alterationSuspected || mismatches.length > 0
        ? 'warning'
        : result.signaturePresent
          ? 'ok'
          : 'unsigned';

    res.status(200).json({ ...result, mismatchCount: mismatches.length, verdict });
  } catch (error) {
    console.error('Verify slip error:', error);
    res.status(500).json({ error: 'Không đối soát được phiếu.' });
  }
}
