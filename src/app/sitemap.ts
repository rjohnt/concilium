import type { MetadataRoute } from "next";

const base = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");

/** Public, crawlable marketing surfaces. Authed app + ephemeral share links are excluded. */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${base}/welcome`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/compare`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
  ];
}
