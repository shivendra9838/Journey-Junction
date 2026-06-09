import { expect, test } from "@playwright/test";

test("homepage and phase console render", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveTitle(/Wandr/);
  await page.goto("/phase1", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Wandr Phase 1 Console" })).toBeVisible();
});
