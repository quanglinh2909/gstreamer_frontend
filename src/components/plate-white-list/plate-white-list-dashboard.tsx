import { useState } from "react";
import { ListChecks, SlidersHorizontal } from "lucide-react";
import { PlateWhiteListEntriesTab } from "./plate-white-list-entries-tab";
import { PlateWhiteListSettingsTab } from "./plate-white-list-settings-tab";
import { cn } from "./plate-white-list-utils";

type PlateWhiteListTabId = "entries" | "settings";

const TABS = [
    {
        id: "entries",
        label: "Danh sách biển số trắng",
        description: "Biển số nào được phép mở barrier.",
        icon: ListChecks,
    },
    {
        id: "settings",
        label: "Cấu hình",
        description: "Ngưỡng mở barrier theo từng camera.",
        icon: SlidersHorizontal,
    },
] as const satisfies ReadonlyArray<{
    id: PlateWhiteListTabId;
    label: string;
    description: string;
    icon: typeof ListChecks;
}>;

export function PlateWhiteListDashboard() {
    const [activeTab, setActiveTab] = useState<PlateWhiteListTabId>("entries");
    const activeDescription = TABS.find((tab) => tab.id === activeTab)?.description ?? "";

    return (
        <main className="h-full overflow-y-auto bg-slate-50">
            <div className="mx-auto flex min-h-full max-w-[1400px] flex-col gap-5 px-6 py-5">
                <header>
                    <h1 className="mt-1 text-2xl font-semibold text-slate-950">
                        Danh sách biển số trắng
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">{activeDescription}</p>
                </header>

                <div
                    role="tablist"
                    aria-label="Danh sách biển số trắng"
                    className="flex gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm"
                >
                    {TABS.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = tab.id === activeTab;

                        return (
                            <button
                                key={tab.id}
                                type="button"
                                role="tab"
                                aria-selected={isActive}
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    "inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors sm:flex-none",
                                    isActive
                                        ? "bg-[#4369ee] text-white shadow-sm"
                                        : "text-slate-600 hover:bg-slate-100",
                                )}
                            >
                                <Icon size={16} aria-hidden="true" />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* Mỗi tab tự gọi hook dữ liệu của nó, nên tab đang ẩn không
                    gọi API. Đổi tab là unmount tab cũ và tải lại tab mới —
                    dữ liệu luôn mới, đúng ý ở đây vì hai tab ảnh hưởng lẫn
                    nhau (tắt cấu hình làm cả danh sách biển vô hiệu). */}
                {activeTab === "entries" ? <PlateWhiteListEntriesTab /> : <PlateWhiteListSettingsTab />}
            </div>
        </main>
    );
}
