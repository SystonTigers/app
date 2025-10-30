import { test, expect } from "@playwright/test";

test.describe("onboarding", () => {
  test("provisions a tenant happy path", async ({ page }) => {
    await page.route("**/api/tenants", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ status: "ready", tenantId: "syston-town-tigers" }),
      });
    });

    const basePath = process.env.WEB_BASE_URL || "http://localhost:3000";
    await page.goto(`${basePath}/onboarding`);

    await page.getByPlaceholder("Club name").fill("Syston Town Tigers");
    await page.getByPlaceholder("Tenant ID (slug)").fill("syston-town-tigers");
    await page.getByRole("button", { name: "Provision" }).click();

    await expect(page.getByText(/syston-town-tigers/i)).toBeVisible();
  });
});
