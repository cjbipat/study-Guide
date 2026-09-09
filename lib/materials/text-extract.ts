import type { MaterialKind } from "@/lib/types";

/** Hard cap on how much text we keep from a file. */
export const MAX_EXTRACTED_CHARS = 24_000;

export function materialKindFor(mime: string, name: string): MaterialKind {
  const lower = name.toLowerCase();
  if (mime === "application/pdf" || lower.endsWith(".pdf")) return "pdf";
  if (mime.startsWith("image/")) return "image";
  if (mime === "text/csv" || lower.endsWith(".csv") || lower.endsWith(".tsv"))
    return "csv";
  if (
    mime === "text/markdown" ||
    lower.endsWith(".md") ||
    lower.endsWith(".markdown")
  )
    return "markdown";
  if (mime.startsWith("text/") || lower.endsWith(".txt") || lower.endsWith(".json"))
    return "text";
  return "other";
}

/** Kinds whose text we can genuinely read in the browser today. */
export function isExtractable(kind: MaterialKind): boolean {
  return kind === "text" || kind === "markdown" || kind === "csv";
}

/** Decode a base64/percent-encoded data URL back into a UTF-8 string. */
export function decodeDataUrlText(dataUrl: string): string {
  try {
    const comma = dataUrl.indexOf(",");
    if (comma === -1) return "";
    const meta = dataUrl.slice(5, comma);
    const body = dataUrl.slice(comma + 1);
    if (meta.includes(";base64")) {
      const binary = atob(body);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      return new TextDecoder("utf-8").decode(bytes);
    }
    return decodeURIComponent(body);
  } catch {
    return "";
  }
}

export interface ExtractedText {
  text: string;
  truncated: boolean;
}

/**
 * Pull readable text out of a freshly uploaded file. Real work — no analysis,
 * no summarising, just a decode (and for images/PDFs, nothing yet).
 */
export function extractTextFromDataUrl(
  dataUrl: string,
  kind: MaterialKind,
): ExtractedText | null {
  if (!isExtractable(kind)) return null;
  const raw = decodeDataUrlText(dataUrl).replace(/\r\n/g, "\n").trim();
  if (!raw) return null;
  if (raw.length > MAX_EXTRACTED_CHARS) {
    return { text: raw.slice(0, MAX_EXTRACTED_CHARS), truncated: true };
  }
  return { text: raw, truncated: false };
}
