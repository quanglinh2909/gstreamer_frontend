import type { Identity, IdentityPage } from "@/interface/identity";
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
};
