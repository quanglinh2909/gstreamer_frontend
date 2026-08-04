import { useState } from "react";
import type { GetServerSideProps, InferGetServerSidePropsType } from "next";
import { EventDashboard, EventTopActions, EventTopStatus } from "@/components/events/event-dashboard";
import { MainLayout } from "@/components/layouts/main-layout";
import { useEventManager } from "@/hooks/use-event-manager";
import { useMotionEventManager } from "@/hooks/use-motion-event-manager";
import type { EventPageTab } from "@/interface/recognition-event";

interface EventsPageProps {
    websocketOrigin: string;
}

export const getServerSideProps: GetServerSideProps<EventsPageProps> = async () => ({
    props: {
        websocketOrigin: process.env.WEBSOCKET_ORIGIN ?? "",
    },
});

export default function Events({
    websocketOrigin,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
    // Tab do TRANG giữ, không phải useEventManager: hook đó chỉ biết bốn loại
    // nhận diện (nó lái map API/WebSocket của backend Python), còn "chuyển
    // động" là một nguồn dữ liệu khác hẳn — xem EventPageTab.
    const [pageTab, setPageTab] = useState<EventPageTab>("face");
    const manager = useEventManager(websocketOrigin);
    const motionManager = useMotionEventManager(pageTab === "motion");

    const handleSelectTab = (tab: EventPageTab) => {
        setPageTab(tab);
        // Tab nhận diện: đổi cả loại đang xem của hook kia (nó lo phân trang,
        // socket, sự kiện mới). Tab chuyển động thì để nguyên — socket nhận
        // diện vẫn chạy nền nên bộ đếm "N sự kiện mới" không mất nhịp.
        if (tab !== "motion") manager.handleSelectTab(tab);
    };

    return (
        <MainLayout
            title="Sự kiện"
            mobileStatus={<EventTopStatus manager={manager} />}
            mobileActions={
                <EventTopActions manager={manager} motionManager={motionManager} pageTab={pageTab} />
            }
        >
            <EventDashboard
                manager={manager}
                motionManager={motionManager}
                pageTab={pageTab}
                onSelectTab={handleSelectTab}
            />
        </MainLayout>
    );
}
