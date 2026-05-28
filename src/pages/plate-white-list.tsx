import { PlateWhiteListDashboard } from "@/components/plate-white-list/plate-white-list-dashboard";
import { MainLayout } from "@/components/layouts/main-layout";
import { usePlateWhiteListManager } from "@/hooks/use-plate-white-list-manager";

export default function PlateWhiteList() {
    const manager = usePlateWhiteListManager();

    return (
        <MainLayout>
            <PlateWhiteListDashboard manager={manager} />
        </MainLayout>
    );
}
