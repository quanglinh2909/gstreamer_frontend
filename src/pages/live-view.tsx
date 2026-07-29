import type { GetServerSideProps, InferGetServerSidePropsType } from "next";
import { LiveWall } from "@/components/live-view/live-wall";
import { MainLayout } from "@/components/layouts/main-layout";
import { useCameraManager } from "@/hooks/use-camera-manager";

interface LiveViewPageProps {
    websocketOrigin: string;
    eventWsOrigin: string;
}

export const getServerSideProps: GetServerSideProps<LiveViewPageProps> = async () => ({
    props: {
        // Trạng thái camera (online/offline) từ ENGINE C++.
        websocketOrigin: process.env.WEBSOCKET_ORIGIN_C ?? "",
        // Sự kiện nhận diện (khuôn mặt/biển số/vùng cấm) từ backend PYTHON.
        eventWsOrigin: process.env.WEBSOCKET_ORIGIN ?? "",
    },
});

export default function LiveView({
    websocketOrigin,
    eventWsOrigin,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
    // Dùng chung hook với trang quản lý camera: websocket đẩy trạng thái
    // online/offline theo thời gian thực nên chấm trạng thái trong danh sách
    // bên trái luôn đúng mà không phải tự hỏi lại server.
    const manager = useCameraManager(websocketOrigin);

    return (
        <MainLayout>
            <LiveWall manager={manager} eventWsOrigin={eventWsOrigin} />
        </MainLayout>
    );
}
