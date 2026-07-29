import type { GetServerSideProps, InferGetServerSidePropsType } from "next";
import { MainLayout } from "@/components/layouts/main-layout";
import { RecordingsView } from "@/components/recordings/recordings-view";
import { useCameraManager } from "@/hooks/use-camera-manager";

interface RecordingsPageProps {
    websocketOrigin: string;
    eventWsOrigin: string;
}

export const getServerSideProps: GetServerSideProps<RecordingsPageProps> = async () => ({
    props: {
        // Engine C++ (cổng 8009): trạng thái camera online/offline.
        websocketOrigin: process.env.WEBSOCKET_ORIGIN_C ?? "",
        // Backend Python (cổng 8010): sự kiện nhận diện realtime cho bảng bên phải.
        eventWsOrigin: process.env.WEBSOCKET_ORIGIN ?? "",
    },
});

export default function Recordings({
    websocketOrigin,
    eventWsOrigin,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
    // Dùng chung hook với trang camera/live-view: có sẵn danh sách camera kèm
    // trạng thái online/offline đẩy realtime qua websocket.
    const manager = useCameraManager(websocketOrigin);

    return (
        <MainLayout>
            <RecordingsView cameras={manager.filteredCameras} eventWsOrigin={eventWsOrigin} />
        </MainLayout>
    );
}
