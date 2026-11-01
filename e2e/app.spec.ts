import { expect, test, type Page } from "@playwright/test";

const shots = process.env.SHOT_DIR;

async function snap(page: Page, name: string) {
  if (shots) await page.screenshot({ path: `${shots}/${name}.png`, fullPage: true });
}

function trackErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(e.message));
  return errors;
}

test("masks a .env file and restores the AI reply", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Unsaid" })).toBeVisible();
  await page.getByRole("button", { name: ".env file" }).click();
  const out = page.getByTestId("masked-output");
  await expect(out).toContainText("<GITHUB_TOKEN_1>");
  await expect(out).toContainText("<AWS_SECRET_KEY_1>");
  await expect(out).not.toContainText("ghp_");
  await expect(out).not.toContainText("sunflower-2003");
  await snap(page, "01-env-masked");

  await page.getByLabel("AI reply").fill(
    "Your build reads <OPENAI_KEY_1> from .env, but Next.js only exposes variables prefixed with NEXT_PUBLIC_ to the browser. Keep <OPENAI_KEY_1> server-side and email <EMAIL_1> if the key needs rotating.",
  );
  const restored = page.getByTestId("restored-output");
  await expect(restored).toContainText("sk-proj-" + "Jx8e2RkQ7vLm4NcT9aWb3YpZ6fHd1KsU0gEoAiBn5Cr");
  await expect(restored).toContainText("marcus.lee@budgetbuddy.app");
  await expect(page.getByText("3 values put back")).toBeVisible();
  await snap(page, "02-reply-restored");
  expect(errors).toEqual([]);
});

test("crash log keeps paths and IPs consistent", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Crash log" }).click();
  const out = page.getByTestId("masked-output");
  await expect(out).toContainText("/home/<USERNAME_1>/projects");
  await expect(out).toContainText("<STRIPE_KEY_1>");
  await expect(out).toContainText("<PASSWORD_1>@<IP_ADDRESS_1>");
  await page.getByRole("button", { name: "Unmask" }).first().click();
  await expect(page.getByRole("button", { name: "Hide" })).toHaveCount(1);
});

test("redacts a screenshot with OCR", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto("/");
  await page.getByRole("tab", { name: "Screenshot" }).click();
  await page.getByRole("button", { name: "Try a sample screenshot" }).click();
  await expect(page.getByText(/regions covered/)).toBeVisible({ timeout: 90_000 });
  const text = await page.locator(".shot-foot").innerText();
  expect(text).toContain("GitHub token");
  expect(text).toContain("Stripe key");
  await snap(page, "03-screenshot-redacted");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download redacted PNG" }).click();
  expect((await download).suggestedFilename()).toBe("redacted.png");
  expect(errors).toEqual([]);
});

test("on-device model finds names and places", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Support email" }).click();
  await page.getByLabel(/Detect names, companies and places/).check();
  const out = page.getByTestId("masked-output");
  await expect(out).toContainText("<PERSON_1>", { timeout: 90_000 });
  await expect(out).not.toContainText("Elena Petrova");
  await expect(out).toContainText("<CREDIT_CARD_1>");
  await snap(page, "04-names-masked");
  expect(errors).toEqual([]);
});

test("audits a ChatGPT export for leaked secrets", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto("/");
  await page.getByRole("tab", { name: "Audit my chats" }).click();
  await page.getByRole("button", { name: "Try a sample ChatGPT export" }).click();
  await expect(page.getByTestId("audit-secrets")).toHaveText("8");
  await expect(page.getByRole("link", { name: "Revoke on GitHub" })).toBeVisible();
  await expect(page.getByText("pasted 2 times")).toBeVisible();
  await snap(page, "05-audit");
  expect(errors).toEqual([]);
});
