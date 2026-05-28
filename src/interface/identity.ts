export interface Identity {
    id: number;
    name: string;
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
