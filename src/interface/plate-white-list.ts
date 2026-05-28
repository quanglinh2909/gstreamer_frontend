export interface PlateWhiteListEntry {
    id: number;
    plate_number: string;
    name: string;
}

export interface PlateWhiteListPayload {
    plate_number: string;
    name: string;
}

export interface PlateWhiteListPage {
    items: PlateWhiteListEntry[];
    total: number;
    page: number;
    size: number;
    pages: number;
}
