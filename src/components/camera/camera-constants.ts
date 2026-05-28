import {
    AlertTriangle,
    CheckCircle2,
    CircleDot,
    WifiOff,
    type LucideIcon,
} from "lucide-react";
import type { CameraHealth, FeatureFilter, StatusFilter } from "./types";
import type { RecordingMode } from "@/interface/camera";

export const statusFilters: Array<{ label: string; value: StatusFilter }> = [
    { label: "All", value: "all" },
    { label: "Online", value: "online" },
    { label: "Offline", value: "offline" },
    { label: "Error", value: "error" },
];

export const featureFilters: Array<{ label: string; value: FeatureFilter }> = [
    { label: "All", value: "all" },
    { label: "Recording", value: "recording" },
    { label: "Motion", value: "motion" },
];

export const recordingModes: Array<{ label: string; value: RecordingMode }> = [
    { label: "Off", value: "off" },
    { label: "Always", value: "always" },
    { label: "Motion", value: "motion" },
];

export const healthStyles: Record<
    CameraHealth,
    {
        label: string;
        badge: string;
        dot: string;
        icon: LucideIcon;
        preview: string;
    }
> = {
    online: {
        label: "Online",
        badge: "border-emerald-200 bg-emerald-50 text-emerald-700",
        dot: "bg-emerald-500",
        icon: CheckCircle2,
        preview: "from-emerald-500/20 via-slate-950 to-cyan-500/10",
    },
    offline: {
        label: "Offline",
        badge: "border-slate-200 bg-slate-100 text-slate-600",
        dot: "bg-slate-400",
        icon: WifiOff,
        preview: "from-slate-600/20 via-slate-950 to-slate-900",
    },
    error: {
        label: "Error",
        badge: "border-rose-200 bg-rose-50 text-rose-700",
        dot: "bg-rose-500",
        icon: AlertTriangle,
        preview: "from-rose-500/20 via-slate-950 to-amber-500/10",
    },
    unknown: {
        label: "Unknown",
        badge: "border-amber-200 bg-amber-50 text-amber-700",
        dot: "bg-amber-500",
        icon: CircleDot,
        preview: "from-amber-500/20 via-slate-950 to-slate-800",
    },
};
