"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, Check } from "lucide-react";
import { useState } from "react";

import { Logo } from "@/components/brand/Logo";
import { Flashcard } from "@/components/cards/Flashcard";
import { Button } from "@/components/ui/Button";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export function AuthScreen({
  mode,
}: {
  mode: "login" | "signup";
}) {
  const router = useRouter();
  const isSignup = mode === "signup";
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    if (isSignup && name.trim()) {
      window.localStorage.setItem("studyquest.name", name.trim());
    }
    // Local-only workspace — no server auth yet. The name personalises the
    // greeting; all data lives in this browser.
    setTimeout(() => router.push("/dashboard"), 450);
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Form side */}
      <div className="flex flex-col px-6 py-8 sm:px-12">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <Logo className="h-8 w-8" />
            <span className="text-lg font-extrabold tracking-tight">Ember</span>
          </Link>
          <ThemeToggle />
        </div>

        <div className="flex flex-1 flex-col justify-center py-10">
          <div className="mx-auto w-full max-w-sm">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
                {isSignup ? "Create your account" : "Welcome back"}
              </h1>
              <p className="mt-2 text-muted">
                {isSignup
                  ? "Start with a clean workspace and build your own learning history."
                  : "Pick up right where you left off."}
              </p>

              <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                <Check className="h-3.5 w-3.5" /> Your progress is saved on this device
              </div>

              <form onSubmit={submit} className="mt-7 space-y-4">
                {isSignup && (
                  <div>
                    <label htmlFor="name" className="mb-1.5 block text-sm font-bold">
                      Name
                    </label>
                    <input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Chris"
                      className="input"
                      autoComplete="given-name"
                    />
                  </div>
                )}
                <div>
                  <label htmlFor="email" className="mb-1.5 block text-sm font-bold">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="input"
                    autoComplete="email"
                  />
                </div>

                <Button type="submit" size="lg" className="w-full" disabled={loading}>
                  {loading
                    ? "Loading…"
                    : isSignup
                      ? "Start Learning"
                      : "Log In"}
                  {!loading && <ArrowRight className="h-4 w-4" />}
                </Button>
              </form>

              <p className="mt-6 text-sm text-muted">
                {isSignup ? (
                  <>
                    Already have an account?{" "}
                    <Link href="/login" className="font-semibold text-primary hover:underline">
                      Log in
                    </Link>
                  </>
                ) : (
                  <>
                    New here?{" "}
                    <Link
                      href="/get-started"
                      className="font-semibold text-primary hover:underline"
                    >
                      Create an account
                    </Link>
                  </>
                )}
              </p>
              <p className="mt-2 text-sm text-muted">
                Or{" "}
                <Link href="/dashboard" className="font-semibold text-primary hover:underline">
                  skip and start exploring
                </Link>
                .
              </p>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Visual side */}
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-violet-600 via-fuchsia-600 to-orange-500 lg:block">
        <div className="absolute inset-0 bg-grid opacity-20" />
        <div className="relative flex h-full flex-col items-center justify-center p-12">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, rotate: -3 }}
            animate={{ opacity: 1, scale: 1, rotate: -3 }}
            transition={{ duration: 0.6 }}
            className="w-full max-w-sm"
          >
            <Flashcard
              theme="violet"
              question="What makes a habit stick?"
              answer="A rewarding cue-routine-reward loop. Every correct answer here is a little reward."
              revealed
              minHeight="min-h-[220px]"
            />
          </motion.div>
          <p className="mt-8 max-w-sm text-center text-lg font-semibold text-white/90">
            Upload material, build decks, take quizzes, learn a language — all in
            one place, all tracked from what you actually do.
          </p>
          <p className="mt-1 text-sm text-white/70">
            Spaced repetition · honest progress · no fake numbers
          </p>
        </div>
      </div>
    </div>
  );
}
