export interface Identity {
    id: number;
    name: string;
    mac_bluetooth: string;
    image_full: string;
    image_crop: string;
}

export interface IdentityPage {
    items: Identity[];
    total: number;
    page: number;
    size: number;
    pages: number;
}

export interface IdentityPlate {
    id: number;
    identity_id: number;
    plate_number: string;
}

export interface IdentityPlatePayload {
    plate_number: string;
}
