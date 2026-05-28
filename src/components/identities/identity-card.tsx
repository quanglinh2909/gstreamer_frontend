import { UserRound } from "lucide-react";
import type { Identity } from "@/interface/identity";
import { IdentityImage } from "./identity-image";

export function IdentityCard({
    identity,
    onOpen,
}: {
    identity: Identity;
    onOpen: (identity: Identity) => void;
}) {
    return (
        <button
            type="button"
            onClick={() => onOpen(identity)}
            className="group overflow-hidden rounded-xl border border-slate-200 bg-white text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4369ee]"
        >
            <div className="relative aspect-[5/6] overflow-hidden bg-slate-100">
                <IdentityImage
                    key={identity.image_crop}
                    path={identity.image_crop}
                    alt={identity.name}
                    sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 25vw"
                />
            </div>
            <div className="space-y-3 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#4369ee]">
                    Identity
                </p>
                <h2 className="truncate text-lg font-semibold text-slate-950">
                    {identity.name || "Không xác định"}
                </h2>
                <div className="flex items-center gap-2 border-t border-slate-100 pt-3 text-sm text-slate-500">
                    <UserRound size={15} aria-hidden="true" />
                    ID #{identity.id}
                </div>
            </div>
        </button>
    );
}
