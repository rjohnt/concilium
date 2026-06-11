import type { MetadataRoute } from "next";

const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

/**
 * Let crawlers index the public marketing + share surfaces, but keep the
 * authed app and API out of search results.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/welcome", "/compare", "/share/"],
      disallow: ["/api/", "/ticket/", "/consensus/", "/build/", "/prompt/", "/new", "/login", "/signup", "/auth/"],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
