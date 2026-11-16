import { createFileRoute } from "@tanstack/react-router";
import { getRouterInstance } from "@tanstack/react-start";
import { SITE_URL } from "@/lib/seo";
import {
  bilingualEntries,
  isSitemapRouteIncluded,
  sitemapPathForLocation,
  sitemapStaticPaths,
  sitemapXML,
  type SitemapEntry,
} from "@/lib/sitemap";
import { publicClient } from "@/lib/supabase-public";

export const Route = createFileRoute("/sitemap.xml")({
  staticData: { sitemap: false },
  server: {
    handlers: {
      GET: async () => {
        const router = await getRouterInstance();
        // Every static page exists in Persian (default) and English (?lang=en).
        const entries: SitemapEntry[] = sitemapStaticPaths(router).flatMap(bilingualEntries);

        // Published articles: each row is one language, so it gets one URL in that language.
        const routeId = "/insights/$slug";
        if (isSitemapRouteIncluded(router.routesById[routeId])) {
          const db = publicClient();
          const pageSize = 1000;
          for (let offset = 0; ; ) {
            const { data, error } = await db
              .from("articles")
              .select("id, slug, lang, updated_at")
              .eq("status", "published")
              .order("id")
              .range(offset, offset + pageSize - 1);
            if (error) throw error;
            if (data.length === 0) break;
            for (const row of data) {
              const location = router.buildLocation({
                to: "/insights/$slug",
                params: { slug: row.slug },
                search: () => ({}),
                hash: "",
              });
              const path = sitemapPathForLocation(router, location, routeId);
              if (path) entries.push({ path, lang: row.lang === "en" ? "en" : "fa", lastmod: row.updated_at });
            }
            offset += data.length;
          }
        }

        if (entries.length === 0) {
          return new Response("No pages are included in this sitemap.", {
            status: 404,
            headers: { "Cache-Control": "no-store" },
          });
        }
        return new Response(sitemapXML(SITE_URL, entries), {
          headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" },
        });
      },
    },
  },
});
