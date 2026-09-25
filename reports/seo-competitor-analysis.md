# WoYab SEO Competitor Analysis and Implementation Report

**Audit Date:** September 6, 2026.  
**Scope:** Public pages across seven competitors, sample city and specialty pages, retrieved HTML structures, and repository code. Raw data for titles, descriptions, H1 tags, canonical URLs, hreflang annotations, and structured data schemas are documented in [seo-competitor-signals.json](./seo-competitor-signals.json). This report does not represent a full-crawl audit of all competitor URLs, nor does it claim definitive rankings or traffic volumes.

The keywords below have been extracted from competitor titles, categories, and visible content, or proposed based on observed demand patterns. Without direct Google Search Console access, Keyword Planner, or commercial keyword intelligence tools, search volumes, keyword difficulties, backlink counts, and precise ranking positions cannot be treated as definitive metrics. The presence of `meta keywords` does not indicate ranking; Google does not use this tag for indexing or ranking ([Google Documentation](https://developers.google.com/search/docs/crawling-indexing/special-tags)).

---

## 1. Competitor Landscape and Opportunities

| Competitor | Observed Topic Clusters | Evidence & Competitive Opportunity |
| :--- | :--- | :--- |
| [Mineed](https://mineed.net/) | Classifieds for Persian speakers in Germany, job listings, services, events | Broad topic coverage and category links. Sample homepage HTML lacked H1 and canonical tags. **WoYab Opportunity:** Clean, dedicated focus on local directory discovery with city and specialty landing pages and rich, actionable business profiles. |
| [Risman](https://risman.de/) | Dentists, certified translations, restaurants, salons across German cities | Extensive category and city link network. Homepage canonical in sample resolved to `/blog-2/`; missing H1 and meta description. **WoYab Opportunity:** Consistent canonical architecture, descriptive title/H1 hierarchy, and up-to-date business data. |
| [Nationsbase](https://nationsbase.com/fa) | Iranian businesses abroad, community events, education | Trilingual setup with reciprocal hreflang; homepage title and H1 primarily describe brand and membership. **WoYab Opportunity:** Direct intent fulfillment for users seeking a specific local service in a specific German city. |
| [Abhavij](https://www.abhavij.com/) | Iranian community, business listings, events, magazine articles | Persian and English coverage with Event structured data. Sample page had H1 focused on events with mixed homepage intent. **WoYab Opportunity:** Sharp landing pages tailored to single local search intents without diluting content with unnecessary magazine or event feeds. |
| [Mainja](https://mainja.com/fa) | Iranian diaspora services, supermarkets, restaurants, lawyers, psychologists | Clear titles, specialized categories, canonical and hreflang tags. Root domain serves a language selector. **WoYab Opportunity:** Direct routing to Persian/German content with indexed local listings and structured comparison data. |
| [Nazdikia](https://nazdikia.com/) | Iranian & Persian-speaking businesses, doctors, lawyers, restaurants | Numerous categories, city landing pages, FAQ schemas, and internal links. Berlin directory sample included location-independent online services. **WoYab Opportunity:** Strict geographic boundaries ensuring results are genuinely relevant to the chosen city. |
| [Kojast](https://www.kojast.de/) | Persian-speaking doctors, dentists, lawyers, translators, supermarkets in Germany | Closest local competitor: dedicated city pages, specialties, combined service-city guides, hreflang, and schema. German meta keywords observed (e.g., *Iranischer Zahnarzt*, *Persischer Supermarkt*). **WoYab Opportunity:** Natural Persian and German copy, faster Core Web Vitals, and verified data accuracy. |

---

## 2. Recommended Keywords & Target Pages

Prioritization is based on user intent (contact/conversion proximity) and alignment with WoYab's directory model, not speculative search volume metrics. Cities should only be targeted where active business inventory exists (Berlin, Hamburg, Frankfurt, Munich, Cologne, Düsseldorf).

| Priority | Persian Keyword | German Keyword | Target Page & Implementation |
| :--- | :--- | :--- | :--- |
| **High** | دندانپزشک فارسی‌زبان در برلین؛ دندانپزشک ایرانی برلین | Persischsprachiger Zahnarzt Berlin; Iranischer Zahnarzt Berlin | Dental specialty + city page; H1, title, and listing grid. Nationality claims only supported by verified profile data. |
| **High** | پزشک فارسی‌زبان در هامبورگ | Persischsprachiger Arzt Hamburg | Medical category + city page; internal links to sub-specialties (e.g., general medicine). |
| **High** | وکیل فارسی‌زبان در برلین | Persischsprachiger Rechtsanwalt Berlin | Legal services + city page; specific legal domain and direct contact information. |
| **High** | رستوران ایرانی در هامبورگ؛ رستوران افغانستانی در برلین | Persisches Restaurant Hamburg; Afghanisches Restaurant Berlin | Food category + city page; cuisine types strictly bound to authentic business attributes. |
| **High** | سوپرمارکت ایرانی در برلین | Persischer Supermarkt Berlin | Persian grocery specialty + city page; verified physical address and operating hours. |
| **Medium** | مترجم فارسی آلمانی در برلین؛ مترجم رسمی فارسی | Persisch Deutsch Übersetzer Berlin | Translation specialty + city page; "sworn/certified" designation strictly verified. |
| **Medium** | آرایشگاه فارسی‌زبان در هامبورگ | Persischsprachiger Friseur Hamburg | Salon specialty + city page; verified services, address, and booking contact. |
| **Medium** | روانشناس فارسی‌زبان در آلمان | Persischsprachiger Psychologe Deutschland | Category page (nationwide or city-bound where practitioners exist); no unverified clinical claims. |
| **Medium** | حسابدار فارسی‌زبان در آلمان | Persischsprachiger Steuerberater Deutschland | Validated accounting/tax advisors; differentiate bookkeeper (*Buchhalter*) from tax advisor (*Steuerberater*). |
| **Baseline** | کسب‌وکارهای فارسی‌زبان در آلمان | Persischsprachige Unternehmen Deutschland | Homepage and general directory root; clear focus on Iranian and Afghan diaspora communities. |
| **Baseline** | خدمات فارسی‌زبان در برلین | Persischsprachige Dienstleistungen Berlin | City directory hub linking to local categories and specialties. |
| **B2B / Claims** | ثبت کسب‌وکار در آلمان | Unternehmen eintragen Deutschland | `/for-businesses` onboarding flow; free tier terms clearly stated. |

---

## 3. SEO Architecture Implemented in the Project

1. **Crawlable Directory Structure:** Implemented `/[locale]/directory` routes with dedicated hubs for cities, categories, and specialties (e.g., `/fa/directory/cities/berlin`, `/de/directory/categories/restaurants-cafes`, `/fa/directory/specialties/dental-clinic`).
2. **Combination Matrix Routing:** Supports specialty/category + city combinations (e.g., `/fa/directory/specialties/dental-clinic/berlin`) generated strictly from database slugs.
3. **Thin Content Prevention Thresholds:** Single-dimension pages require at least 1 active business. Combination pages require at least 3 active businesses. Empty or non-existent combinations return HTTP 404.
4. **Active Inventory Filtering:** Only active, verified, non-soft-removed businesses in active categories are included in directory lists.
5. **Server-Side Rendered (SSR) Listing Experience:** Directory pages leverage SSR to output standard HTML listing cards (9 per page) with crawlable profile links, maintaining high performance and map integration.
6. **Strict Pagination Architecture:** Real HTML pagination links with independent self-canonical URLs (`?page=2` canonicals to `?page=2`, never to page 1), following [Google's pagination guidelines](https://developers.google.com/search/docs/specialty/ecommerce/pagination-and-incremental-page-loading).
7. **Dynamic Meta & Alternate Tags:** Dynamic `title`, `description`, `canonical`, Open Graph, and bidirectional `hreflang` annotations for `fa`, `de`, and `en`.
8. **Internal Link Hierarchy:** Homepage city badges link directly to city directory hubs; footer and category cards cross-link with SSR visibility.
9. **Indexation Control on Search Filters:** Faceted/custom search query URLs (`/businesses?...`) are tagged `noindex, follow` to prevent duplicate content, while curated directory paths (`/directory/...`) are fully indexable.
10. **Multilingual Sitemap with Reciprocal Alternates:** Sitemaps generate dynamic entries for all 3 locales with reciprocal alternates. Database failures fail safely rather than emitting a partial sitemap.
11. **Structured Data (Schema.org):** Implemented `CollectionPage`, `ItemList`, `BreadcrumbList`, and `LocalBusiness` schemas. Script-injection vulnerabilities in JSON-LD are strictly sanitized.
12. **Search Console Verification Support:** Configured `GOOGLE_SITE_VERIFICATION` environment support and production `NEXT_PUBLIC_APP_URL` validation.

---

## 4. Operational Best Practices for Growth

* **Data Accuracy First:** Regularly verify phone numbers, addresses, city names, and service languages directly with business owners. Deduplicate profiles and remove permanently closed venues.
* **Conversion-Driving Attributes:** Maintain high-signal attributes: restaurant menus and cuisine types; translator sworn status; doctor consultation languages; salon booking links.
* **Authentic Local Guides:** Expand high-performing city/specialty pages with unique, human-curated editorial guides including author attribution and review dates.
* **Core Web Vitals Monitoring:** Monitor real-user field data (LCP, INP, CLS) in Search Console and PageSpeed Insights post-release.

---

## 5. Deployment & Validation Checklist

1. Set `NEXT_PUBLIC_APP_URL` to the production HTTPS domain. Ensure canonical redirects (HTTP → HTTPS, non-www → www) at the proxy level.
2. Verify domain ownership in Google Search Console and submit `https://woyab.com/sitemap.xml`.
3. Test key page types (homepage, city hub, specialty hub, combination page, business detail) in the URL Inspection Tool to ensure proper indexing.
4. Validate rich snippets with Google's Rich Results Test.
5. Establish baseline tracking for impressions, clicks, CTR, and average position across 28-day comparison intervals.

**Test Commands:**  
Run SEO test suite: `node --test tests/seo.test.mjs` (inside `apps/frontend`).  
Verify HTTP responses and headers: `node scripts/verify-seo.mjs`.  
Re-audit competitor signals: `node scripts/audit-competitor-seo.mjs`.
