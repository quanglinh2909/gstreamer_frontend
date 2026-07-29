import { MainLayout } from "@/components/layouts/main-layout";
import { StorageSettings } from "@/components/settings/storage-settings";

export default function SettingsPage() {
    return (
        <MainLayout>
            <StorageSettings />
        </MainLayout>
    );
}
