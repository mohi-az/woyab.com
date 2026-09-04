import assert from "node:assert/strict";
import test from "node:test";

import {
  shouldShowBusinessGallery,
  shouldShowBusinessRatings,
} from "../dist/index.js";

test("medical ratings are hidden except for pharmacies", () => {
  assert.equal(shouldShowBusinessRatings("medical", "general-practitioner"), false);
  assert.equal(shouldShowBusinessRatings("medical", null), false);
  assert.equal(shouldShowBusinessRatings("medical", "pharmacy"), true);
  assert.equal(shouldShowBusinessRatings("restaurants-cafes", null), true);
});

test("medical galleries are hidden", () => {
  assert.equal(shouldShowBusinessGallery("medical"), false);
  assert.equal(shouldShowBusinessGallery("restaurants-cafes"), true);
});
