import type {
    ParkingLot,
    ParkingLotPage,
    ParkingLotPayload,
} from "@/interface/parking-lot";
import backendClient from "./backend-api";

export const parkingLotApi = {
    list(params: { page: number; size: number; name?: string }) {
        return backendClient.get<ParkingLotPage>("parking-lots", { params });
    },

    detail(id: number) {
        return backendClient.get<ParkingLot>(`parking-lots/${id}`);
    },

    create(data: ParkingLotPayload) {
        return backendClient.post<ParkingLot>("parking-lots", data);
    },

    update(id: number, data: ParkingLotPayload) {
        return backendClient.put<ParkingLot>(`parking-lots/${id}`, data);
    },

    delete(id: number) {
        return backendClient.delete(`parking-lots/${id}`);
    },

    controlBarrier(ioPin: number) {
        return backendClient.post("barrier/open", { io_pin: ioPin });
    },
};

export const BARRIER_OPEN_PIN = 5;
export const BARRIER_CLOSE_PIN = 19;
