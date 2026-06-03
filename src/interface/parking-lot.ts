export interface ParkingLot {
    id: number;
    name: string;
    face_camera_id: string;
    plate_camera_id: string;
}

export interface ParkingLotPayload {
    name: string;
    face_camera_id: string;
    plate_camera_id: string;
}

export interface ParkingLotPage {
    items: ParkingLot[];
    total: number;
    page: number;
    size: number;
    pages: number;
}
