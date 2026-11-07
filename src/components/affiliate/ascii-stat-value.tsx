"use client";

import type { CSSProperties, ReactNode } from "react";

import { AsciiReveal } from "ascii-reveal";

type AsciiTheme = CSSProperties & {
  "--ascii-accent": string;
  "--ascii-flash": string;
  "--ascii-glyph": string;
};

const asciiTheme: AsciiTheme = {
  "--ascii-accent": "var(--primary)",
  "--ascii-flash": "var(--primary)",
  "--ascii-glyph": "var(--muted-foreground)",
};

export function AsciiStatCard({ children, value }: { children: ReactNode; value: string }) {
  return (
    <AsciiReveal
      key={value}
      className="h-full"
      duration="cinematic"
      fallback
      lazy={false}
      origin="top-left"
      preset="decode"
      revealOnHydrate
      speed={1.35}
      style={asciiTheme}
    >
      {children}
    </AsciiReveal>
  );
}
