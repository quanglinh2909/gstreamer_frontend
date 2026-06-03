import { ParkingLotDashboard } from "@/components/parking-lot/parking-lot-dashboard";
import { MainLayout } from "@/components/layouts/main-layout";
import { useParkingLotManager } from "@/hooks/use-parking-lot-manager";

export default function ParkingLot() {
    const manager = useParkingLotManager();

    return (
        <MainLayout>
            <ParkingLotDashboard manager={manager} />
        </MainLayout>
    );
}
