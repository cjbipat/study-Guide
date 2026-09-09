"use client";

import { useRouter } from "next/navigation";
import { FileUp } from "lucide-react";

import { MaterialCard } from "@/components/materials/MaterialCard";
import { UploadZone } from "@/components/materials/UploadZone";
import { EmptyState } from "@/components/ui/EmptyState";
import { useStore } from "@/lib/store-context";

export function DeckMaterialsPanel({ deckId }: { deckId: string }) {
  const router = useRouter();
  const { materialsForDeck } = useStore();
  const materials = materialsForDeck(deckId);

  return (
    <div className="space-y-6">
      <UploadZone
        deckId={deckId}
        variant="compact"
        onUploaded={(m) => {
          if (m.length === 1) router.push(`/materials/${m[0].id}`);
        }}
      />

      {materials.length === 0 ? (
        <EmptyState
          icon="📄"
          title="No study material for this deck"
          body="Upload the notes, slides, or documents this deck is built from — then turn them into flashcards, quizzes, and more."
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2">
          {materials.map((m, i) => (
            <MaterialCard key={m.id} material={m} index={i} />
          ))}
        </div>
      )}

      <p className="flex items-center justify-center gap-1.5 text-xs text-muted-2">
        <FileUp className="h-3.5 w-3.5" />
        Materials also appear in your full library at /materials
      </p>
    </div>
  );
}
