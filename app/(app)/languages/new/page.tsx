"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { OnboardingWizard } from "@/components/language/OnboardingWizard";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { useStore } from "@/lib/store-context";

export default function NewLanguagePage() {
  const { ready } = useStore();
  if (!ready) return <PageSkeleton />;

  return (
    <div>
      <div className="mx-auto max-w-2xl px-4 pt-6 sm:pt-10">
        <Link
          href="/languages"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Languages
        </Link>
      </div>
      <OnboardingWizard />
    </div>
  );
}
