import assert from "node:assert/strict";
import test from "node:test";

import {
  embedDocument,
  embedQuery,
  embedDocumentBatch,
} from "../dist/modules/embeddings/gemini-embedding.js";

test("gemini-embedding: embedDocument sends correct payload and extracts vector", async () => {
  const originalFetch = globalThis.fetch;
  let interceptedUrl = "";
  let interceptedOptions = {};

  globalThis.fetch = async (url, options) => {
    interceptedUrl = String(url);
    interceptedOptions = options;
    return {
      ok: true,
      json: async () => ({
        embedding: {
          values: new Array(768).fill(0.123),
        },
      }),
    };
  };

  try {
    const vector = await embedDocument("رستوران زعفران در برلین", "test-api-key-123");

    assert.equal(vector.length, 768);
    assert.equal(vector[0], 0.123);

    assert.ok(interceptedUrl.includes(":embedContent"));
    assert.equal(interceptedOptions.headers["x-goog-api-key"], "test-api-key-123");

    const body = JSON.parse(interceptedOptions.body);
    assert.equal(body.taskType, "RETRIEVAL_DOCUMENT");
    assert.equal(body.outputDimensionality, 768);
    assert.equal(body.content.parts[0].text, "رستوران زعفران در برلین");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("gemini-embedding: embedQuery uses RETRIEVAL_QUERY taskType", async () => {
  const originalFetch = globalThis.fetch;
  let interceptedBody = {};

  globalThis.fetch = async (_url, options) => {
    interceptedBody = JSON.parse(options.body);
    return {
      ok: true,
      json: async () => ({
        embedding: {
          values: new Array(768).fill(0.555),
        },
      }),
    };
  };

  try {
    const vector = await embedQuery("کباب کوبیده در برلین", "test-api-key-123");

    assert.equal(vector.length, 768);
    assert.equal(interceptedBody.taskType, "RETRIEVAL_QUERY");
    assert.equal(interceptedBody.outputDimensionality, 768);
    assert.equal(interceptedBody.content.parts[0].text, "کباب کوبیده در برلین");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("gemini-embedding: embedDocumentBatch sends batchEmbedContents and combines results", async () => {
  const originalFetch = globalThis.fetch;
  let interceptedUrl = "";
  let interceptedBody = {};

  globalThis.fetch = async (url, options) => {
    interceptedUrl = String(url);
    interceptedBody = JSON.parse(options.body);
    return {
      ok: true,
      json: async () => ({
        embeddings: [
          { values: new Array(768).fill(0.1) },
          { values: new Array(768).fill(0.2) },
        ],
      }),
    };
  };

  try {
    const vectors = await embedDocumentBatch(
      ["متن اول", "متن دوم"],
      "test-api-key-123",
    );

    assert.equal(vectors.length, 2);
    assert.equal(vectors[0].length, 768);
    assert.equal(vectors[1].length, 768);
    assert.ok(interceptedUrl.includes(":batchEmbedContents"));
    assert.equal(interceptedBody.requests.length, 2);
    assert.equal(interceptedBody.requests[0].taskType, "RETRIEVAL_DOCUMENT");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("gemini-embedding: throws descriptive error on API failure", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () => ({
    ok: false,
    status: 400,
    text: async () => JSON.stringify({
      error: {
        code: 400,
        message: "Invalid API key provided",
        status: "INVALID_ARGUMENT",
      },
    }),
  });

  try {
    await assert.rejects(
      async () => {
        await embedQuery("test query", "invalid-key");
      },
      /Gemini embedQuery failed \(400\): Invalid API key provided/,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
