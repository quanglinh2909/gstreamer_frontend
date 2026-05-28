import { useState } from "react";
import Image from "next/image";
import { ImageOff } from "lucide-react";
import { getIdentityImageUrl } from "@/lib/identity-view-model";

export function IdentityImage({
    path,
    alt,
    sizes,
    mode = "cover",
}: {
    path: string;
    alt: string;
    sizes: string;
    mode?: "cover" | "contain";
}) {
    const [hasError, setHasError] = useState(false);
    const imageUrl = getIdentityImageUrl(path);

    if (!imageUrl || hasError) {
        return (
            <div className="flex h-full flex-col items-center justify-center gap-2 bg-slate-100 text-slate-400">
                <ImageOff size={30} aria-hidden="true" />
                <span className="text-xs font-medium">Không có ảnh</span>
            </div>
        );
    }

    return (
        <Image
            src={imageUrl}
            alt={alt}
            fill
            unoptimized
            sizes={sizes}
            onError={() => setHasError(true)}
            className={
                mode === "contain"
                    ? "object-contain"
                    : "object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            }
        />
    );
}
