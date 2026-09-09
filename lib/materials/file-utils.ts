import {
  FileText,
  FileType,
  ImageIcon,
  Sheet,
  StickyNote,
} from "lucide-react";

import type { MaterialKind } from "@/lib/types";
import {
  extractTextFromDataUrl,
  materialKindFor,
} from "@/lib/materials/text-extract";
import type { MaterialInput } from "@/lib/store";

export const ACCEPTED_FILES =
  ".pdf,.png,.jpg,.jpeg,.gif,.webp,.svg,.txt,.md,.markdown,.csv,.tsv,.json,application/pdf,image/*,text/*";

export const KIND_META: Record<
  MaterialKind,
  { label: string; icon: typeof FileText; className: string; badge: string }
> = {
  pdf: {
    label: "PDF",
    icon: FileType,
    className: "bg-rose-500/12 text-rose-500",
    badge: "bg-rose-500/15 text-rose-600 dark:text-rose-300",
  },
  image: {
    label: "Image",
    icon: ImageIcon,
    className: "bg-blue-500/12 text-blue-500",
    badge: "bg-blue-500/15 text-blue-600 dark:text-blue-300",
  },
  markdown: {
    label: "Markdown",
    icon: StickyNote,
    className: "bg-violet-500/12 text-violet-500",
    badge: "bg-violet-500/15 text-violet-600 dark:text-violet-300",
  },
  csv: {
    label: "CSV",
    icon: Sheet,
    className: "bg-emerald-500/12 text-emerald-500",
    badge: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
  },
  text: {
    label: "Notes",
    icon: FileText,
    className: "bg-amber-500/12 text-amber-500",
    badge: "bg-amber-500/15 text-amber-600 dark:text-amber-300",
  },
  other: {
    label: "File",
    icon: FileText,
    className: "bg-foreground/8 text-muted",
    badge: "bg-foreground/8 text-muted",
  },
};

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("read failed"));
    reader.readAsDataURL(file);
  });
}

/** Read a File into the shape `addMaterial` expects, doing the real text decode. */
export async function fileToMaterialInput(
  file: File,
  deckId: string | null,
): Promise<MaterialInput> {
  const dataUrl = await readFileAsDataUrl(file);
  const kind = materialKindFor(file.type, file.name);
  const extracted = extractTextFromDataUrl(dataUrl, kind);
  return {
    deckId,
    name: file.name,
    mime: file.type,
    size: file.size,
    dataUrl,
    kind,
    extractedText: extracted?.text ?? null,
    textTruncated: extracted?.truncated ?? false,
  };
}
