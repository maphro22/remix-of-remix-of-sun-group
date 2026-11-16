import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";

import { routeTree } from "@/routeTree.gen";
import { pageHead, SITE_URL } from "@/lib/seo";
import { bilingualEntries, sitemapStaticPaths, sitemapXML } from "@/lib/sitemap";

const link = (head: ReturnType<typeof pageHead>, rel: string, hrefLang?: string) =>
  head.links.find((l) => l.rel === rel && (hrefLang === undefined || ("hrefLang" in l && l.hrefLang === hrefLang)))?.href;

describe("SEO rules", () => {
  it("Persian page canonical has no lang param, English adds ?lang=en", () => {
    expect(link(pageHead("services", "/services", "fa"), "canonical")).toBe(`${SITE_URL}/services`);
    expect(link(pageHead("services", "/services", "en"), "canonical")).toBe(`${SITE_URL}/services?lang=en`);
  });

  it("every page lists fa, en and x-default (Persian) hreflang versions", () => {
    const head = pageHead("about", "/about", "en");
    expect(link(head, "alternate", "fa")).toBe(`${SITE_URL}/about`);
    expect(link(head, "alternate", "en")).toBe(`${SITE_URL}/about?lang=en`);
    expect(link(head, "alternate", "x-default")).toBe(`${SITE_URL}/about`);
  });

  it("sitemap lists public pages and leaves out team-only, sign-in and retired pages", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });
    const paths = sitemapStaticPaths(router);
    for (const p of ["/", "/services", "/group", "/about", "/contact", "/insights", "/track"]) expect(paths).toContain(p);
    for (const p of ["/auth", "/dashboard", "/team", "/articles", "/sun", "/holding", "/global"]) expect(paths).not.toContain(p);
  });

  it("sitemap gives each page a Persian and an English URL linked by hreflang", () => {
    const xml = sitemapXML(SITE_URL, bilingualEntries("/contact"));
    expect(xml).toContain(`<loc>${SITE_URL}/contact</loc>`);
    expect(xml).toContain(`<loc>${SITE_URL}/contact?lang=en</loc>`);
    expect(xml).toContain(`hreflang="x-default" href="${SITE_URL}/contact"`);
  });
});
