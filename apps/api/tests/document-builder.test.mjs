import assert from "node:assert/strict";
import test from "node:test";

import { buildBusinessDocument } from "../dist/modules/embeddings/document-builder.js";

test("buildBusinessDocument combines multilingual fields, categories, services, and location", () => {
  const business = {
    id: "biz-123",
    businessName: "رستوران زعفران",
    shortDescription: "بهترین کباب‌های ایرانی در برلین",
    description: "انواع غذاهای سنتی با برنج ایرانی و گوشت تازه حلال.",
    address: "Kantstraße 45",
    postalCode: "10625",
    translations: [
      {
        locale: "DE",
        businessName: "Restaurant Safran",
        shortDescription: "Traditionelle persische Küche in Berlin",
        description: "Frische persische Spezialitäten und Halal-Gerichte.",
      },
      {
        locale: "EN",
        businessName: "Safran Restaurant",
        shortDescription: "Authentic Persian restaurant in Berlin",
        description: "Finest kebabs and saffron rice dishes.",
      },
    ],
    category: {
      nameFa: "رستوران و کافه",
      nameEn: "Restaurants & Cafes",
      nameDe: "Restaurants & Cafés",
    },
    subCategory: {
      nameFa: "رستوران ایرانی",
      nameEn: "Persian Restaurant",
      nameDe: "Persisches Restaurant",
    },
    tags: [
      {
        tag: {
          nameFa: "کباب",
          nameEn: "Kebab",
          nameDe: "Kebab",
        },
      },
      {
        tag: {
          nameFa: "حلال",
          nameEn: "Halal",
          nameDe: "Halal",
        },
      },
    ],
    services: [
      {
        title: "کباب کوبیده",
        description: "همراه با چلو زعفرانی و گوجه کبابی",
      },
      {
        title: "سرو در محل",
        description: null,
      },
    ],
    city: {
      nameFa: "برلین",
      nameEn: "Berlin",
    },
    district: {
      nameFa: "شارلوتنبورگ",
      nameEn: "Charlottenburg",
    },
    attributes: [
      {
        value: "دارد",
        attribute: {
          labelFa: "اینترنت وای‌فای",
          labelEn: "Wi-Fi",
          labelDe: "WLAN",
        },
      },
    ],
  };

  const doc = buildBusinessDocument(business);

  assert.equal(doc.businessId, "biz-123");
  assert.equal(typeof doc.hash, "string");
  assert.equal(doc.hash.length, 64); // SHA-256 hex string

  // Names
  assert.ok(doc.text.includes("رستوران زعفران"));
  assert.ok(doc.text.includes("Restaurant Safran"));
  assert.ok(doc.text.includes("Safran Restaurant"));

  // Category & SubCategory
  assert.ok(doc.text.includes("دسته‌بندی: رستوران و کافه | Restaurants & Cafes | Restaurants & Cafés"));
  assert.ok(doc.text.includes("زیردسته: رستوران ایرانی | Persian Restaurant | Persisches Restaurant"));

  // Descriptions
  assert.ok(doc.text.includes("بهترین کباب‌های ایرانی در برلین"));
  assert.ok(doc.text.includes("Traditionelle persische Küche in Berlin"));
  assert.ok(doc.text.includes("Finest kebabs and saffron rice dishes."));

  // Services
  assert.ok(doc.text.includes("خدمات: کباب کوبیده: همراه با چلو زعفرانی و گوجه کبابی, سرو در محل"));

  // Tags
  assert.ok(doc.text.includes("تگ‌ها:"));
  assert.ok(doc.text.includes("کباب"));
  assert.ok(doc.text.includes("حلال"));

  // Attributes
  assert.ok(doc.text.includes("ویژگی‌ها: اینترنت وای‌فای: دارد"));

  // Location
  assert.ok(doc.text.includes("شهر: برلین / Berlin"));
  assert.ok(doc.text.includes("منطقه: شارلوتنبورگ / Charlottenburg"));
  assert.ok(doc.text.includes("آدرس: Kantstraße 45"));
  assert.ok(doc.text.includes("کد پستی: 10625"));
});

test("buildBusinessDocument handles minimal business record without crashing", () => {
  const minimal = {
    id: "biz-min",
    businessName: "مکانیک آریا",
    category: {
      nameFa: "خودرو",
      nameEn: "Automotive",
      nameDe: "Automobil",
    },
  };

  const doc = buildBusinessDocument(minimal);

  assert.equal(doc.businessId, "biz-min");
  assert.ok(doc.text.includes("مکانیک آریا"));
  assert.ok(doc.text.includes("دسته‌بندی: خودرو | Automotive | Automobil"));
  assert.equal(doc.hash.length, 64);
});

test("hash changes when business data changes and remains identical for same data", () => {
  const base = {
    id: "biz-1",
    businessName: "صرافی نور",
    category: { nameFa: "مالی", nameEn: "Financial", nameDe: "Finanzen" },
  };

  const doc1 = buildBusinessDocument(base);
  const doc2 = buildBusinessDocument({ ...base });
  assert.equal(doc1.hash, doc2.hash);

  const docModified = buildBusinessDocument({
    ...base,
    shortDescription: "انتقال فوری ارز به سراسر جهان",
  });
  assert.notEqual(doc1.hash, docModified.hash);
});
