import Link from "next/link";

import { KIND_META } from "@/lib/materials/file-utils";
import type { StudyMaterial } from "@/lib/types";
import { cn } from "@/lib/utils";

/** "Source: 📄 Biology Chapter 4.pdf" — the trust anchor on generated content. */
export function SourceLink({
  material,
  className,
}: {
  material: StudyMaterial | undefined;
  className?: string;
}) {
  if (!material) {
    return (
      <span className={cn("text-xs text-muted-2", className)}>
        Source material removed
      </span>
    );
  }
  const meta = KIND_META[material.kind];
  const Icon = meta.icon;
  return (
    <Link
      href={`/materials/${material.id}`}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-solid px-2.5 py-1 text-xs font-semibold text-muted transition-colors hover:text-foreground",
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      <span className="max-w-[220px] truncate">{material.name}</span>
    </Link>
  );
}
