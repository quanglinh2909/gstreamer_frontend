import type { ParkingLotEventPage } from "@/interface/parking-lot-event";
import backendClient from "./backend-api";

export const parkingLotEventApi = {
    list(params: {
        page: number;
        size: number;
        name?: string;
        identity_id?: number;
        plate_number?: string;
    }) {
        return backendClient.get<ParkingLotEventPage>("parking-lot-events", { params });
    },
};
