import { test, expect } from '@playwright/test';

test.describe('Tenant Page', () => {
    const tenantSlug = 'syston-tigers';

    test('should load tenant page successfully', async ({ page }) => {
        await page.goto(`/${tenantSlug}`);

        // Wait for page to load
        await expect(page).toHaveTitle(/Syston Tigers/i);

        // Check for main content
        await expect(page.locator('body')).toBeVisible();
    });

    test('should display fixtures section', async ({ page }) => {
        await page.goto(`/${tenantSlug}`);

        // Look for fixtures heading or section
        const fixturesSection = page.getByRole('heading', { name: /fixtures|upcoming|matches/i });
        await expect(fixturesSection).toBeVisible();
    });

    test('should display next fixture prominently', async ({ page }) => {
        await page.goto(`/${tenantSlug}`);

        // Wait for content to load
        await page.waitForLoadState('networkidle');

        // Check if there's fixture information visible
        // This is a flexible check - adjust based on your actual UI
        const hasFixtureInfo = await page.locator('text=/vs|@|home|away/i').count() > 0;
        expect(hasFixtureInfo).toBeTruthy();
    });

    test('should navigate within tenant page', async ({ page }) => {
        await page.goto(`/${tenantSlug}`);

        // Wait for page to be interactive
        await page.waitForLoadState('domcontentloaded');

        // Check that we're on the correct tenant page
        expect(page.url()).toContain(tenantSlug);
    });

    test('should handle missing tenant gracefully', async ({ page }) => {
        const response = await page.goto('/non-existent-tenant-xyz');

        // Should either show 404 page or redirect
        // Adjust based on your error handling strategy
        const is404 = response?.status() === 404;
        const hasErrorMessage = await page.locator('text=/not found|error|404/i').count() > 0;

        expect(is404 || hasErrorMessage).toBeTruthy();
    });

    test('should be responsive on mobile', async ({ page }) => {
        // Set mobile viewport
        await page.setViewportSize({ width: 375, height: 667 });

        await page.goto(`/${tenantSlug}`);

        // Check page loads on mobile
        await expect(page.locator('body')).toBeVisible();

        // Verify no horizontal scroll
        const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
        const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
        expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1); // +1 for rounding
    });
});
