#!/usr/bin/env node

/*
  CLI untuk membuat API key baru untuk naze-sosdown.

  Pemakaian:
    node scripts/generate-api-key.mjs [--prefix naze]

  Key yang dihasilkan berformat: <prefix>-<tanggal>-<random hex>.
  Tambahkan key tersebut ke environment variable API_KEYS (dipisah koma
  bila lebih dari satu) lalu aktifkan mode terproteksi dengan
  REQUIRE_API_KEY=true.
*/

import { randomBytes } from "node:crypto";

const args = process.argv.slice(2);
const prefixIndex = args.indexOf("--prefix");
const prefix = prefixIndex !== -1 && args[prefixIndex + 1] ? args[prefixIndex + 1] : "naze";

const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
const random = randomBytes(12).toString("hex");

console.log(`${prefix}-${stamp}-${random}`);
