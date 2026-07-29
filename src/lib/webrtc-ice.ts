// Cấu hình ICE dùng CHUNG cho mọi player WebRTC (live + xem lại). Trước đây
// mỗi file chép một bản, sửa một chỗ quên chỗ kia.
//
// Vì sao cần STUN: không có nó, trình duyệt chỉ chào ra địa chỉ LAN của chính
// mình (còn bị giấu sau tên mDNS ".local"), nên xem qua Internet là chết ICE.
// STUN cho candidate srflx = địa chỉ công cộng để hai bên đục lỗ NAT. Trong
// LAN thì candidate host vẫn được thử trước nên không chậm đi.
//
// Vì sao cần TURN: mạng chặn UDP hoặc NAT hai đầu là symmetric thì không đục
// lỗ được, media phải đi VÒNG qua TURN. ICE chỉ chọn relay khi mọi cặp trực
// tiếp đều hỏng, nên đặt sẵn không làm chậm đường LAN.
//
// GIỚI HẠN ĐÃ BIẾT (vì sao mạng "lạ" xem không được): TURN hiện chỉ mở cổng
// 3478 (UDP+TCP). Nhiều mạng doanh nghiệp/nước ngoài chặn sạch cổng 3478 kể cả
// TCP; lúc đó trình duyệt KHÔNG lấy được candidate relay nào, mà NAT bên đó
// thường là symmetric nên srflx cũng vô dụng -> ICE fail, màn đen. Cách chữa
// triệt để nằm ở PHÍA SERVER: chạy coturn nghe TLS trên cổng 443
// (turns:...:443?transport=tcp) — 443 gần như không mạng nào chặn và trông
// như HTTPS. Khi server có 443/TLS thì thêm một mục `turns:` vào đây.
//
// Mật khẩu nằm trong bundle client là đương nhiên — trình duyệt bắt buộc phải
// có để xin relay; muốn kín thì TURN phải phát credential tạm (REST của coturn).
const TURN_HOST = "103.226.251.58:3478";
const TURN_USER = "vms";
const TURN_CRED = "123456";

export const ICE_SERVERS: RTCIceServer[] = [
    { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
    // Tách UDP và TCP thành HAI mục riêng thay vì gộp một mảng urls: khi mạng
    // chặn UDP, ta muốn chắc chắn trình duyệt vẫn thử cấp relay qua TCP một
    // cách độc lập, không phụ thuộc cách từng trình duyệt xử lý mảng gộp.
    { urls: `turn:${TURN_HOST}?transport=udp`, username: TURN_USER, credential: TURN_CRED },
    { urls: `turn:${TURN_HOST}?transport=tcp`, username: TURN_USER, credential: TURN_CRED },
];
