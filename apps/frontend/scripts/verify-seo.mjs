import assert from 'node:assert/strict';
import { load } from 'cheerio';

const origin = process.env.SEO_TEST_ORIGIN || 'http://localhost:3000';
const checked = [];
async function page(path) {
  const response = await fetch(new URL(path, origin), { headers: { 'User-Agent': 'Googlebot' }, signal: AbortSignal.timeout(90000) });
  const html = await response.text();
  checked.push({ path, status: response.status });
  return { response, $: load(html), html };
}
function metadata($, path, locale, minimumDescriptionLength = 21) {
  assert.equal($('html').attr('lang'), locale);
  assert.equal($('h1').length, 1, path);
  assert.equal(new URL($('link[rel="canonical"]').attr('href')).pathname, path.split('?')[0]);
  assert.ok(($('meta[name="description"]').attr('content')?.trim().length ?? 0) >= minimumDescriptionLength, `Missing or unexpectedly short description: ${path}`);
  for (const lang of ['de', 'en', 'fa', 'x-default']) assert.equal($(`link[hreflang="${lang}"]`).length, 1);
  $('script[type="application/ld+json"]').each((_, element) => assert.doesNotThrow(() => JSON.parse($(element).text())));
}

for (const locale of ['fa', 'de', 'en']) {
  const home = await page(`/${locale}`);
  assert.equal(home.response.status, 200);
  metadata(home.$, `/${locale}`, locale);
  const { response, $ } = await page(`/${locale}/directory`);
  assert.equal(response.status, 200);
  metadata($, `/${locale}/directory`, locale);
  const links = $('a[href*="/directory/"]').map((_, element) => $(element).attr('href')).get();
  for (const kind of ['cities', 'categories', 'specialties']) {
    const path = links.find((href) => href.includes(`/directory/${kind}/`));
    if (!path) continue;
    const result = await page(path);
    assert.equal(result.response.status, 200);
    metadata(result.$, path, locale);
    assert.ok(result.$('article a[href*="/businesses/"]').length > 0, path);
    const data = result.$('script[type="application/ld+json"]').map((_, el) => JSON.parse(result.$(el).text())).get();
    const list = data.find((item) => item['@type'] === 'CollectionPage').mainEntity;
    assert.equal(list.itemListElement.length, result.$('article').length);
    if (locale === 'fa' && kind !== 'cities') {
      const intersection = result.$(`a[href*="/directory/${kind}/"]`).map((_, el) => result.$(el).attr('href')).get().find((href) => href.split('/').length === 6);
      if (intersection) {
        const local = await page(intersection);
        assert.equal(local.response.status, 200);
        metadata(local.$, intersection, locale);
        assert.ok(local.$('article').length >= 3);
      }
      const profilePath = result.$('article a[href*="/businesses/"]').first().attr('href');
      const profile = await page(profilePath);
      assert.equal(profile.response.status, 200);
      // Existing business descriptions may legitimately be short; landing-page
      // editorial copy still has the stricter length check above.
      metadata(profile.$, profilePath, locale, 1);
    }
    const next = result.$('a[href$="?page=2"]').first().attr('href');
    if (next) {
      const second = await page(next);
      assert.equal(second.response.status, 200);
      assert.equal(new URL(second.$('link[rel="canonical"]').attr('href')).search, '?page=2');
      assert.notEqual(second.$('article a[href*="/businesses/"]').first().attr('href'), result.$('article a[href*="/businesses/"]').first().attr('href'));
    }
  }
}
for (const path of ['/fa/directory/cities/nonexistent-seo-test', '/fa/directory/cities/berlin?page=0', '/fa/directory/cities/berlin?page=99999']) {
  const { response, $ } = await page(path);
  assert.equal(response.status, 404, path);
  assert.match($('meta[name="robots"]').map((_, el) => $(el).attr('content')).get().join(','), /noindex/);
}
const filtered = await page('/fa/businesses?search=seo-test-nonexistent');
assert.match(filtered.$('meta[name="robots"]').attr('content'), /noindex/);
const { response, html } = await page('/sitemap.xml');
assert.equal(response.status, 200);
const xml = load(html, { xmlMode: true });
const urls = xml('url > loc').map((_, el) => xml(el).text()).get();
assert.ok(urls.length < 50000, 'Split sitemap before reaching the protocol limit');
assert.equal(new Set(urls).size, urls.length);
for (const locale of ['fa', 'de', 'en']) assert.ok(urls.some((url) => new URL(url).pathname === `/${locale}/directory`));
xml('url').each((_, el) => assert.equal(xml(el).find('xhtml\\:link').length, 4));
console.log(JSON.stringify({ passed: true, checks: checked, sitemapUrls: urls.length }, null, 2));
