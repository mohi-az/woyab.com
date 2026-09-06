import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const compiled = ts.transpileModule(readFileSync(new URL('../lib/directory-route-filters.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const loaded = { exports: {} };
new Function('exports', compiled)(loaded.exports);
const { filtersFromSearchParams, filtersQuery, applyDirectoryDefaults, directoryRouteQuery, matchesDirectoryScope } = loaded.exports;
const read = (query, defaults) => {
  const params = new URLSearchParams(query);
  return applyDirectoryDefaults(filtersFromSearchParams(params, 9), params, defaults);
};
const write = (filters, defaults) => directoryRouteQuery(filtersQuery(filters), filters, defaults);

test('a city URL keeps its city across hydration and pagination without query duplication', () => {
  const defaults = { cityId: 1 };
  const initial = read('', defaults);
  assert.equal(initial.cityId, 1);
  assert.equal(write(initial, defaults), '');
  const second = { ...initial, page: 2 };
  assert.equal(write(second, defaults), 'page=2');
  assert.deepEqual(read(write(second, defaults), defaults), second);
});

test('cleared specialty filters stay cleared after reload and browser history navigation', () => {
  const defaults = { cityId: 1, categoryId: 8, subCategoryId: 3 };
  const initial = read('', defaults);
  const reset = { ...initial, categoryId: undefined, subCategoryId: undefined };
  const query = write(reset, defaults);
  assert.equal(new URLSearchParams(query).get('categoryId'), '0');
  assert.equal(new URLSearchParams(query).get('subCategoryId'), '0');
  assert.deepEqual(read(query, defaults), reset);
  assert.equal(matchesDirectoryScope(reset, defaults), false);
  assert.equal(matchesDirectoryScope(read('', defaults), defaults), true);
});

test('city changes, open-now, sorting and repeated tags survive URL round trips', () => {
  const defaults = { cityId: 1 };
  const filters = { ...read('', defaults), cityId: 2, tagIds: [4, 5], openNow: true, sortBy: 'latest' };
  assert.deepEqual(read(write(filters, defaults), defaults), filters);
  const clearedCity = { ...filters, cityId: undefined };
  assert.deepEqual(read(write(clearedCity, defaults), defaults), clearedCity);
});

test('the original businesses query format is unchanged without a landing route', () => {
  const filters = read('cityId=1&categoryId=8&page=2');
  assert.equal(write(filters), 'categoryId=8&cityId=1&page=2');
  assert.deepEqual(read(write(filters)), filters);
});
