import { AiConfigDashboard } from "@/components/ai-config/ai-config-dashboard";
import { MainLayout } from "@/components/layouts/main-layout";
import { useAiConfigManager } from "@/hooks/use-ai-config-manager";

export default function AiConfig() {
    const manager = useAiConfigManager();

    return (
        <MainLayout>
            <AiConfigDashboard manager={manager} />
        </MainLayout>
    );
}
