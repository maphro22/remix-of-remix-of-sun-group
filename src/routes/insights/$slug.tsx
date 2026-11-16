import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Instagram } from "lucide-react";
import { SiteShell, langSearch } from "@/components/site/SiteShell";
import { getArticle } from "@/lib/articles.functions";
import { breadcrumbJsonLd, jsonLdScript, OG_LOCALE, ORG_ID, pageUrl } from "@/lib/seo";
import { content, parseLang, type Lang } from "@/lib/sungroup-content";

export const Route = createFileRoute("/insights/$slug")({
  staticData: { sitemap: true },
  validateSearch: parseLang,
  loader: async ({ params }) => {
    const a = await getArticle({ data: { slug: params.slug } });
    if (!a) throw notFound();
    return a;
  },
  head: ({ loaderData: a }) => {
    if (!a) return { meta: [{ title: "SUNGROUP" }, { name: "robots", content: "noindex" }] };
    const lang: Lang = a.lang === "en" ? "en" : "fa";
    const t = content[lang];
    const url = pageUrl(`/insights/${encodeURIComponent(a.slug)}`, lang);
    const title = `${a.title} | SUNGROUP`;
    return {
      meta: [
        { title },
        { name: "description", content: a.excerpt },
        { property: "og:title", content: a.title },
        { property: "og:description", content: a.excerpt },
        { property: "og:url", content: url },
        { property: "og:type", content: "article" },
        { property: "og:locale", content: OG_LOCALE[lang] },
        { property: "article:section", content: t.insights.categories[a.category] },
        ...(a.publishedAt ? [{ property: "article:published_time", content: a.publishedAt }] : []),
        { property: "article:modified_time", content: a.updatedAt },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: a.title },
        { name: "twitter:description", content: a.excerpt },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        jsonLdScript({
          "@context": "https://schema.org",
          "@type": "Article",
          headline: a.title,
          description: a.excerpt,
          inLanguage: lang,
          articleSection: t.insights.categories[a.category],
          ...(a.coverUrl ? { image: [a.coverUrl] } : {}),
          ...(a.publishedAt ? { datePublished: a.publishedAt } : {}),
          dateModified: a.updatedAt,
          author: { "@id": ORG_ID },
          publisher: { "@id": ORG_ID },
          mainEntityOfPage: { "@type": "WebPage", "@id": url },
          url,
        }),
        jsonLdScript(
          breadcrumbJsonLd(lang, [
            { name: t.seo.pages.insights.title, url: pageUrl("/insights", lang) },
            { name: a.title, url },
          ]),
        ),
      ],
    };
  },
  errorComponent: () => <p role="alert" className="p-10">{content.fa.insights.loadError}</p>,
  notFoundComponent: () => <p className="p-10">{content.fa.insights.notFound}</p>,
  component: ArticlePage,
});

function ArticlePage() {
  const a = Route.useLoaderData();
  const lang = Route.useSearch().lang ?? "fa";
  const t = content[lang];
  return (
    <SiteShell lang={lang} current="/insights">
      <article className="mx-auto max-w-3xl px-6 py-12">
        <Link to="/insights" search={langSearch(lang)} className="text-sm text-primary">{t.insights.back}</Link>
        <p className="mt-6 text-sm font-semibold text-primary">{t.insights.categories[a.category]}</p>
        <h1 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">{a.title}</h1>
        <p className="mt-4 text-lg text-muted-foreground">{a.excerpt}</p>
        {a.coverUrl && <img src={a.coverUrl} alt="" className="mt-8 w-full rounded-3xl object-cover" />}
        <div className="mt-8 space-y-4 leading-loose">
          {a.body.split("\n").filter(Boolean).map((p, i) => <p key={i}>{p}</p>)}
        </div>
        <div className="mt-12 rounded-3xl bg-inverse p-8 text-inverse-foreground">
          <h2 className="flex items-center gap-2 text-xl font-semibold"><Instagram className="size-5" />{t.insights.igTitle}</h2>
          <p className="mt-2 opacity-80">{t.insights.igSub}</p>
          <a href={a.instagramUrl ?? t.instagram.url} target="_blank" rel="noreferrer" className="mt-5 inline-flex rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground">
            {a.instagramUrl ? t.insights.igCta : t.insights.igFollow}
          </a>
        </div>
      </article>
    </SiteShell>
  );
}
