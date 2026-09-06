import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import ts from 'typescript';

const filename = new URL('../lib/directory-seo.ts', import.meta.url);
const compiled = ts.transpileModule(readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const loaded = { exports: {} };
new Function('require', 'module', 'exports', compiled)(createRequire(import.meta.url), loaded, loaded.exports);
const { directoryPage, paginatedPath, serializeJsonLd, topicTitle, topicDescription } = loaded.exports;

test('JSON-LD preserves user text without permitting script injection', () => {
  const payload = { name: '</script><script>alert(1)</script>', nested: { text: '<!-- فارسی' } };
  const encoded = serializeJsonLd(payload);
  assert.equal(encoded.includes('<'), false);
  assert.deepEqual(JSON.parse(encoded), payload);
});

test('pagination rejects malformed and unbounded offsets', () => {
  assert.equal(directoryPage(undefined), 1);
  assert.equal(directoryPage('2'), 2);
  for (const value of ['0', '-1', '1.5', '1e3', '02', 'Infinity', '100001', ['2'], '']) {
    assert.equal(directoryPage(value), null, String(value));
  }
  assert.equal(paginatedPath('/directory/cities/berlin', 1), '/directory/cities/berlin');
  assert.equal(paginatedPath('/directory/cities/berlin', 2), '/directory/cities/berlin?page=2');
});

test('local titles describe the actual specialty and city in each language', () => {
  const topic = { kind: 'specialties', nameFa: 'دندانپزشک', nameDe: 'Zahnärzte', nameEn: 'Dentists', city: { nameFa: 'برلین', nameEn: 'Berlin' }, count: 4 };
  assert.equal(topicTitle(topic, 'fa'), 'دندانپزشک فارسی‌زبان در برلین');
  assert.equal(topicTitle(topic, 'de'), 'Zahnärzte in Berlin – persischsprachig');
  assert.equal(topicTitle(topic, 'en'), 'Dentists in Berlin – Persian-speaking');
  assert.match(topicDescription(topic, 'de'), /4 Einträge/);
  assert.doesNotMatch(topicTitle(topic, 'fa'), /بهترین/);
});
