import { test, expect } from "@playwright/test";

test.describe("Pricing and trial copy", () => {
  test("home pricing names Pulse and Progress only", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Pulse").first()).toBeVisible();
    await expect(page.getByText("Progress").first()).toBeVisible();
    await expect(page.getByText("Mastery")).toHaveCount(0);
    await expect(page.getByText("Free tracks. Paid thinks.")).toBeVisible();
  });

  test("signup shows reverse-trial promise", async ({ page }) => {
    await page.goto("/signup");
    await expect(
      page.getByText(/7 days of Progress included/i),
    ).toBeVisible();
  });
});
