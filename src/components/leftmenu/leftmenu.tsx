import Link from "next/link";
import { useRouter } from "next/router";
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
    Settings,
    SquareParking,
    SquarePlay,
    Video,
    ListStart,
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
    { label: "AI Config", icon: ScanLine, href: "/ai-config" },
    { label: "Events", icon: History, href: "/events" },
    { label: "Identities", icon: ContactRound, href: "/identities" },
    { label: "Plate Whitelist", icon: ListStart, href: "/plate-white-list" },
    { label: "Parking Lots", icon: SquareParking, href: "/parking-lot" },

];

const footerItems: MenuItem[] = [
    { label: "Settings", icon: Settings },
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

    return (
        <aside className="flex h-svh w-12 shrink-0 flex-col items-center border-r border-slate-200 bg-white">
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
    );
}
