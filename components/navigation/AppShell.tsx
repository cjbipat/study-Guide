"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  ClipboardList,
  Globe,
  LayoutDashboard,
  Layers,
  Library,
  Trophy,
  Settings,
  Flame,
} from "lucide-react";

import { Logo } from "@/components/brand/Logo";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useStore } from "@/lib/store-context";
import { levelFromXp } from "@/lib/xp";
import { hasAnyActivity } from "@/lib/learning/selectors";
import { cn } from "@/lib/utils";

const NAV = [
  { label: "Dashboard", short: "Home", href: "/dashboard", icon: LayoutDashboard, bottom: true },
  { label: "Quizzes", short: "Quizzes", href: "/quizzes", icon: ClipboardList, bottom: true },
  { label: "Languages", short: "Languages", href: "/languages", icon: Globe, bottom: true },
  { label: "Materials", short: "Library", href: "/materials", icon: Library, bottom: true },
  { label: "Decks", short: "Decks", href: "/decks", icon: Layers, bottom: true },
  { label: "Achievements", short: "Awards", href: "/achievements", icon: Trophy, bottom: false },
  { label: "Settings", short: "Settings", href: "/settings", icon: Settings, bottom: false },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { snapshot, ready } = useStore();
  const { level, progress } = levelFromXp(snapshot.stats.totalXp);
  // Streak / XP / level only appear once there's real activity behind them.
  const showProgress = ready && hasAnyActivity(snapshot);

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === href : pathname.startsWith(href);

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[264px_1fr]">
      {/* Sidebar (desktop) */}
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-border bg-surface-solid p-5 lg:flex">
        <Link href="/" className="flex items-center gap-2.5 px-2">
          <Logo className="h-9 w-9" />
          <span className="text-lg font-extrabold tracking-tight">Ember</span>
        </Link>

        <nav className="mt-8 flex flex-1 flex-col gap-1">
          {NAV.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-semibold transition-colors",
                  active
                    ? "text-primary"
                    : "text-muted hover:bg-foreground/5 hover:text-foreground",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="nav-active"
                    className="absolute inset-0 rounded-2xl bg-primary/12"
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
                <item.icon className="relative h-5 w-5" />
                <span className="relative">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {showProgress && (
          <div className="rounded-2xl border border-border bg-surface-2 p-4">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-muted">Level {level}</span>
              <span className="flex items-center gap-1 text-accent">
                <Flame className="h-3.5 w-3.5" />
                {snapshot.stats.currentStreak}
              </span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-foreground/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-[width] duration-700"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-muted">
              {snapshot.stats.totalXp.toLocaleString()} XP total
            </p>
          </div>
        )}

        <div className="mt-4 flex items-center justify-between">
          <ThemeToggle />
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="flex flex-col">
        <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border glass px-4 py-3 lg:hidden">
          <Link href="/" className="flex items-center gap-2">
            <Logo className="h-8 w-8" />
            <span className="font-extrabold tracking-tight">Ember</span>
          </Link>
          <div className="flex items-center gap-2">
            {showProgress && (
              <span className="flex items-center gap-1 rounded-full bg-accent/12 px-2.5 py-1 text-xs font-bold text-accent">
                <Flame className="h-3.5 w-3.5" />
                {snapshot.stats.currentStreak}
              </span>
            )}
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 pb-24 lg:pb-0">{children}</main>

        {/* Mobile bottom nav */}
        <nav className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-border glass px-2 py-2 lg:hidden">
          {NAV.filter((n) => n.bottom).map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1 rounded-xl py-1.5 text-[10px] font-semibold transition-colors",
                  active ? "text-primary" : "text-muted",
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.short}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

/** Consistent page header used across app routes. */
export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
          {title}
        </h1>
        {subtitle && <p className="mt-1.5 text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
