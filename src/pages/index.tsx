import type { GetServerSideProps, InferGetServerSidePropsType } from "next";
import { Dashboard, DashboardTopActions, DashboardTopStatus } from "@/components/dashboard/dashboard";
import { MainLayout } from "@/components/layouts/main-layout";
import { useDashboardManager } from "@/hooks/use-dashboard-manager";

interface DashboardPageProps {
    websocketOrigin: string;
}

export const getServerSideProps: GetServerSideProps<DashboardPageProps> = async () => ({
    props: {
        websocketOrigin: process.env.WEBSOCKET_ORIGIN ?? "",
    },
});

export default function Home({
    websocketOrigin,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
    const manager = useDashboardManager(websocketOrigin);

    return (
        <MainLayout
            title="Tổng quan hệ thống"
            mobileStatus={<DashboardTopStatus manager={manager} />}
            mobileActions={<DashboardTopActions manager={manager} />}
        >
            <Dashboard manager={manager} />
        </MainLayout>
    );
}
