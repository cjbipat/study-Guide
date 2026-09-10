import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";

export function CTASection() {
  return (
    <section id="resources" className="scroll-mt-24 px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
      <Reveal
        y={30}
        className="relative mx-auto max-w-5xl overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-violet-600 via-fuchsia-600 to-orange-500 px-6 py-16 text-center text-white shadow-glow sm:px-16 sm:py-20"
      >
        <div className="pointer-events-none absolute inset-0 bg-grid opacity-20" />
        <div className="relative">
          <h2 className="text-balance text-4xl font-extrabold tracking-tight sm:text-5xl">
            Your first correct answer is one deck away
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/90">
            Start free with a clean workspace. Build your first deck in under a
            minute.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button
              href="/get-started"
              size="lg"
              className="w-full bg-white text-violet-700 hover:bg-white/90 sm:w-auto"
            >
              Start Learning <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              href="/#demo"
              size="lg"
              className="w-full border border-white/40 bg-white/10 text-white hover:bg-white/20 sm:w-auto"
            >
              Explore Demo
            </Button>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
