"use client";

import { forwardRef } from "react";
import Link from "next/link";

import { cn } from "@/lib/utils";

type Variant =
  | "primary"
  | "secondary"
  | "success"
  | "outline"
  | "ghost"
  | "danger";
type Size = "sm" | "md" | "lg" | "xl";

const base =
  "inline-flex items-center justify-center gap-2 font-semibold rounded-full transition-all duration-200 active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none select-none whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

const variants: Record<Variant, string> = {
  primary:
    "bg-primary text-primary-foreground shadow-glow hover:brightness-110 hover:-translate-y-0.5",
  secondary:
    "bg-secondary text-white shadow-soft hover:brightness-110 hover:-translate-y-0.5",
  success:
    "bg-success text-white shadow-glow-success hover:brightness-110 hover:-translate-y-0.5",
  outline:
    "border border-border-strong bg-surface-solid text-foreground hover:border-primary hover:text-primary",
  ghost: "text-foreground hover:bg-foreground/5",
  danger:
    "bg-accent text-white shadow-soft hover:brightness-110 hover:-translate-y-0.5",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-13 px-7 text-base",
  xl: "h-15 px-9 text-lg",
};

interface CommonProps {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: React.ReactNode;
}

type ButtonAsButton = CommonProps &
  React.ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined };
type ButtonAsLink = CommonProps &
  Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & { href: string };

export type ButtonProps = ButtonAsButton | ButtonAsLink;

export const Button = forwardRef<HTMLButtonElement & HTMLAnchorElement, ButtonProps>(
  function Button(
    { variant = "primary", size = "md", className, children, ...props },
    ref,
  ) {
    const cls = cn(base, variants[variant], sizes[size], className);
    if ("href" in props && props.href) {
      const { href, ...rest } = props;
      return (
        <Link
          href={href}
          ref={ref}
          className={cls}
          {...(rest as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
        >
          {children}
        </Link>
      );
    }
    return (
      <button
        ref={ref}
        className={cls}
        {...(props as React.ButtonHTMLAttributes<HTMLButtonElement>)}
      >
        {children}
      </button>
    );
  },
);
