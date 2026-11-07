import type { ReactNode } from "react";

import type { Metadata } from "next";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { APP_CONFIG } from "@/config/app-config";
import { fontVars } from "@/lib/fonts/registry";
import { PREFERENCE_DEFAULTS } from "@/lib/preferences/preferences-config";
import { ThemeBootScript } from "@/scripts/theme-boot";
import { PreferencesStoreProvider } from "@/stores/preferences/preferences-provider";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(APP_CONFIG.url),
  applicationName: APP_CONFIG.name,
  authors: [{ name: "NewWash" }],
  title: APP_CONFIG.meta.title,
  description: APP_CONFIG.meta.description,
  openGraph: {
    type: "website",
    siteName: APP_CONFIG.name,
    locale: "vi_VN",
  },
  twitter: {
    card: "summary_large_image",
    creator: "NewWash",
  },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const { theme_mode, theme_preset, content_layout, navbar_style, sidebar_variant, sidebar_collapsible, font } =
    PREFERENCE_DEFAULTS;
  return (
    <html
      lang="vi"
      data-theme-mode={theme_mode}
      data-theme-preset={theme_preset}
      data-content-layout={content_layout}
      data-navbar-style={navbar_style}
      data-sidebar-variant={sidebar_variant}
      data-sidebar-collapsible={sidebar_collapsible}
      data-font={font}
      suppressHydrationWarning
    >
      <head>
        {/* Applies theme and layout preferences on load to avoid flicker and unnecessary server rerenders. */}
        <ThemeBootScript />
      </head>
      <body className={`${fontVars} min-h-screen antialiased`}>
        <TooltipProvider>
          <PreferencesStoreProvider initialValues={PREFERENCE_DEFAULTS}>
            {children}
            <Toaster
              position="top-right"
              toastOptions={{
                classNames: {
                  toast: "!border-border !bg-popover !text-popover-foreground shadow-lg",
                  title: "!font-semibold !text-popover-foreground",
                  description: "!text-popover-foreground/80",
                  icon: "!text-popover-foreground",
                  actionButton: "!bg-primary !text-primary-foreground",
                },
              }}
            />
          </PreferencesStoreProvider>
        </TooltipProvider>
      </body>
    </html>
  );
}
