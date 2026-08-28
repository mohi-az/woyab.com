import assert from "node:assert/strict";
import test from "node:test";

import { businessSearchBodySchema } from "../dist/index.js";

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
