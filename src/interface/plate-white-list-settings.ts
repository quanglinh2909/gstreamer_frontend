// Ngưỡng của nhánh MỞ BARRIER, cấu hình riêng cho từng camera.
//
// Sự tồn tại của một dòng chính là công tắc bật/tắt: camera không có dòng nào
// thì backend bỏ qua hoàn toàn nhánh whitelist/barrier, không chạy bằng giá
// trị mặc định nào cả. Vì vậy màn hình này là danh sách "camera đã bật", xóa
// một dòng nghĩa là tắt hẳn barrier của camera đó.
export interface PlateWhiteListSettings {
    camera_id: string;
    // Giây tối thiểu giữa 2 lần mở cổng cho cùng một biển.
    // 0 = mỗi biển chỉ mở được đúng một lần.
    pre_time: number;
    // Số ký tự tối đa được phép sai so với biển trong whitelist.
    // 0 = khớp tuyệt đối. Càng cao càng dễ mở nhầm cho xe có biển gần giống.
    max_edit_distance: number;
    // Ngưỡng tin cậy của từng ký tự OCR khi đọc biển cho nhánh whitelist.
    // Ký tự yếu hơn bị loại khỏi chuỗi. 0..1.
    ocr_confidence: number;
    // Số ký tự tối thiểu của biển đọc được thì mới đối chiếu whitelist.
    min_plate_length: number;
    // Độ dài xung mở barrier (giây).
    barrier_duration: number;
}

export type PlateWhiteListSettingsPayload = Omit<PlateWhiteListSettings, "camera_id">;
