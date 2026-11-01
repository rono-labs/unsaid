import { readFileSync } from "node:fs";
import { chromium, expect, test } from "@playwright/test";

const extension = new URL("../dist-extension", import.meta.url).pathname;
const chat = readFileSync(new URL("./fixtures/chat.html", import.meta.url), "utf8");
const key = "ghp_" + "8fK2mQ9xLr4TzW7bN1cVyP3sD6hJ0aGeU5oR";

test("extension masks a paste on chatgpt.com and restores the reply", async ({}, testInfo) => {
  const context = await chromium.launchPersistentContext(testInfo.outputPath("profile"), {
    executablePath: process.env.CHROMIUM_PATH || undefined,
    headless: true,
    args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`, "--no-sandbox", "--disable-gpu"],
  });
  await context.route("https://chatgpt.com/**", (route) => route.fulfill({ contentType: "text/html", body: chat }));
  const page = await context.newPage();
  await page.goto("https://chatgpt.com/");
  await page.waitForTimeout(500);

  const pasted = `GITHUB_TOKEN=${key}\nowner: dana@acme.io`;
  await page.locator("#prompt").evaluate((el, text) => {
    const data = new DataTransfer();
    data.setData("text/plain", text);
    el.dispatchEvent(new ClipboardEvent("paste", { clipboardData: data, bubbles: true, cancelable: true }));
  }, pasted);

  await expect(page.locator("#prompt")).toHaveText("GITHUB_TOKEN=<GITHUB_TOKEN_1>\nowner: <EMAIL_1>");
  await expect(page.getByText("Unsaid hid 2 items")).toBeVisible();

  await page.locator("#send").click();
  await expect(page.locator(".assistant")).toHaveText(`Rotate ${key} and tell dana@acme.io.`);
  await expect(page.locator(".user")).toHaveText("GITHUB_TOKEN=<GITHUB_TOKEN_1>\nowner: <EMAIL_1>");
  if (process.env.SHOT_DIR) await page.screenshot({ path: `${process.env.SHOT_DIR}/06-extension-mock.png` });
  await context.close();
});
