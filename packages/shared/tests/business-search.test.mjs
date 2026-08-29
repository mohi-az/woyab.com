import assert from "node:assert/strict";
import test from "node:test";

import { businessMapBodySchema, businessSearchBodySchema } from "../dist/index.js";

const baseSearch = {
  page: 1,
  limit: 9,
  locale: "fa",
};

test("business directory accepts the three public sort modes", () => {
  for (const sortBy of ["latest", "oldest", "popular"]) {
    const result = businessSearchBodySchema.parse({ ...baseSearch, sortBy });
    assert.equal(result.sortBy, sortBy);
  }
});

test("distance sorting still requires an origin", () => {
  assert.equal(
    businessSearchBodySchema.safeParse({ ...baseSearch, sortBy: "distance" }).success,
    false,
  );
});

test("business discovery accepts multiple tag filters", () => {
  const tagIds = [3, 8, 13];

  assert.deepEqual(
    businessSearchBodySchema.parse({ ...baseSearch, tagIds }).tagIds,
    tagIds,
  );
  assert.deepEqual(
    businessMapBodySchema.parse({ locale: "fa", tagIds }).tagIds,
    tagIds,
  );
});

test("business discovery rejects invalid or unbounded tag filters", () => {
  assert.equal(
    businessSearchBodySchema.safeParse({ ...baseSearch, tagIds: [0] }).success,
    false,
  );
  assert.equal(
    businessMapBodySchema.safeParse({
      locale: "fa",
      tagIds: Array.from({ length: 101 }, (_, index) => index + 1),
    }).success,
    false,
  );
});
