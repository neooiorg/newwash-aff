"use client";

import type { CSSProperties, ReactNode } from "react";

import { usePathname } from "next/navigation";

import { AsciiReveal, AsciiSkeleton } from "ascii-reveal";
import { cn } from "cn";

type AsciiTheme = CSSProperties & {
  "--ascii-accent": string;
  "--ascii-flash": string;
  "--ascii-glyph": string;
  "--ascii-skeleton": string;
};

export const newWashAsciiTheme: AsciiTheme = {
  "--ascii-accent": "var(--color-yellow-400)",
  "--ascii-flash": "var(--color-yellow-400)",
  "--ascii-glyph": "var(--muted-foreground)",
  "--ascii-skeleton": "var(--muted-foreground)",
};

export function AsciiPageReveal({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <AsciiReveal
      key={pathname}
      className="min-w-0"
      duration="fast"
      fallback
      lazy
      origin="top-left"
      preset="decode"
      revealOnHydrate
      speed={1.2}
      style={newWashAsciiTheme}
    >
      {children}
    </AsciiReveal>
  );
}

export function AsciiLoadingReveal({
  children,
  className,
  loading,
  skeleton,
}: {
  children: ReactNode;
  className?: string;
  loading: boolean;
  skeleton: ReactNode;
}) {
  return (
    <AsciiReveal
      className={cn("min-w-0", className)}
      duration="fast"
      fallback
      lazy={false}
      loading={loading}
      origin="top-left"
      preset="decode"
      speed={1.2}
      style={newWashAsciiTheme}
    >
      {loading ? skeleton : children}
    </AsciiReveal>
  );
}

export function AsciiPanelSkeleton({
  className,
  height = 320,
  rows = 18,
  seed = 1,
}: {
  className?: string;
  height?: number;
  rows?: number;
  seed?: number;
}) {
  return (
    <div
      className={cn("overflow-hidden rounded-xl bg-card p-4 ring-1 ring-foreground/10", className)}
      data-ascii="surface"
      style={newWashAsciiTheme}
    >
      <AsciiSkeleton animate height={height} rows={rows} seed={seed} variant="scan" width="100%" />
    </div>
  );
}
