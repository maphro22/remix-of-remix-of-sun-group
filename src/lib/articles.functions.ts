import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { publicClient } from "@/lib/supabase-public";

export type ArticleCategory = "guide" | "news" | "market";
export type PublicArticle = {
  slug: string;
  lang: string;
  category: ArticleCategory;
  title: string;
  excerpt: string;
  body: string;
  coverUrl: string | null;
  instagramUrl: string | null;
  publishedAt: string | null;
  updatedAt: string;
};

type Row = Database["public"]["Tables"]["articles"]["Row"];

/** Covers are served via the long-lived private link the team creates on save; the folder itself is team-only. */
function toPublic(rows: Row[]): PublicArticle[] {
  return rows.map((r) => ({
    slug: r.slug,
    lang: r.lang,
    category: r.category,
    title: r.title,
    excerpt: r.excerpt,
    body: r.body,
    coverUrl: r.cover_url ? (r.cover_link ?? null) : null,
    instagramUrl: r.instagram_url,
    publishedAt: r.published_at,
    updatedAt: r.updated_at,
  }));
}

export const listArticles = createServerFn({ method: "GET" })
  .inputValidator(z.object({ lang: z.enum(["fa", "en"]), limit: z.number().int().min(1).max(60).default(30) }))
  .handler(async ({ data }) => {
    const { data: rows, error } = await publicClient()
      .from("articles")
      .select("*")
      .eq("status", "published")
      .eq("lang", data.lang)
      .order("published_at", { ascending: false })
      .limit(data.limit);
    if (error) throw new Error("Could not load articles");
    return toPublic(rows ?? []);
  });

export const getArticle = createServerFn({ method: "GET" })
  .inputValidator(z.object({ slug: z.string().min(1).max(120) }))
  .handler(async ({ data }) => {
    const { data: row, error } = await publicClient().from("articles").select("*").eq("status", "published").eq("slug", data.slug).maybeSingle();
    if (error) throw new Error("Could not load article");
    if (!row) return null;
    return toPublic([row])[0] ?? null;
  });
