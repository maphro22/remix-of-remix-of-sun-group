import { content, type Lang } from "@/lib/sungroup-content";

/** Public origin used for canonical links, hreflang, social previews and the sitemap. */
export const SITE_URL = "https://sun-group-persian-discovery.lovable.app";
export const ORG_ID = `${SITE_URL}/#organization`;

export type SeoPage = keyof (typeof content)["fa"]["seo"]["pages"];

/** Open Graph locale per site language. */
export const OG_LOCALE: Record<Lang, string> = { fa: "fa_IR", en: "en_US" };

/** Share-sized (1200x630) crops in public/og of the photo each page shows. */
const OG_IMAGES: Partial<Record<SeoPage, string>> = {
  home: "/og/home.jpg",
  services: "/og/services.jpg",
  about: "/og/about.jpg",
  contact: "/og/contact.jpg",
};

/** ISO codes aligned with content[lang].countries (Iran, China, Lithuania, Iraq). */
const COUNTRY_CODES = ["IR", "CN", "LT", "IQ"];
/** Locality and country aligned with content[lang].offices (Tehran, Guangzhou). */
const OFFICE_GEO = [
  { locality: "Tehran", region: "Tehran", country: "IR" },
  { locality: "Guangzhou", region: "Guangdong", country: "CN" },
];

/** Absolute URL of a page in a language: Persian is the default, English adds ?lang=en. */
export function pageUrl(path: string, lang: Lang) {
  return `${SITE_URL}${path}${lang === "en" ? "?lang=en" : ""}`;
}

/** hreflang links for a page that exists in both languages; x-default is Persian. */
export function hreflangLinks(path: string) {
  return [
    { rel: "alternate", hrefLang: "fa", href: pageUrl(path, "fa") },
    { rel: "alternate", hrefLang: "en", href: pageUrl(path, "en") },
    { rel: "alternate", hrefLang: "x-default", href: pageUrl(path, "fa") },
  ];
}

export const jsonLdScript = (data: unknown) => ({ type: "application/ld+json", children: JSON.stringify(data) });

/** Full head (title, description, canonical, hreflang, Open Graph, Twitter) for a bilingual page. */
export function pageHead(page: SeoPage, path: string, lang: Lang, jsonLd: unknown[] = []) {
  const s = content[lang].seo.pages[page];
  const url = pageUrl(path, lang);
  const other: Lang = lang === "fa" ? "en" : "fa";
  const image = OG_IMAGES[page];
  const imageMeta = image
    ? [
        { property: "og:image", content: `${SITE_URL}${image}` },
        { property: "og:image:width", content: "1200" },
        { property: "og:image:height", content: "630" },
        { property: "og:image:alt", content: s.title },
        { name: "twitter:image", content: `${SITE_URL}${image}` },
      ]
    : [];
  return {
    meta: [
      { title: s.title },
      { name: "description", content: s.description },
      { property: "og:title", content: s.title },
      { property: "og:description", content: s.description },
      { property: "og:url", content: url },
      { property: "og:type", content: "website" },
      { property: "og:locale", content: OG_LOCALE[lang] },
      { property: "og:locale:alternate", content: OG_LOCALE[other] },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: s.title },
      { name: "twitter:description", content: s.description },
      ...imageMeta,
    ],
    links: [{ rel: "canonical", href: url }, ...hreflangLinks(path)],
    scripts: jsonLd.map(jsonLdScript),
  };
}

/** Organization (holding) schema shared by every page; English names with Persian alternates. */
export function organizationJsonLd() {
  const en = content.en;
  const fa = content.fa;
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": ORG_ID,
    name: "SUNGROUP",
    alternateName: [en.brand, fa.brand, "Sun Group Holding", "هلدینگ آفتاب"],
    url: `${SITE_URL}/`,
    image: `${SITE_URL}/og/home.jpg`,
    description: en.about,
    foundingDate: "2003",
    email: en.contactPage.email,
    telephone: en.offices[0]?.tel,
    knowsLanguage: ["fa", "en"],
    knowsAbout: en.services.map((s) => s.title),
    areaServed: en.countries.map((name, i) => ({ "@type": "Country", name, identifier: COUNTRY_CODES[i] })),
    address: en.offices.map((o, i) => ({
      "@type": "PostalAddress",
      name: o.city,
      streetAddress: o.address,
      addressLocality: OFFICE_GEO[i]?.locality,
      addressRegion: OFFICE_GEO[i]?.region,
      addressCountry: OFFICE_GEO[i]?.country,
    })),
    contactPoint: en.offices.map((o, i) => ({
      "@type": "ContactPoint",
      name: o.city,
      contactType: "sales",
      telephone: o.tel,
      email: en.contactPage.email,
      areaServed: COUNTRY_CODES,
      availableLanguage: ["fa", "en"],
      hoursAvailable: o.hours,
      ...(OFFICE_GEO[i] ? { address: { "@type": "PostalAddress", addressLocality: OFFICE_GEO[i].locality, addressCountry: OFFICE_GEO[i].country } } : {}),
    })),
    subOrganization: en.companies.map((c, i) => ({
      "@type": "Organization",
      name: c.name,
      alternateName: fa.companies[i]?.name,
      description: c.field,
      parentOrganization: { "@id": ORG_ID },
    })),
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    url: `${SITE_URL}/`,
    name: "SUNGROUP",
    alternateName: [content.fa.seo.siteName, content.en.seo.siteName],
    inLanguage: ["fa", "en"],
    publisher: { "@id": ORG_ID },
  };
}

/** Services as a schema.org list, provided by the holding. */
export function servicesJsonLd(lang: Lang) {
  const t = content[lang];
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: t.seo.pages.services.title,
    inLanguage: lang,
    itemListElement: t.services.map((s, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "Service",
        name: s.title,
        description: s.body,
        provider: { "@id": ORG_ID },
        areaServed: COUNTRY_CODES,
      },
    })),
  };
}

export function breadcrumbJsonLd(lang: Lang, items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [{ name: content[lang].seo.home, url: pageUrl("/", lang) }, ...items].map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: it.url,
    })),
  };
}
