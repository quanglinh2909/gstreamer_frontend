import { IdentityDashboard } from "@/components/identities/identity-dashboard";
import { MainLayout } from "@/components/layouts/main-layout";
import { useIdentityManager } from "@/hooks/use-identity-manager";

export default function Identities() {
    const manager = useIdentityManager();

    return (
        <MainLayout>
            <IdentityDashboard manager={manager} />
        </MainLayout>
    );
}
