import { readFileSync } from "node:fs";
import { chromium } from "@playwright/test";

const svg = readFileSync(new URL("../public/favicon.svg", import.meta.url), "utf8");
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ["--no-sandbox", "--disable-gpu"] });
const page = await browser.newPage({ viewport: { width: 128, height: 128 } });
await page.setContent(`<body style="margin:0;background:transparent">${svg.replace('width="40" height="40"', 'width="128" height="128"')}</body>`);
await page.screenshot({ path: new URL("../extension/icon-128.png", import.meta.url).pathname, omitBackground: true });
await browser.close();
console.log("wrote extension/icon-128.png");
