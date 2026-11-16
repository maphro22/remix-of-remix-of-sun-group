import { createFileRoute } from "@tanstack/react-router";
import { pageUrl, SITE_URL } from "@/lib/seo";
import { content } from "@/lib/sungroup-content";
import { publicClient } from "@/lib/supabase-public";

// Plain-text summary of the holding for AI assistants and answer engines (llms.txt convention).
const pages = [
  ["/", "home"],
  ["/services", "services"],
  ["/group", "group"],
  ["/about", "about"],
  ["/contact", "contact"],
  ["/insights", "insights"],
  ["/track", "track"],
] as const;

export const Route = createFileRoute("/llms.txt")({
  staticData: { sitemap: false },
  server: {
    handlers: {
      GET: async () => {
        const en = content.en;
        const fa = content.fa;
        const lines: string[] = [
          `# ${en.brandShort} — ${en.brand} (${fa.brand})`,
          "",
          `> ${en.about}`,
          "",
          `> ${fa.about}`,
          "",
          `Website: ${SITE_URL}/ (Persian, default) · ${pageUrl("/", "en")} (English)`,
          `Email: ${en.contactPage.email}`,
          `Countries: ${en.countries.join(", ")}`,
          "",
          "## Services",
          ...en.services.map((s, i) => `- ${s.title} (${fa.services[i]?.title ?? ""}): ${s.body}`),
          "",
          "## Group companies",
          ...en.companies.map((c, i) => `- ${c.name} (${fa.companies[i]?.name ?? ""}): ${c.field}`),
          "",
          "## Offices",
          ...en.offices.map((o) => `- ${o.city}: ${o.address} · ${o.phone} · ${o.hours}`),
          "",
          "## Pages",
          ...pages.map(
            ([path, key]) =>
              `- [${en.seo.pages[key].title}](${pageUrl(path, "en")}): ${en.seo.pages[key].description} Persian: ${pageUrl(path, "fa")}`,
          ),
        ];

        const { data } = await publicClient()
          .from("articles")
          .select("slug, lang, title, excerpt")
          .eq("status", "published")
          .order("published_at", { ascending: false })
          .limit(100);
        if (data && data.length > 0) {
          lines.push("", "## Articles");
          for (const a of data) {
            const url = pageUrl(`/insights/${encodeURIComponent(a.slug)}`, a.lang === "en" ? "en" : "fa");
            lines.push(`- [${a.title}](${url}) (${a.lang}): ${a.excerpt}`);
          }
        }

        return new Response(lines.join("\n") + "\n", {
          headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" },
        });
      },
    },
  },
});
