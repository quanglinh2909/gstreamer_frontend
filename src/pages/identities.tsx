import { IdentityDashboard, IdentityTopActions } from "@/components/identities/identity-dashboard";
import { MainLayout } from "@/components/layouts/main-layout";
import { useIdentityManager } from "@/hooks/use-identity-manager";

export default function Identities() {
    const manager = useIdentityManager();

    return (
        <MainLayout title="Quản lý identity" mobileActions={<IdentityTopActions manager={manager} />}>
            <IdentityDashboard manager={manager} />
        </MainLayout>
    );
}
