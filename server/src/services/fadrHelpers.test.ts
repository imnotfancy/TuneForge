import test from "node:test";
import assert from "node:assert/strict";

import {
  extractAssetIds,
  getAssetId,
  getMidiStemType,
  normalizeStemType,
} from "./fadrHelpers.ts";

test("normalizes Fadr stem labels to TuneForge stem types", () => {
  assert.equal(normalizeStemType("melodies"), "melody");
  assert.equal(normalizeStemType("Main Vocals"), "vocals");
  assert.equal(normalizeStemType("instrumental"), "instrumental");
  assert.equal(normalizeStemType("piano"), "melody");
  assert.equal(normalizeStemType("unknown noise"), null);
});

test("extracts asset ids from strings and Fadr asset objects", () => {
  assert.deepEqual(
    extractAssetIds([
      "stem-string-id",
      { _id: "asset-id" },
      { id: "public-id" },
      null,
      { name: "missing-id" },
    ]),
    ["stem-string-id", "asset-id", "public-id"],
  );
});

test("reads either _id or id from Fadr assets", () => {
  assert.equal(
    getAssetId({ _id: "internal-id", id: "public-id" }),
    "internal-id",
  );
  assert.equal(getAssetId({ id: "public-id" }), "public-id");
  assert.equal(getAssetId({ name: "no id" }), null);
});

test("maps Fadr midi assets back to matching stem types", () => {
  assert.equal(getMidiStemType({ name: "song-vocals-midi.mid" }), "vocals");
  assert.equal(getMidiStemType({ metaData: { stemType: "bass" } }), "bass");
  assert.equal(getMidiStemType({ name: "Chord Progression.mid" }), "chords");
  assert.equal(getMidiStemType({ name: "unrelated.mid" }), null);
});
