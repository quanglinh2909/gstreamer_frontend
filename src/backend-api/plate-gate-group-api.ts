import type { PlateGateGroup, PlateGateGroupPayload } from "@/interface/plate-gate-group";
import backendClient from "./backend-api";

export const plateGateGroupApi = {
    list() {
        return backendClient.get<PlateGateGroup[]>("plate-gate-groups");
    },
    create(data: PlateGateGroupPayload) {
        return backendClient.post<PlateGateGroup>("plate-gate-groups", data);
    },
    update(id: number, data: PlateGateGroupPayload) {
        return backendClient.put<PlateGateGroup>(`plate-gate-groups/${id}`, data);
    },
    // Xoá cụm KHÔNG tắt barrier của camera nào — chúng quay về dùng
    // "Chờ giữa 2 lần mở" của riêng mình.
    delete(id: number) {
        return backendClient.delete(`plate-gate-groups/${id}`);
    },
};
