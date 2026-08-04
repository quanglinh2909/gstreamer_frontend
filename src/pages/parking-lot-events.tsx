import { ParkingLotEventDashboard, ParkingLotEventTopActions } from "@/components/parking-lot-events/parking-lot-event-dashboard";
import { MainLayout } from "@/components/layouts/main-layout";
import { useParkingLotEventManager } from "@/hooks/use-parking-lot-event-manager";

export default function ParkingLotEvents() {
    const manager = useParkingLotEventManager();

    return (
        <MainLayout title="Sự kiện bãi xe" mobileActions={<ParkingLotEventTopActions manager={manager} />}>
            <ParkingLotEventDashboard manager={manager} />
        </MainLayout>
    );
}
