import assert from "node:assert/strict";
import { test } from "node:test";

import {
  decodeInlineImage,
  encodeInlineImage,
  isInlineImage,
} from "../src/lib/inline-image";

test("reconoce y redondea una foto inline", () => {
  const bytes = Uint8Array.from([1, 2, 3, 4, 255]);
  const encoded = encodeInlineImage(bytes, "image/jpeg");
  assert.equal(isInlineImage(encoded), true);
  const decoded = decodeInlineImage(encoded);
  assert.ok(decoded);
  assert.equal(decoded.contentType, "image/jpeg");
  assert.deepEqual([...decoded.body], [...bytes]);
});

test("rechaza rutas de disco", () => {
  assert.equal(isInlineImage("12/2026-10-15/reportImage-abc.jpg"), false);
  assert.equal(decodeInlineImage("12/2026-10-15/reportImage-abc.jpg"), null);
});
