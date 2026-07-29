import type { NextConfig } from "next";

// Engine C++ phục vụ file recording (.ts). Với endpoint GET file thuần này ta
// dùng rewrite thay vì API route proxy: rewrite stream thẳng nên KHÔNG dính
// giới hạn 4MB của API route (segment .ts hàng chục MB) và hỗ trợ HTTP Range để
// tua. API route /api/backend-process vẫn dùng cho phần còn lại (cần chỉnh
// header, thêm X-Forwarded-For cho WebRTC).
const ENGINE_ORIGIN =
  process.env.BACKEND_PROCESS_ORIGIN ?? "http://127.0.0.1:8009";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Backend requests are proxied via the API route at
  // `src/pages/api/backend/[...path].ts`, which strips oversized headers
  // before forwarding. A plain rewrite cannot do that.
  async rewrites() {
    return [
      {
        source: "/recording-segments/:path*",
        destination: `${ENGINE_ORIGIN}/recording-segments/:path*`,
      },
      // Playlist HLS. Source KHÔNG có đuôi ".m3u8" là cố ý: Next.js chặn/định
      // tuyến sai mọi đường dẫn kết thúc bằng ".m3u8" (kể cả qua API route lẫn
      // rewrite -> 500). Đường "/recording-segments/{id}/file" chạy được chính
      // vì không có đuôi. hls.js nhận diện playlist theo nội dung (#EXTM3U) chứ
      // không theo đuôi URL nên đổi tên đường dẫn vô hại. Query ?from=&to= được
      // rewrite giữ nguyên.
      {
        source: "/rec-playlist/:id",
        destination: `${ENGINE_ORIGIN}/cameras/:id/playback.m3u8`,
      },
    ];
  },
};

export default nextConfig;
