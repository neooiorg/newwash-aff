"use client";

import type { ReactNode } from "react";

import { AsciiReveal } from "ascii-reveal";

import { newWashAsciiTheme } from "@/components/ascii-feedback";

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
      style={newWashAsciiTheme}
    >
      {children}
    </AsciiReveal>
  );
}
