# Unsaid

Ask the AI anything without handing it your secrets.

![Unsaid masking an .env file and restoring the AI's reply](docs/hero.png)

**Demo video:** {{video_url}}

## What it does

- Finds API keys, passwords, tokens, emails, phone numbers, card numbers, IPs and OS usernames in anything you paste: logs, stack traces, `.env` files, emails, chat messages.
- Swaps each one for a stable placeholder like `<GITHUB_TOKEN_1>`, so ChatGPT, Claude or Gemini can still reason about the text ("`<PASSWORD_1>` is wrong for `<IP_ADDRESS_1>`").
- Paste the AI's reply back and Unsaid puts your real values back in, only on your screen.
- Redacts screenshots: reads the text with on-device OCR and covers each secret with a labeled box, ready to download.
- Audits your ChatGPT or Claude data export: lists every key you already pasted into a chat, which chats, when, and a link to revoke it.
- Chrome extension: masks what you paste straight into ChatGPT, Claude or Gemini and swaps the placeholders in the replies back to your real values, in place.
- Optional on-device language model (DistilBERT NER) to hide names, companies and places.
- Runs entirely in the browser tab. No account, no server, no analytics. The header shows a live count of requests to other sites.

## Try it

Live demo: {{live_url}}

Fastest path: click **.env file** under step 1, then paste this into step 2:

```
Keep <OPENAI_KEY_1> server-side and email <EMAIL_1> if it needs rotating.
```

The restored panel shows the real key and email. For screenshots, open the **Screenshot** tab and click **Try a sample screenshot**. For the audit, open **Audit my chats** and click **Try a sample ChatGPT export** (14 synthetic chats, 8 leaked keys).

Chrome extension: download `unsaid-extension.zip` from the app header (or run `npm run build` and use `dist-extension/`), unzip it, open `chrome://extensions`, turn on Developer mode, click **Load unpacked** and pick the folder. Paste a `.env` file into ChatGPT and watch the toast.

Run it locally (Node 20+):

```bash
npm install
npm run fetch-model   # optional: serve the 66 MB NER model from your own origin instead of Hugging Face
npm run dev           # http://localhost:5173
```

## How it works

```
paste ──► 46 rules, 32 data types (prefixes, checksums, context) ───┐
      └─► DistilBERT NER in a Web Worker (optional) ───────────────────┼─► resolve overlaps ─► Vault ─► masked text
image ──► Tesseract OCR (grayscale, invert, 2x) ─► same detectors ─────┘                       │
AI reply ─────────────────────────────────────────────────────────────────────────────────────► restore
chat export (.zip/.json) ─► your messages only ─► same detectors ─► grouped by value, ranked, revoke links
```

- **Detectors** (`src/core/rules.ts`): provider-specific key formats (AWS, GitHub, Stripe, OpenAI, Anthropic, Slack, Google, Hugging Face, npm, SendGrid, Twilio and more), context rules for `password=`, `--token`, `Authorization:`, cookies, connection strings and URL query secrets, plus Luhn (cards), mod-97 (IBAN), SSN ranges and IPv4/IPv6 validation. A Shannon-entropy fallback catches unknown tokens while skipping git SHAs, UUIDs, hashes and base64 images.
- **Vault** (`src/core/mask.ts`): each distinct value gets one placeholder per session, so the same key is always `<STRIPE_KEY_1>`. Restore tolerates the ways models rewrite placeholders (`[EMAIL_1]`, `EMAIL_1`, `&lt;EMAIL_1&gt;`). The vault and your text live in `sessionStorage` (plain text, this tab only) and disappear when you close the tab or press Clear.
- **Names** (`src/workers/ner.worker.ts`): Transformers.js runs a quantized DistilBERT NER model on ONNX Runtime Web, off the main thread.
- **Audit** (`src/core/audit.ts`): parses ChatGPT (`mapping` tree) and Claude (`chat_messages`) exports, unzips in the browser with fflate, scans only user messages, and groups each leaked value with its chats and first/last dates.
- **Extension** (`src/extension/content.ts`): a content script catches the paste event in the chat box, masks with the same core, and re-dispatches the masked text so the site's editor inserts it normally. A MutationObserver restores placeholders in new messages by editing text nodes in place, and the CSS Custom Highlight API tints restored values without touching the site's DOM structure. The vault sits in `chrome.storage.session`, which is memory-only. Ctrl+Shift+V pastes unmasked.
- **Screenshots** (`src/lib/ocr.ts`): Tesseract.js reads words with bounding boxes, words split by OCR are re-joined by pixel gap, and findings map back to boxes drawn on a canvas.

### Accuracy

Measured on three synthetic corpora (`bench/`), 150 cases in total. Each was produced by its own generator script, written without access to the detector source or the other corpora. They contain real-looking fake secrets plus decoys: git SHAs, UUIDs, package-lock hashes, CSP nonces, SSH public keys, version numbers, placeholders, Luhn-failing card numbers.

| Set | Cases | Precision | Recall |
|---|---|---|---|
| Final held-out set, first run, rules only | 50 | 0.954 | 0.954 |
| Second set, first run, rules only | 60 | 0.949 | 0.926 |
| All three after fixing the error classes found (rules only) | 150 | 1.000 | 0.991 |
| Second set with names via NER | 60 | 0.905 | 0.950 |

The first-run rows are the honest estimate for text it has never seen. Names are the weakest category (PERSON recall 13 of 20). The 1.000 row shows the misses were general error classes, not tuning to individual cases, but those sets are no longer unseen.

```bash
npm run bench                         # rule detectors on both corpora
npm run fetch-model && npm run bench  # also scores rules + NER
```

## Built with

TypeScript, React 19, Vite, Transformers.js (ONNX Runtime Web), Tesseract.js, fflate, Vitest, Playwright. NER model: [dslim/distilbert-NER](https://huggingface.co/dslim/distilbert-NER) via [onnx-community/distilbert-NER-ONNX](https://huggingface.co/onnx-community/distilbert-NER-ONNX).

## License

MIT. See [LICENSE](LICENSE).

## Development

```bash
npm test             # unit tests and benchmark
npm run fetch-model  # the NER end-to-end test uses the locally served model
npm run build        # static site in dist/, deploy to any static host
npx playwright test  # end-to-end tests against the production build
```

See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for the project layout and deployment notes.
