import { ParkingLotDashboard, ParkingLotTopActions } from "@/components/parking-lot/parking-lot-dashboard";
import { MainLayout } from "@/components/layouts/main-layout";
import { useParkingLotManager } from "@/hooks/use-parking-lot-manager";

export default function ParkingLot() {
    const manager = useParkingLotManager();

    return (
        <MainLayout title="Quản lý bãi xe" mobileActions={<ParkingLotTopActions manager={manager} />}>
            <ParkingLotDashboard manager={manager} />
        </MainLayout>
    );
}
