"use client";

import { motion } from "framer-motion";
import { Plus } from "lucide-react";

import { PageHeader } from "@/components/navigation/AppShell";
import { LanguageCard } from "@/components/language/LanguageCard";
import { Button } from "@/components/ui/Button";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { useStore } from "@/lib/store-context";

export default function LanguagesPage() {
  const { ready, lang } = useStore();
  if (!ready) return <PageSkeleton />;

  const profiles = lang.profiles;

  if (profiles.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 text-center sm:py-16 lg:px-10">
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 16 }}
          className="mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-gradient-to-br from-blue-500 via-cyan-500 to-emerald-400 text-4xl shadow-glow"
        >
          🌍
        </motion.div>
        <h1 className="mt-6 text-balance text-3xl font-extrabold tracking-tight sm:text-4xl">
          Learn a language your way
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-muted">
          Build vocabulary, understand real language, practice speaking, and
          remember what you learn.
        </p>
        <Button href="/languages/new" size="xl" className="mt-8">
          <Plus className="h-5 w-5" /> Start Learning a Language
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-10">
      <PageHeader
        title="My languages"
        subtitle="Each language keeps its own vocabulary, streak, and progress."
        action={
          <Button href="/languages/new" size="lg">
            <Plus className="h-4 w-4" /> Add a language
          </Button>
        }
      />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {profiles.map((m, i) => (
          <LanguageCard key={m.profile.id} meta={m} index={i} />
        ))}
      </div>
    </div>
  );
}
