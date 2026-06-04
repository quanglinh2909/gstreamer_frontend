import type { MetricSampleBase } from "@/interface/system-metrics";

export function cn(...classes: Array<string | false | undefined>) {
    return classes.filter(Boolean).join(" ");
}

export function formatBytes(bytes: number | undefined): string {
    if (!bytes || !Number.isFinite(bytes)) {
        return "0 B";
    }

    const units = ["B", "KB", "MB", "GB", "TB"];
    let value = bytes;
    let unit = 0;

    while (value >= 1024 && unit < units.length - 1) {
        value /= 1024;
        unit += 1;
    }

    return `${value.toFixed(value >= 100 || unit === 0 ? 0 : 1)} ${units[unit]}`;
}

export function formatPercent(value: number | undefined, digits = 1): string {
    if (value === undefined || !Number.isFinite(value)) {
        return "—";
    }

    return `${value.toFixed(digits)}%`;
}

export function formatTemp(value: number | undefined): string {
    if (value === undefined || !Number.isFinite(value)) {
        return "—";
    }

    return `${value.toFixed(1)}°C`;
}

// Epoch seconds -> "HH:mm:ss" for chart axis ticks.
export function formatClock(ts: number): string {
    return new Date(ts * 1000).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    });
}

// Epoch seconds -> full local date-time, for the "last updated"/tooltip line.
export function formatDateTime(ts: number): string {
    return new Date(ts * 1000).toLocaleString();
}

// History arrays arrive newest-first; charts need oldest-first along the X axis.
// A series may be missing from the payload entirely, so tolerate non-arrays.
export function sortByTsAsc<T extends MetricSampleBase>(samples: T[] | undefined | null): T[] {
    if (!Array.isArray(samples)) {
        return [];
    }

    return [...samples].sort((a, b) => a.ts - b.ts);
}

// Merge two same-length, same-cadence accelerator series by ts.
export function mergeByTs<A extends MetricSampleBase, B extends MetricSampleBase>(
    a: A[] | undefined | null,
    b: B[] | undefined | null,
    pick: (a: A | undefined, b: B | undefined, ts: number) => Record<string, number>,
): Array<{ ts: number } & Record<string, number>> {
    const byTs = new Map<number, { a?: A; b?: B }>();

    for (const sample of Array.isArray(a) ? a : []) {
        byTs.set(sample.ts, { ...byTs.get(sample.ts), a: sample });
    }
    for (const sample of Array.isArray(b) ? b : []) {
        byTs.set(sample.ts, { ...byTs.get(sample.ts), b: sample });
    }

    return [...byTs.keys()]
        .sort((x, y) => x - y)
        .map((ts) => {
            const entry = byTs.get(ts)!;
            return { ts, ...pick(entry.a, entry.b, ts) };
        });
}
