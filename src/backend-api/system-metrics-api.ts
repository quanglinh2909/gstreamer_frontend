import type {
    AiEnabledCount,
    SystemMetricsQuery,
    SystemMetricsResponse,
} from "@/interface/system-metrics";
import backendClient from "./backend-api";

const DEFAULT_LIMIT = 500;

export const systemMetricsApi = {
    // axios drops params whose value is `undefined`, so omitting from_ts/to_ts
    // sends just `limit` — matching the "no range on entry" default.
    metrics(query: SystemMetricsQuery = {}) {
        return backendClient.get<SystemMetricsResponse>("system-metrics", {
            params: { limit: DEFAULT_LIMIT, ...query },
        });
    },
    aiEnabledCount() {
        return backendClient.get<AiEnabledCount>("ai/enabled-count");
    },
};
