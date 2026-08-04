import type { NextConfig } from "next";

// Engine C++ phục vụ file recording (.ts). Với endpoint GET file thuần này ta
// dùng rewrite thay vì API route proxy: rewrite stream thẳng nên KHÔNG dính
// giới hạn 4MB của API route (segment .ts hàng chục MB) và hỗ trợ HTTP Range để
// tua. API route /api/backend-process vẫn dùng cho phần còn lại (cần chỉnh
// header, thêm X-Forwarded-For cho WebRTC).
const ENGINE_ORIGIN =
  process.env.BACKEND_PROCESS_ORIGIN ?? "http://127.0.0.1:8009";
const PYTHON_ORIGIN = process.env.BACKEND_ORIGIN ?? "http://127.0.0.1:8010";

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
      // WebSocket. Trình duyệt luôn nối về chính host đang phục vụ trang
      // (websocket-origin.ts), nên nếu KHÔNG có nginx đứng trước thì /ws và
      // /wsc rơi vào Next và không ai trả lời — yêu cầu Upgrade treo vô hạn ở
      // readyState=CONNECTING, giao diện đứng mãi ở "Đang kết nối". Rewrite của
      // Next có chuyển tiếp cả Upgrade (đã đo), nên khai báo ở đây là chạy được
      // mà không cần custom server.
      //
      // Chỗ có nginx thì nginx bắt /ws trước, mấy dòng này không bao giờ tới
      // lượt — để lại vẫn vô hại.
      //
      // Lưu ý ĐƯỜNG DẪN LỆCH NHAU: engine C++ phục vụ /ws/camera-state, còn
      // frontend gọi /wsc/camera-state để phân biệt với backend Python.
      { source: "/ws/:path*", destination: `${PYTHON_ORIGIN}/ws/:path*` },
      { source: "/wsc/:path*", destination: `${ENGINE_ORIGIN}/ws/:path*` },
    ];
  },
};

export default nextConfig;
