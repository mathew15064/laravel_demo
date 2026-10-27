import { test, expect } from '@playwright/test';

test.describe('Paradise Gods (Thiên Đường Quần Đảo) E2E Tests', () => {

    test('First-time visitor sees cinematic God welcome modal and registers persistent identity', async ({ page }) => {
        await page.goto('/');

        // 1. Verify canvas container is present
        const canvasContainer = page.locator('#game-canvas-container');
        await expect(canvasContainer).toBeVisible();

        // 2. Welcome overlay should be visible for new visitor
        const welcomeOverlay = page.locator('#god-welcome-overlay');
        await expect(welcomeOverlay).toBeVisible();
        await expect(welcomeOverlay).toContainText('Chào mừng vị thần đã đến với Quần Đảo Thiên Đường');

        // 3. Register God name
        await page.fill('#god-name-input', 'Thần Poseidon');
        await page.click('#god-welcome-submit-btn');

        // 4. Overlay fades out and HUD becomes visible with God name
        await expect(welcomeOverlay).toBeHidden({ timeout: 5000 });
        const hudName = page.locator('#hud-god-name');
        await expect(hudName).toBeVisible();
        await expect(hudName).toContainText('Thần Poseidon');

        // 5. Verify persistent UUID stored in localStorage
        const storedUuid = await page.evaluate(() => localStorage.getItem('paradise_god_uuid'));
        expect(storedUuid).toBeTruthy();
        expect(storedUuid.length).toBeGreaterThan(10);
    });

    test('Returning God is recognized and greeted without new registration', async ({ page }) => {
        // Register first
        await page.goto('/');
        await page.fill('#god-name-input', 'Thần Sấm');
        await page.click('#god-welcome-submit-btn');
        await expect(page.locator('#hud-god-name')).toContainText('Thần Sấm');

        // Reload page
        await page.reload();

        // Welcome overlay should greet returning god
        const welcomeOverlay = page.locator('#god-welcome-overlay');
        await expect(welcomeOverlay).toBeVisible();
        await expect(welcomeOverlay).toContainText('Chào mừng trở lại');
        await expect(welcomeOverlay).toContainText('Thần Sấm');

        // Click continue
        await page.click('#god-resume-btn');
        await expect(welcomeOverlay).toBeHidden();
        await expect(page.locator('#hud-god-name')).toContainText('Thần Sấm');
    });

    test('God statistics modal displays metrics and allows renaming God', async ({ page }) => {
        await page.goto('/');
        await page.fill('#god-name-input', 'Thần Rừng');
        await page.click('#god-welcome-submit-btn');
        await expect(page.locator('#hud-god-name')).toBeVisible();

        // Click HUD God badge to open stats modal
        await page.click('#hud-god-btn');
        const statsModal = page.locator('#god-stats-modal');
        await expect(statsModal).toBeVisible();
        await expect(statsModal).toContainText('HỒ SƠ VỊ THẦN');
        await expect(statsModal).toContainText('Dân đã tạo');
        await expect(statsModal).toContainText('Đang sống');
        await expect(statsModal).toContainText('Đã cứu');
        await expect(statsModal).toContainText('Đã chết đuối');

        // Rename God
        await page.fill('#god-rename-input', 'Thần Biển Cả');
        await page.click('#god-rename-form button[type="submit"]');

        // Verify updated name in modal and HUD
        await expect(page.locator('#god-stats-display-name')).toContainText('Thần Biển Cả');
        await page.click('#god-stats-close-btn');
        await expect(statsModal).toBeHidden();
        await expect(page.locator('#hud-god-name')).toContainText('Thần Biển Cả');
    });

    test('Island selection, citizen creation, and population updates', async ({ page }) => {
        await page.goto('/');
        await page.fill('#god-name-input', 'Thần Kiến Tạo');
        await page.click('#god-welcome-submit-btn');
        await expect(page.locator('#hud-god-name')).toBeVisible();

        // Wait for 3D world to populate
        await page.waitForFunction(() => window.__paradiseGame?.activeParadiseWorld?.islands?.length > 0);

        // Select the first island via game UI
        await page.evaluate(() => {
            const island = window.__paradiseGame.activeParadiseWorld.islands[0];
            window.__paradiseGame.uiManager.islandPanel.show(island);
        });

        const islandPanel = page.locator('#island-panel-container');
        await expect(islandPanel).toBeVisible();
        await expect(page.locator('#island-panel-name')).toBeVisible();

        const initialIslandPop = parseInt(await page.locator('#island-panel-population').textContent() || '0', 10);
        const initialWorldPop = parseInt(await page.locator('#hud-world-population').textContent() || '0', 10);

        // Open citizen creation form
        await page.click('#island-create-citizen-btn');
        await expect(page.locator('#island-create-citizen-form')).toBeVisible();
        await page.fill('#citizen-name-input', 'Dân Mới Sinh');
        await page.click('#citizen-confirm-create-btn');

        // Expect populations to increment by 1
        await expect(page.locator('#island-panel-population')).toHaveText(String(initialIslandPop + 1));
        await expect(page.locator('#hud-world-population')).toHaveText(String(initialWorldPop + 1));
    });

    test('Drowning countdown triggers alert and rescue preserves citizen', async ({ page }) => {
        await page.goto('/');
        await page.fill('#god-name-input', 'Thần Cứu Thế');
        await page.click('#god-welcome-submit-btn');
        await expect(page.locator('#hud-god-name')).toBeVisible();

        await page.waitForFunction(() => window.__paradiseGame?.activeParadiseWorld?.citizens?.length > 0);

        // Trigger drowning on first citizen
        const citizenInfo = await page.evaluate(() => {
            const cit = window.__paradiseGame.activeParadiseWorld.citizens[0];
            cit.onFellInWaterCallback(cit);
            return { id: cit.id, name: cit.name };
        });

        // Verify Drowning alert card appears
        const alertCard = page.locator(`#drowning-alert-${citizenInfo.id}`);
        await expect(alertCard).toBeVisible();
        await expect(alertCard).toContainText('đang chìm');

        // Click Rescue button
        await alertCard.locator('.rescue-btn').click();

        // Card should disappear and citizen is rescued
        await expect(alertCard).toBeHidden();
        const toast = page.locator('#toast-container');
        await expect(toast).toContainText('thoát khỏi biển sâu');
    });

    test('Drowning countdown expiration leads to death and population decrement', async ({ page }) => {
        await page.goto('/');
        await page.fill('#god-name-input', 'Thần Thử Thách');
        await page.click('#god-welcome-submit-btn');
        await expect(page.locator('#hud-god-name')).toBeVisible();

        await page.waitForFunction(() => window.__paradiseGame?.activeParadiseWorld?.citizens?.length > 0);

        const initialPop = parseInt(await page.locator('#hud-world-population').textContent() || '0', 10);

        // Trigger drowning on a citizen
        const citizenInfo = await page.evaluate(() => {
            const cit = window.__paradiseGame.activeParadiseWorld.citizens[0];
            cit.onFellInWaterCallback(cit);
            return { id: cit.id, name: cit.name };
        });

        const alertCard = page.locator(`#drowning-alert-${citizenInfo.id}`);
        await expect(alertCard).toBeVisible();

        // Wait for the 3.0s countdown to expire and card to be removed
        await expect(alertCard).toBeHidden({ timeout: 6000 });

        // World population should decrease by 1
        await expect(page.locator('#hud-world-population')).toHaveText(String(initialPop - 1));
    });

    test('Database failure switches scene to Volcano Failure World and recovery restores Paradise', async ({ page }) => {
        // Route /api/world to fail with 503 DATABASE_UNAVAILABLE
        await page.route('**/api/world', async (route) => {
            if (route.request().method() === 'GET') {
                await route.fulfill({
                    status: 503,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        status: 'error',
                        code: 'DATABASE_UNAVAILABLE',
                        message: 'Could not connect to database host (SQLSTATE[HY000] [2002]).',
                    }),
                });
            } else {
                await route.continue();
            }
        });

        await page.goto('/');

        // Verify Volcano Failure Overlay is displayed
        const failureOverlay = page.locator('#failure-overlay-container');
        await expect(failureOverlay).toBeVisible();
        await expect(failureOverlay).toContainText('KHÔNG THỂ KẾT NỐI TỚI THIÊN ĐƯỜNG');
        await expect(failureOverlay).toContainText('DATA LAYER OFFLINE');

        // Verify Volcano 3D world is active
        const isVolcanoActive = await page.evaluate(() => !!window.__paradiseGame?.activeVolcanoWorld);
        expect(isVolcanoActive).toBe(true);

        // Now restore database connection (unroute intercept)
        await page.unroute('**/api/world');

        // Click Retry button
        await page.click('#failure-retry-btn');

        // Overlay should hide and Paradise world initializes
        await expect(failureOverlay).toBeHidden({ timeout: 5000 });
        const isParadiseActive = await page.evaluate(() => !!window.__paradiseGame?.activeParadiseWorld);
        expect(isParadiseActive).toBe(true);
    });
});
