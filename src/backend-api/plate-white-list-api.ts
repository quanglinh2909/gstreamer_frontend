import type {
    PlateWhiteListEntry,
    PlateWhiteListPage,
    PlateWhiteListPayload,
} from "@/interface/plate-white-list";
import backendClient from "./backend-api";

export const plateWhiteListApi = {
    list(params: { page: number; size: number; plate_number?: string }) {
        return backendClient.get<PlateWhiteListPage>("plate-white-list", { params });
    },

    detail(id: number) {
        return backendClient.get<PlateWhiteListEntry>(`plate-white-list/${id}`);
    },

    create(data: PlateWhiteListPayload) {
        return backendClient.post<PlateWhiteListEntry>("plate-white-list", data);
    },

    update(id: number, data: PlateWhiteListPayload) {
        return backendClient.put<PlateWhiteListEntry>(`plate-white-list/${id}`, data);
    },

    delete(id: number) {
        return backendClient.delete(`plate-white-list/${id}`);
    },
};
