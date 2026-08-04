// CỤM CỔNG: nhiều camera cùng điều khiển MỘT barrier.
//
// Là thực thể riêng chứ không phải cái nhãn gắn lên từng camera, vì cụm có
// THỜI GIAN CHỜ CỦA CHÍNH NÓ. Nếu cụm chỉ là nhãn thì cụm gồm camera chờ 30s
// và camera chờ 20s sẽ không có câu trả lời đúng nào cho "xe vừa qua cụm này
// thì chờ bao lâu" — lấy số nào cũng là đoán, và người dùng không thấy mình
// đang bị lấy số nào.
export interface PlateGateGroup {
    id: number;
    name: string;
    /**
     * Giây chờ giữa 2 lần mở cho cùng một biển, tính CHUNG cả cụm. Con số này
     * THAY THẾ "Chờ giữa 2 lần mở" của từng camera trong cụm — không cộng dồn,
     * không lấy max. 0 = mỗi biển chỉ mở được đúng một lần.
     */
    pre_time: number;
    /** Camera thuộc cụm. Chỉ gồm camera ĐÃ bật whitelist ở tab Cấu hình. */
    camera_ids: string[];
}

export interface PlateGateGroupPayload {
    name: string;
    pre_time: number;
    camera_ids: string[];
}
