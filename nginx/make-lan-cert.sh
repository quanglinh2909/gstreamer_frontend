#!/usr/bin/env bash
# Sinh chứng chỉ tự ký cho cổng HTTPS dùng TRONG MẠNG LAN.
#
# VÌ SAO PHẢI CÓ: trình duyệt chỉ cho dùng WebTransport (thứ MoQ chạy trên đó)
# ở "secure context" — tức https:// hoặc localhost. Mở giao diện bằng
# http://<ip-lan>:3000 thì API đó KHÔNG tồn tại, và không có cách nào lách từ
# phía JS. Đây là chứng chỉ của TRANG WEB, khác hẳn chứng chỉ của máy chủ MoQ
# (cái kia tự xoay vòng 13 ngày, xem app/moq/cert.py) — chứng chỉ này chỉ cần
# đủ để trang được coi là tin cậy, nên để hạn dài.
#
# Chạy lại khi đổi IP của máy. Cần cài lại vào máy người xem nếu muốn hết cảnh
# báo (xem hướng dẫn cuối file).

set -euo pipefail
cd "$(dirname "$0")"
mkdir -p certs

# Mọi địa chỉ máy này có thể được gọi tới. Chứng chỉ KHÔNG khớp địa chỉ đang gõ
# thì Chrome báo lỗi khác (NET::ERR_CERT_COMMON_NAME_INVALID) và một số máy
# không cho bấm bỏ qua.
IPS=$(hostname -I | tr ' ' '\n' | grep -E '^[0-9]+\.' | grep -v '^172\.1[6-9]\.' \
      | grep -v '^172\.2[0-9]\.' | grep -v '^172\.3[01]\.' || true)
ALT="DNS:localhost,IP:127.0.0.1"
for ip in $IPS; do ALT="$ALT,IP:$ip"; done
echo "Chứng chỉ sẽ hợp lệ cho: $ALT"

openssl req -x509 -newkey rsa:2048 -nodes \
    -keyout certs/lan.key -out certs/lan.crt \
    -days 3650 -subj "/CN=vms-lan" \
    -addext "subjectAltName=$ALT" \
    -addext "basicConstraints=critical,CA:FALSE" 2>/dev/null

chmod 600 certs/lan.key
echo "Đã tạo nginx/certs/lan.crt và lan.key (hạn 10 năm)."
echo
echo "Bước tiếp: docker compose up -d --force-recreate nginx"
echo "Rồi mở https://<ip-lan>:8443/  — lần đầu Chrome báo 'Not secure',"
echo "bấm Advanced -> Proceed. Sau đó MoQ dùng được."
echo
echo "Muốn hết hẳn cảnh báo: cài nginx/certs/lan.crt vào Trusted Root của máy xem."
