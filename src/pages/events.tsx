import type { GetServerSideProps, InferGetServerSidePropsType } from "next";
import { EventDashboard } from "@/components/events/event-dashboard";
import { MainLayout } from "@/components/layouts/main-layout";
import { useEventManager } from "@/hooks/use-event-manager";

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
    const manager = useEventManager(websocketOrigin);

    return (
        <MainLayout>
            <EventDashboard manager={manager} />
        </MainLayout>
    );
}
