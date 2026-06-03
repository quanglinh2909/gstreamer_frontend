export interface ParkingLotEvent {
    id: number;
    parking_lot_id: number;
    parking_lot_name: string;
    identity_id: number;
    name: string;
    plate_number: string;
    face_camera_id: string;
    plate_camera_id: string;
    timestamp: number;
}

export interface ParkingLotEventPage {
    items: ParkingLotEvent[];
    total: number;
    page: number;
    size: number;
    pages: number;
}
