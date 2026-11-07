"use client";

import type { CSSProperties } from "react";

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

export function AsciiStatValue({ value }: { value: string }) {
  return (
    <AsciiReveal
      key={value}
      as="span"
      className="inline-block"
      duration="fast"
      fallback
      lazy={false}
      origin="center"
      preset="decode"
      selector="[data-ascii-value]"
      speed={1.25}
      style={asciiTheme}
    >
      <span className="inline-block" data-ascii-digits data-ascii-value>
        {value}
      </span>
    </AsciiReveal>
  );
}
