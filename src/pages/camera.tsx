import { CameraDashboard } from "@/components/camera/camera-dashboard";
import { MainLayout } from "@/components/layouts/main-layout";
import { useCameraManager } from "@/hooks/use-camera-manager";

export default function Camera() {
    const manager = useCameraManager();

    return (
        <MainLayout>
            <CameraDashboard manager={manager} />
        </MainLayout>
    );
}
