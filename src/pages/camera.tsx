import type { GetServerSideProps, InferGetServerSidePropsType } from "next";
import { CameraDashboard, CameraTopActions, CameraTopStatus } from "@/components/camera/camera-dashboard";
import { MainLayout } from "@/components/layouts/main-layout";
import { useCameraManager } from "@/hooks/use-camera-manager";

interface CameraPageProps {
    websocketOrigin: string;
}

export const getServerSideProps: GetServerSideProps<CameraPageProps> = async () => ({
    props: {
        websocketOrigin: process.env.WEBSOCKET_ORIGIN_C ?? "",
    },
});

export default function Camera({
    websocketOrigin,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
    const manager = useCameraManager(websocketOrigin);

    return (
        <MainLayout
            title="Cameras"
            mobileStatus={<CameraTopStatus manager={manager} />}
            mobileActions={<CameraTopActions manager={manager} />}
        >
            <CameraDashboard manager={manager} />
        </MainLayout>
    );
}
