"use client";

import { FileQuestion } from "lucide-react";

import { MarkdownLite } from "@/components/learn/MarkdownLite";
import { decodeDataUrlText } from "@/lib/materials/text-extract";
import type { StudyMaterial } from "@/lib/types";
import { cn } from "@/lib/utils";

export function MaterialPreview({
  material,
  className,
}: {
  material: StudyMaterial;
  className?: string;
}) {
  const body = () => {
    if (material.kind === "image") {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={material.dataUrl}
          alt={material.name}
          className="mx-auto max-h-[70vh] w-auto rounded-xl"
        />
      );
    }
    if (material.kind === "pdf") {
      return (
        <iframe
          title={material.name}
          src={material.dataUrl}
          className="h-[70vh] w-full rounded-xl bg-white"
        />
      );
    }
    if (material.kind === "csv") {
      return <CsvTable text={material.extractedText ?? decodeDataUrlText(material.dataUrl)} />;
    }
    if (material.kind === "markdown") {
      return (
        <div className="p-5">
          <MarkdownLite text={material.extractedText ?? decodeDataUrlText(material.dataUrl)} />
        </div>
      );
    }
    if (material.kind === "text") {
      return (
        <pre className="whitespace-pre-wrap p-5 text-sm leading-relaxed text-foreground/90">
          {material.extractedText ?? decodeDataUrlText(material.dataUrl)}
        </pre>
      );
    }
    return (
      <div className="flex flex-col items-center gap-2 p-10 text-center text-sm text-muted">
        <FileQuestion className="h-8 w-8" />
        No inline preview for this file type. Download it to view.
      </div>
    );
  };

  return (
    <div
      className={cn(
        "max-h-[74vh] overflow-auto rounded-2xl border border-border bg-surface-2",
        className,
      )}
    >
      {body()}
    </div>
  );
}

function CsvTable({ text }: { text: string }) {
  const rows = text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .filter((l) => l.trim())
    .slice(0, 200)
    .map((l) => {
      const delim = l.includes("\t") ? "\t" : l.includes(";") ? ";" : ",";
      return l.split(delim).map((c) => c.trim().replace(/^"|"$/g, ""));
    });
  if (!rows.length) {
    return <div className="p-6 text-sm text-muted">Empty file.</div>;
  }
  const [head, ...rest] = rows;
  return (
    <div className="overflow-x-auto p-2">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            {head.map((h, i) => (
              <th
                key={i}
                className="sticky top-0 border-b border-border bg-surface-2 px-3 py-2 text-left font-bold"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rest.map((r, ri) => (
            <tr key={ri} className="odd:bg-foreground/[0.03]">
              {head.map((_, ci) => (
                <td key={ci} className="border-b border-border/60 px-3 py-2 align-top">
                  {r[ci] ?? ""}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
