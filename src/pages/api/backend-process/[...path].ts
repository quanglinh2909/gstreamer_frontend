import type { NextApiRequest, NextApiResponse } from "next";

// Proxy này trỏ tới ENGINE C++ (mặc định cổng 8009), khác với /api/backend vốn
// trỏ tới backend Python (cổng 8010).
//
// KHÔNG fallback sang BACKEND_ORIGIN: .env luôn đặt biến đó cho backend Python,
// nên fallback khiến proxy này âm thầm gọi sai server và giá trị mặc định bên
// dưới không bao giờ có tác dụng. Triệu chứng là mọi endpoint chỉ có ở engine
// C++ (ví dụ WHEP) trả về {"detail":"Not Found"} của FastAPI.
const BACKEND_PROCESS_ORIGIN =
  process.env.BACKEND_PROCESS_ORIGIN ?? "http://127.0.0.1:8009";

const FORWARDED_HEADERS = ["content-type", "accept", "authorization"];

const METHODS_WITH_BODY = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export const config = {
  api: { bodyParser: false },
};

async function readRawBody(req: NextApiRequest): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const upstreamPath = (req.url ?? "").replace(
    /^\/api\/backend-process\/?/,
    ""
  );
  const targetUrl = `${BACKEND_PROCESS_ORIGIN}/${upstreamPath}`;

  const headers = new Headers();
  for (const name of FORWARDED_HEADERS) {
    const value = req.headers[name];
    if (typeof value === "string") headers.set(name, value);
  }

  // IP thật của trình duyệt. Engine cần nó cho WebRTC: Chrome giấu IP nội bộ
  // sau tên mDNS ".local" trong ICE candidate, máy chạy engine không phân giải
  // được tên đó, nên engine thay bằng IP này. Ưu tiên X-Forwarded-For có sẵn
  // (khi đứng sau thêm một reverse proxy nữa), không thì lấy từ socket.
  const existingXff = req.headers["x-forwarded-for"];
  const clientIp =
    (typeof existingXff === "string" ? existingXff.split(",")[0]?.trim() : "") ||
    req.socket.remoteAddress ||
    "";
  if (clientIp) headers.set("x-forwarded-for", clientIp);

  const method = (req.method ?? "GET").toUpperCase();

  try {
    const upstream = await fetch(targetUrl, {
      method,
      headers,
      body: METHODS_WITH_BODY.has(method)
        ? ((await readRawBody(req)) as unknown as BodyInit)
        : undefined,
    });

    const contentType = upstream.headers.get("content-type");
    if (contentType) res.setHeader("content-type", contentType);

    // Chuyển tiếp Cache-Control để trình duyệt cache được ảnh thumbnail (khung
    // quá khứ không đổi). Các endpoint khác của engine không đặt header này nên
    // hành vi của chúng giữ nguyên.
    const cacheControl = upstream.headers.get("cache-control");
    if (cacheControl) res.setHeader("cache-control", cacheControl);

    // WHEP trả URL của phiên trong header Location; không chuyển tiếp thì
    // trình duyệt không biết DELETE vào đâu và phiên WebRTC chỉ chết theo
    // watchdog phía engine (giữ kết nối RTSP thừa tới 30s).
    const location = upstream.headers.get("location");
    if (location) res.setHeader("location", location);

    const body = Buffer.from(await upstream.arrayBuffer());
    res.status(upstream.status).send(body);
  } catch (err) {
    const detail = err instanceof Error ? err.message : "Unknown error";
    console.error(
      `[backend-process-proxy] ${method} ${targetUrl} failed: ${detail}`
    );
    res.status(502).json({ error: "Bad Gateway", detail });
  }
}
