import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { requireUser } from "./api/_auth";
import xoaAnhHandler from "./api/anh/xoa";
import { GOC_TRUNG_CHUYEN, KHO_ANH } from "./src/anh/duongDan";

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
  // Cung cua chan nhu ban tren Vercel, de chay tai may khong lech voi that.
  const user = await requireUser(req, res);
  if (!user) return;

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

// So anh: cung hai ham Vercel dung, de chay tai may khong lech voi that.
app.post("/api/anh/xoa", (req, res) => xoaAnhHandler(req, res));

// Trung chuyen anh: tren Vercel do luat `rewrites` trong vercel.json lam; o may
// thi hoi Cloudinary thay trinh duyet. Chi kho cua app (KHO_ANH).
app.get(/^\/api\/anh\/xem\/(.+)$/, async (req, res) => {
  const duong = req.path.slice(GOC_TRUNG_CHUYEN.length);
  if (!duong || duong.includes("..")) return res.status(400).end();
  try {
    const r = await fetch(`https://res.cloudinary.com/${KHO_ANH}/image/upload/${duong}`, {
      method: req.method === "HEAD" ? "HEAD" : "GET",
    });
    res.status(r.status);
    for (const k of ["content-type", "cache-control", "etag", "last-modified", "x-cld-error"]) {
      const v = r.headers.get(k);
      if (v) res.setHeader(k, v);
    }
    if (req.method === "HEAD") return res.end();
    res.end(Buffer.from(await r.arrayBuffer()));
  } catch (e: any) {
    console.error("Trung chuyen anh loi:", e?.message || e);
    res.status(502).end();
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
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
