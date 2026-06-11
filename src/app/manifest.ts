import type { MetadataRoute } from "next";

// Web app manifest — makes Concilium installable and sets the PWA splash/
// theme colors to the brand (coral on cream).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Concilium — Software by consensus",
    short_name: "Concilium",
    description:
      "Multiplayer, AI-mediated ticket refinement. Every ticket gets a council — AI stand-ins for Engineer, Designer, Product Owner & QA — that refine it, reach consensus, and build it.",
    start_url: "/welcome",
    display: "standalone",
    background_color: "#FCFAF6",
    theme_color: "#E85D34",
    icons: [
      {
        src: "/brand/logo-mark.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
