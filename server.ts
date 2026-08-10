import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Increase payload size for image uploads
app.use(express.json({ limit: '50mb' }));

// ---------------------------------------------------------------------------
// Supabase Admin (service-role) — CHỈ dùng ở server, không bao giờ lộ ra client
// ---------------------------------------------------------------------------
let adminClient: SupabaseClient | null = null;
function getSupabaseAdmin(): SupabaseClient {
  if (!adminClient) {
    const url = process.env.VITE_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) {
      throw new Error(
        "Thiếu VITE_SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY trong .env.local.",
      );
    }
    adminClient = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return adminClient;
}

// Xác thực người gọi phải là OWNER (dựa trên access token gửi kèm header).
async function requireOwner(
  req: express.Request,
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : "";
  if (!token) return { ok: false, status: 401, error: "Thiếu access token." };

  const admin = getSupabaseAdmin();
  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  if (userErr || !userData.user) {
    return { ok: false, status: 401, error: "Phiên đăng nhập không hợp lệ." };
  }
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .maybeSingle();
  if (!profile || profile.role !== "OWNER") {
    return { ok: false, status: 403, error: "Chỉ OWNER mới có quyền này." };
  }
  return { ok: true };
}

// Tạo người dùng mới (OWNER only)
app.post("/api/admin/create-user", async (req, res) => {
  try {
    const guard = await requireOwner(req);
    if (!guard.ok) return res.status(guard.status).json({ error: guard.error });

    const { email, password, name, role } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: "Thiếu email hoặc mật khẩu." });
    }
    const validRoles = ["OWNER", "STAFF", "VIEWER"];
    const finalRole = validRoles.includes(role) ? role : "VIEWER";

    const admin = getSupabaseAdmin();
    const { data: created, error: createErr } =
      await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // cho phép đăng nhập ngay, không cần xác nhận email
        user_metadata: { name: name || String(email).split("@")[0] },
      });
    if (createErr || !created.user) {
      return res
        .status(400)
        .json({ error: createErr?.message || "Không thể tạo người dùng." });
    }

    // Trigger đã tạo profile mặc định (VIEWER) — cập nhật lại role theo yêu cầu.
    const { error: roleErr } = await admin
      .from("profiles")
      .update({ role: finalRole, name: name || null })
      .eq("id", created.user.id);
    if (roleErr) {
      return res.status(500).json({ error: roleErr.message });
    }

    res.json({ ok: true, id: created.user.id });
  } catch (error: any) {
    console.error("create-user error:", error);
    res.status(500).json({ error: error.message || "Lỗi máy chủ." });
  }
});

// Xoá người dùng (OWNER only)
app.post("/api/admin/delete-user", async (req, res) => {
  try {
    const guard = await requireOwner(req);
    if (!guard.ok) return res.status(guard.status).json({ error: guard.error });

    const { userId } = req.body || {};
    if (!userId) return res.status(400).json({ error: "Thiếu userId." });

    const admin = getSupabaseAdmin();
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) return res.status(400).json({ error: error.message });
    // profiles có ON DELETE CASCADE nên sẽ tự xoá theo.
    res.json({ ok: true });
  } catch (error: any) {
    console.error("delete-user error:", error);
    res.status(500).json({ error: error.message || "Lỗi máy chủ." });
  }
});

// Đổi vai trò người dùng (OWNER only)
app.post("/api/admin/update-role", async (req, res) => {
  try {
    const guard = await requireOwner(req);
    if (!guard.ok) return res.status(guard.status).json({ error: guard.error });

    const { userId, role } = req.body || {};
    const validRoles = ["OWNER", "STAFF", "VIEWER"];
    if (!userId || !validRoles.includes(role)) {
      return res.status(400).json({ error: "Thiếu userId hoặc role không hợp lệ." });
    }
    const admin = getSupabaseAdmin();
    const { error } = await admin
      .from("profiles")
      .update({ role })
      .eq("id", userId);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ ok: true });
  } catch (error: any) {
    console.error("update-role error:", error);
    res.status(500).json({ error: error.message || "Lỗi máy chủ." });
  }
});

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
