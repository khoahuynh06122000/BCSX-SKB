import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import xoaAnhHandler from "./api/anh/xoa";
import { GOC_TRUNG_CHUYEN, KHO_ANH } from "./src/anh/duongDan";

dotenv.config();

const app = express();
const PORT = 3000;

// Increase payload size for image uploads
app.use(express.json({ limit: '50mb' }));

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
