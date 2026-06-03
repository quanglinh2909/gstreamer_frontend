import type {
    Identity,
    IdentityPage,
    IdentityPlate,
    IdentityPlatePayload,
} from "@/interface/identity";
import backendClient from "./backend-api";

export const identityApi = {
    list(params: { page: number; size: number; name?: string }) {
        return backendClient.get<IdentityPage>("identities", { params });
    },

    detail(id: number) {
        return backendClient.get<Identity>(`identities/${id}`);
    },

    create(data: FormData) {
        return backendClient.post<Identity>("identities", data);
    },

    update(id: number, data: FormData) {
        return backendClient.put<Identity>(`identities/${id}`, data);
    },

    delete(id: number) {
        return backendClient.delete(`identities/${id}`);
    },

    listPlates(identityId: number) {
        return backendClient.get<IdentityPlate[]>(`identities/${identityId}/plates`);
    },

    createPlate(identityId: number, data: IdentityPlatePayload) {
        return backendClient.post<IdentityPlate>(`identities/${identityId}/plates`, data);
    },

    updatePlate(plateId: number, data: IdentityPlatePayload) {
        return backendClient.put<IdentityPlate>(`identities/plates/${plateId}`, data);
    },

    deletePlate(plateId: number) {
        return backendClient.delete(`identities/plates/${plateId}`);
    },
};
