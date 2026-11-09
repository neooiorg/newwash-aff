import type { MetadataRoute } from "next";

import { APP_CONFIG } from "@/config/app-config";

const PUBLIC_ROUTES = ["/affiliate/apply"] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_ROUTES.map((route) => ({
    url: `${APP_CONFIG.url}${route}`,
  }));
}
