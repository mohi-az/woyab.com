import { load } from 'cheerio';
import { writeFile } from 'node:fs/promises';

// Public pages only. This records on-page signals, not rankings or traffic estimates.
const urls = ['https://mineed.net/', 'https://risman.de/', 'https://nationsbase.com/fa', 'https://www.abhavij.com/', 'https://mainja.com/fa', 'https://nazdikia.com/', 'https://www.kojast.de/'];
const results = [];
for (const url of urls) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
    const html = await response.text();
    const $ = load(html);
    results.push({ url, finalUrl: response.url, status: response.status,
      title: $('title').text().trim(), description: $('meta[name="description"]').attr('content'),
      keywords: $('meta[name="keywords"]').attr('content'),
      robots: $('meta[name="robots"]').attr('content'), canonical: $('link[rel="canonical"]').attr('href'),
      lang: $('html').attr('lang'), h1: $('h1').map((_, el) => $(el).text().trim()).get(),
      h2: $('h2').map((_, el) => $(el).text().trim()).get().slice(0, 15),
      alternates: $('link[hreflang]').map((_, el) => ({ lang: $(el).attr('hreflang'), href: $(el).attr('href') })).get(),
      structuredDataTypes: $('script[type="application/ld+json"]').map((_, el) => {
        try { return JSON.stringify(JSON.parse($(el).text())).match(/"@type":"[^"]+"/g) ?? []; } catch { return ['invalid JSON']; }
      }).get(),
    });
  } catch (error) { results.push({ url, error: String(error) }); }
}
await writeFile(new URL('../../../reports/seo-competitor-signals.json', import.meta.url), JSON.stringify({ checkedAt: new Date().toISOString(), results }, null, 2));
console.log(JSON.stringify(results, null, 2));
