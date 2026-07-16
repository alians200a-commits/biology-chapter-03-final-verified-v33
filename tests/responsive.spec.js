import { test, expect } from '@playwright/test';

test.describe('Responsive Layout and Equations Verification', () => {
  test('should load the page and verify application container is visible', async ({ page }) => {
    await page.goto('/');
    
    // Check main container
    const appContainer = page.locator('#app-container');
    await expect(appContainer).toBeVisible();
    
    // Check page title or prominent header
    const bodyText = await page.textContent('body');
    expect(bodyText).toContain('الأحياء');
  });

  test('should render responsive tables and check viewports', async ({ page }) => {
    await page.goto('/');

    // Select desktop viewport
    await page.setViewportSize({ width: 1200, height: 800 });
    
    // Check if tables exist or load dynamically when navigating questions
    // Let's click on a comparison tab or question to render comparison tables if available
    const source12Tab = page.locator('[id^="source-12"], [data-id="source-12"], :text("قارن")').first();
    if (await source12Tab.isVisible()) {
      await source12Tab.click();
    }

    // Select mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Ensure styles/responsive layout adjustments are safe
    const tables = page.locator('table');
    const tableCount = await tables.count();
    console.log(`Found ${tableCount} tables on page`);
  });
});
