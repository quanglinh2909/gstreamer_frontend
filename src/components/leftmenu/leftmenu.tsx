import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/router";
import { useAppMenuStore } from "@/stores/use-app-menu-store";
import {
    Activity,
    CircleUserRound,
    ContactRound,
    Gauge,
    History,
    House,
    LayoutGrid,
    Plus,
    ScanLine,
    Search,
    FlaskConical,
    ParkingMeter,
    Settings,
    SquareParking,
    SquarePlay,
    Video,
    ListStart,
    Clapperboard,
    type LucideIcon,
} from "lucide-react";

type MenuItem = {
    label: string;
    icon: LucideIcon;
    href?: string;
};

const mainItems: MenuItem[] = [
    { label: "Dashboard", icon: House, href: "/" },
    { label: "All Cameras", icon: Video, href: "/camera" },
    { label: "Live View", icon: SquarePlay, href: "/live-view" },
    { label: "Xem lại", icon: Clapperboard, href: "/recordings" },
    { label: "AI Config", icon: ScanLine, href: "/ai-config" },
    { label: "Thử model", icon: FlaskConical, href: "/model-test" },
    { label: "Events", icon: History, href: "/events" },
    { label: "Identities", icon: ContactRound, href: "/identities" },
    { label: "Plate Whitelist", icon: ListStart, href: "/plate-white-list" },
    { label: "Parking Lots", icon: SquareParking, href: "/parking-lot" },
    { label: "Parking Events", icon: ParkingMeter, href: "/parking-lot-events" },

];

const footerItems: MenuItem[] = [
    { label: "Settings", icon: Settings, href: "/settings" },
    { label: "Account", icon: CircleUserRound },
];

function cn(...classes: Array<string | false | undefined>) {
    return classes.filter(Boolean).join(" ");
}

function isActive(pathname: string, href?: string) {
    if (!href) {
        return false;
    }

    return pathname === href;
}

function MenuButton({ item, active }: { item: MenuItem; active: boolean }) {
    const Icon = item.icon;
    const className = cn(
        "group relative flex h-8 w-8 items-center justify-center rounded-lg transition-colors duration-150 outline-none",
        active
            ? "bg-[#4369ee] text-white shadow-sm"
            : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900 focus-visible:bg-slate-200 focus-visible:text-slate-900",
    );
    const content = (
        <>
            <Icon size={18} strokeWidth={active ? 2.5 : 2.25} aria-hidden="true" />
            <span className="pointer-events-none absolute left-10 top-1/2 z-20 -translate-y-1/2 whitespace-nowrap rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 opacity-0 shadow-md transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100">
                {item.label}
            </span>
        </>
    );

    if (item.href) {
        return (
            <Link
                href={item.href}
                aria-label={item.label}
                aria-current={active ? "page" : undefined}
                className={className}
            >
                {content}
            </Link>
        );
    }

    return (
        <button type="button" aria-label={item.label} className={className}>
            {content}
        </button>
    );
}

export default function Leftmenu() {
    const router = useRouter();
    const open = useAppMenuStore((state) => state.open);
    const setOpen = useAppMenuStore((state) => state.setOpen);

    // Đóng menu mỗi khi chuyển trang: trên mobile nó là lớp phủ, để nguyên thì
    // trang mới mở ra đã bị che sẵn.
    useEffect(() => {
        const done = () => setOpen(false);
        router.events.on("routeChangeComplete", done);
        return () => router.events.off("routeChangeComplete", done);
    }, [router.events, setOpen]);

    return (
        <>
            {/* Nền mờ — chỉ tồn tại trên mobile, bấm để đóng. */}
            <div
                onClick={() => setOpen(false)}
                aria-hidden="true"
                className={cn(
                    "fixed inset-0 z-40 bg-slate-950/50 transition-opacity duration-200 md:hidden",
                    open ? "opacity-100" : "pointer-events-none opacity-0",
                )}
            />
            {/* Dưới md thanh này KHÔNG chiếm chỗ trong dòng chảy nữa mà trượt
                từ mép trái vào — trả lại trọn 48px bề ngang cho nội dung. Trên
                màn 390px thì 48px là 12% màn hình, đủ để một ô video 16:9 cao
                thêm 27px. z cao hơn ngăn kéo của trang (z-40) để menu ứng dụng
                luôn nằm trên cùng. */}
            <aside
                className={cn(
                    "fixed inset-y-0 left-0 z-50 flex h-svh w-12 flex-col items-center border-r border-slate-200 bg-white transition-transform duration-200 ease-out",
                    "md:static md:z-auto md:shrink-0 md:translate-x-0 md:transition-none",
                    open ? "translate-x-0" : "-translate-x-full",
                )}
            >
            <div className="flex h-14 w-full items-center justify-center text-slate-950">
                <Activity size={24} strokeWidth={2.5} aria-label="App logo" />
            </div>

            <nav aria-label="Main menu" className="flex flex-1 flex-col items-center gap-4">
                <div className="flex flex-col items-center gap-3">
                    {mainItems.map((item) => (
                        <MenuButton
                            key={item.label}
                            item={item}
                            active={isActive(router.pathname, item.href)}
                        />
                    ))}
                </div>

                <div className="mb-7 mt-auto flex flex-col items-center gap-3">
                    {footerItems.map((item) => (
                        <MenuButton key={item.label} item={item} active={false} />
                    ))}
                </div>
            </nav>
            </aside>
        </>
    );
}
