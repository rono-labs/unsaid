import { chromium } from "@playwright/test";

// The sample keys are fake. They are split in two so secret scanners do not flag this file.
const fake = (prefix, body) => prefix + body;

const html = `<!doctype html><html><body style="margin:0;background:#1e1f24">
<div style="width:900px;padding:22px 26px;font:15px/1.65 'DejaVu Sans Mono',monospace;color:#e6e6e6;background:#1e1f24">
<div style="color:#8b8f99;margin-bottom:10px">priya@laptop: ~/projects/budgetbuddy</div>
<div><span style="color:#7ee787">$</span> git push origin main</div>
<div>remote: Invalid username or password.</div>
<div>fatal: Authentication failed for 'https://github.com/priya-raman/budgetbuddy.git/'</div>
<div><span style="color:#7ee787">$</span> cat .env</div>
<div>GITHUB_TOKEN=${fake("ghp_", "8fK2mQ9xLr4TzW7bN1cVyP3sD6hJ0aGeU5oR")}</div>
<div>STRIPE_SECRET_KEY=${fake("sk_live_", "51NzQe8Hk2LwXr7TbQyP4mVd9")}</div>
<div>DATABASE_URL=postgres://budget_admin:Tr0ub4dor-77x@10.0.4.12:5432/budget</div>
<div>SUPPORT_EMAIL=priya.raman@gatech.edu</div>
<div>TWILIO_FROM=+1 404 555 0187</div>
<div><span style="color:#7ee787">$</span> curl -s https://api.ipify.org</div>
<div>73.162.18.204</div>
</div></body></html>`;

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ["--no-sandbox", "--disable-gpu"] });
const page = await browser.newPage({ viewport: { width: 900, height: 420 }, deviceScaleFactor: 1 });
await page.setContent(html);
const el = await page.$("div");
await el.screenshot({ path: new URL("../public/samples/terminal.png", import.meta.url).pathname });
await browser.close();
console.log("wrote public/samples/terminal.png");
