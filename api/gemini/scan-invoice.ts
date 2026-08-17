/**
 * Serverless Function cho Vercel — quet "PHIEU CHUYEN BO PHAN" bang Gemini.
 *
 * Khi chay tai may (npm run dev), route nay do server.ts phuc vu.
 * Khi deploy len Vercel, Vercel tu nhan dien thu muc /api va bien file nay
 * thanh endpoint POST /api/gemini/scan-invoice.
 *
 * GEMINI_API_KEY duoc doc tu Environment Variables cua Vercel (chi o phia may
 * chu, khong lot ra trinh duyet vi khong co tien to VITE_).
 */
import { GoogleGenAI, Type } from '@google/genai';
import { requireUser } from '../_auth';

export const config = {
  api: {
    bodyParser: { sizeLimit: '25mb' }, // anh base64 co the lon
  },
};

let aiInstance: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('Thieu bien moi truong GEMINI_API_KEY.');
    }
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
    const { image } = req.body || {};
    if (!image) {
      return res.status(400).json({ error: 'No image provided' });
    }

    const imagePart = {
      inlineData: {
        mimeType: 'image/jpeg',
        data: String(image).split(',')[1] || image,
      },
    };

    const prompt = `Bạn là một trợ lý thông minh giúp đọc "PHIẾU CHUYỂN BỘ PHẬN".
Hãy trích xuất danh sách các mặt hàng (tên bia), số lượng (mục "Thực xuất"), và đặc biệt là "NGÀY THỰC XUẤT" bao gồm cả GIỜ:PHÚT.
Ví dụ: "NGÀY THỰC XUẤT: 10:16 26/04/2026".
Lưu ý:
- Cột "SL" và "Đvt" có thể ghi lít hoặc số lượng keg. Hãy ưu tiên lấy số lượng thực xuất cuối cùng được ghi tay.
- Nếu ghi "22 keg" thì quantity là 22, unit là "keg".
- Trả về kết quả chính xác theo cấu trúc JSON.`;

    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: [imagePart, { text: prompt }] },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            exactDate: {
              type: Type.STRING,
              description:
                'Ngày và giờ thực xuất từ phiếu (ví dụ: 2026-04-26T10:16:00)',
            },
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  productName: { type: Type.STRING, description: 'Tên mặt hàng' },
                  quantity: { type: Type.NUMBER, description: 'Số lượng thực xuất' },
                  unit: { type: Type.STRING, description: 'Đơn vị tính' },
                },
                required: ['productName', 'quantity'],
              },
            },
          },
        },
      },
    });

    const result = JSON.parse(response.text || '{}');
    res.status(200).json(result);
  } catch (error) {
    console.error('Gemini Scan Error:', error);
    res.status(500).json({ error: 'Failed to scan image' });
  }
}
