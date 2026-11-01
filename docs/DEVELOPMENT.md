# Development

## Layout

```
src/core/        detection, masking and restore (pure TypeScript, no DOM)
  rules.ts       detectors and type labels
  validators.ts  Luhn, IBAN mod-97, IP checks, entropy, placeholder filter
  detect.ts      runs rules, entropy fallback, custom terms, overlap resolution, OCR prefix repair
  mask.ts        Vault (value <-> placeholder), mask, restore
  ner.ts         chunking and token-to-entity merging for the NER model
src/workers/     NER Web Worker (Transformers.js)
src/lib/         OCR (Tesseract.js), worker client, session storage
src/components/  React UI
bench/           blind-written corpora, scorer, benchmark tests
e2e/             Playwright tests against a production build
scripts/         runtime asset copy (ONNX Runtime and Tesseract files), model download, sample image
public/tessdata/ English Tesseract model (tessdata_fast, gzipped)
```

## Runtime assets

`vite.config.ts` copies the ONNX Runtime and Tesseract worker files from `node_modules` into `public/vendor/` on every dev or build run, so the app never loads code from a CDN. `npm run fetch-model` saves the NER model to `public/models/`. When those files exist the worker loads them from the same origin. Otherwise it downloads the model from Hugging Face once and the browser caches it.

`.npmrc` sets `ignore-scripts=true`, so `npm install` runs no package install scripts.

## Deploy

`npm run build` writes a static site to `dist/` (about 92 MB with the bundled model, 28 MB without). Any static host works. For a sub-path, build with `BASE_PATH=/unsaid/ npm run build`. Set `VITE_REPO_URL` at build time to show the source link in the footer.

## Tests

```bash
npm test                        # unit tests + benchmark (NER benchmark runs only if the model is downloaded)
npm run build && npx playwright test   # browser tests: masking, restore, OCR, NER
```

If Playwright's bundled browser isn't installed, point it at a local Chromium with `CHROMIUM_PATH=/path/to/chromium`.
