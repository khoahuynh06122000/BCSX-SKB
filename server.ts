import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Increase payload size for image uploads
app.use(express.json({ limit: '50mb' }));

// Gemini initialization
let aiInstance: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("Missing GEMINI_API_KEY environment variable. Please configure it in Settings.");
    }
    aiInstance = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiInstance;
}

// API Routes
app.post("/api/gemini/scan-invoice", async (req, res) => {
  try {
    const { image } = req.body; // base64 string

    if (!image) {
      return res.status(400).json({ error: "No image provided" });
    }

    const imagePart = {
      inlineData: {
        mimeType: "image/jpeg",
        data: image.split(',')[1] || image,
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
      model: "gemini-3-flash-preview",
      contents: { parts: [imagePart, { text: prompt }] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            exactDate: { type: Type.STRING, description: "Ngày và giờ thực xuất từ phiếu (ví dụ: 2026-04-26T10:16:00)" },
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  productName: { type: Type.STRING, description: "Tên mặt hàng" },
                  quantity: { type: Type.NUMBER, description: "Số lượng thực xuất" },
                  unit: { type: Type.STRING, description: "Đơn vị tính" }
                },
                required: ["productName", "quantity"]
              }
            }
          }
        }
      }
    });

    const result = JSON.parse(response.text || "{}");
    res.json(result);
  } catch (error) {
    console.error("Gemini Scan Error:", error);
    res.status(500).json({ error: "Failed to scan image" });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
