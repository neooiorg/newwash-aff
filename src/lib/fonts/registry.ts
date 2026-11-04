import { Geist_Mono, Manrope } from "next/font/google";

const manrope = Manrope({
  subsets: ["latin", "latin-ext", "vietnamese"],
  variable: "--font-manrope",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const fontRegistry = {
  manrope: {
    label: "Manrope",
    font: manrope,
  },
} as const;

export type FontKey = keyof typeof fontRegistry;

export const fontKeys = Object.keys(fontRegistry) as FontKey[];

export const fontVars = `${manrope.variable} ${geistMono.variable}`;

export const fontOptions = fontKeys.map((key) => ({
  key,
  label: fontRegistry[key].label,
}));
