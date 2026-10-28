import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const SCREENSHOT_DIR = path.resolve(process.cwd(), 'artifacts/screenshots');
const BRAIN_DIR = '/home/dev5/.gemini/antigravity-cli/brain/4d86c6c4-61e4-48d3-b08e-77a338712f5d/screenshots';

fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
fs.mkdirSync(BRAIN_DIR, { recursive: true });

async function saveScreenshot(page, filename) {
    const localPath = path.join(SCREENSHOT_DIR, filename);
    const brainPath = path.join(BRAIN_DIR, filename);

    await page.screenshot({ path: localPath, fullPage: false });
    fs.copyFileSync(localPath, brainPath);
    console.log(`Saved screenshot: ${filename}`);
}

async function run() {
    const browser = await chromium.launch({ headless: true });

    // -------------------------------------------------------------
    // 1. welcome-god.png (1440x900)
    // -------------------------------------------------------------
    console.log('Capturing welcome-god.png...');
    const welcomeContext = await browser.newContext({
        viewport: { width: 1440, height: 900 }
    });
    const welcomePage = await welcomeContext.newPage();
    await welcomePage.addInitScript(() => localStorage.clear());
    await welcomePage.goto('http://127.0.0.1:8008/');
    await welcomePage.waitForSelector('#god-welcome-overlay:not(.hidden)');
    await welcomePage.waitForTimeout(1000);
    await saveScreenshot(welcomePage, 'welcome-god.png');
    await welcomeContext.close();

    // -------------------------------------------------------------
    // Setup authenticated God session for gameplay screenshots
    // -------------------------------------------------------------
    const gameContext = await browser.newContext({
        viewport: { width: 1440, height: 900 }
    });
    const page = await gameContext.newPage();
    await page.addInitScript(() => localStorage.clear());
    await page.goto('http://127.0.0.1:8008/');
    await page.waitForSelector('#god-welcome-overlay:not(.hidden)');
    await page.fill('#god-name-input', 'Thần Huynh');
    await page.click('#god-welcome-submit-btn');
    await page.waitForSelector('#god-welcome-overlay', { state: 'hidden', timeout: 6000 });
    await page.waitForFunction(() => window.__paradiseGame?.activeParadiseWorld?.islands?.length > 0);
    await page.waitForTimeout(1500);

    // -------------------------------------------------------------
    // 2. world-1440.png
    // -------------------------------------------------------------
    console.log('Capturing world-1440.png...');
    await saveScreenshot(page, 'world-1440.png');

    // -------------------------------------------------------------
    // 3. world-1024.png
    // -------------------------------------------------------------
    console.log('Capturing world-1024.png...');
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.waitForTimeout(800);
    await saveScreenshot(page, 'world-1024.png');

    // -------------------------------------------------------------
    // 4. world-768.png
    // -------------------------------------------------------------
    console.log('Capturing world-768.png...');
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(800);
    await saveScreenshot(page, 'world-768.png');

    // -------------------------------------------------------------
    // 5. world-375.png
    // -------------------------------------------------------------
    console.log('Capturing world-375.png...');
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(800);
    await saveScreenshot(page, 'world-375.png');

    // Restore desktop viewport
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(500);

    // -------------------------------------------------------------
    // 6. island-selected.png
    // -------------------------------------------------------------
    console.log('Capturing island-selected.png...');
    await page.evaluate(() => {
        const island = window.__paradiseGame.activeParadiseWorld.islands[0];
        window.__paradiseGame.uiManager.islandPanel.show(island);
        window.__paradiseGame.activeParadiseWorld.selectionSystem.selectIsland(island);
    });
    await page.waitForSelector('#island-panel-container:not(.hidden)');
    await page.waitForTimeout(800);
    await saveScreenshot(page, 'island-selected.png');

    // Hide island panel
    await page.evaluate(() => {
        window.__paradiseGame.uiManager.islandPanel.hide();
        window.__paradiseGame.activeParadiseWorld.selectionSystem.clearSelection();
    });

    // -------------------------------------------------------------
    // 7. citizen-selected.png
    // -------------------------------------------------------------
    console.log('Capturing citizen-selected.png...');
    await page.evaluate(() => {
        const citizen = window.__paradiseGame.activeParadiseWorld.citizens[0];
        window.__paradiseGame.uiManager.citizenPanel.show(citizen);
        window.__paradiseGame.activeParadiseWorld.selectionSystem.selectCitizen(citizen);
    });
    await page.waitForSelector('#citizen-panel-container:not(.hidden)');
    await page.waitForTimeout(800);
    await saveScreenshot(page, 'citizen-selected.png');

    // Hide citizen panel
    await page.evaluate(() => {
        window.__paradiseGame.uiManager.citizenPanel.hide();
        window.__paradiseGame.activeParadiseWorld.selectionSystem.clearSelection();
    });

    // -------------------------------------------------------------
    // 8. citizen-drowning.png
    // -------------------------------------------------------------
    console.log('Capturing citizen-drowning.png...');
    const citizenInfo = await page.evaluate(() => {
        const cit = window.__paradiseGame.activeParadiseWorld.citizens[0];
        cit.onFellInWaterCallback(cit);
        return { id: cit.id, name: cit.name };
    });
    await page.waitForSelector(`#drowning-alert-${citizenInfo.id}`);
    await page.waitForTimeout(400); // let countdown drop slightly e.g. 2.6s
    await saveScreenshot(page, 'citizen-drowning.png');

    // -------------------------------------------------------------
    // 9. citizen-rescued.png
    // -------------------------------------------------------------
    console.log('Capturing citizen-rescued.png...');
    await page.click(`#drowning-alert-${citizenInfo.id} .rescue-btn`);
    await page.waitForSelector(`#drowning-alert-${citizenInfo.id}`, { state: 'detached' });
    await page.waitForTimeout(600); // let rescue spark & toast appear
    await saveScreenshot(page, 'citizen-rescued.png');

    await gameContext.close();

    // -------------------------------------------------------------
    // 10. database-failure-volcano.png
    // -------------------------------------------------------------
    console.log('Capturing database-failure-volcano.png...');
    const volcanoContext = await browser.newContext({
        viewport: { width: 1440, height: 900 }
    });
    const volcanoPage = await volcanoContext.newPage();

    // Mock 503 DATABASE_UNAVAILABLE
    await volcanoPage.route('**/api/world', async (route) => {
        await route.fulfill({
            status: 503,
            contentType: 'application/json',
            body: JSON.stringify({
                status: 'error',
                code: 'DATABASE_UNAVAILABLE',
                message: 'SQLSTATE[HY000] [2002] Connection refused (Seminar Simulation: MySQL Stopped)',
            }),
        });
    });

    await volcanoPage.goto('http://127.0.0.1:8008/');
    await volcanoPage.waitForSelector('#failure-overlay-container:not(.hidden)');
    await volcanoPage.waitForTimeout(1500); // let volcano scene and lava settle
    await saveScreenshot(volcanoPage, 'database-failure-volcano.png');
    await volcanoContext.close();

    await browser.close();
    console.log('All 10 screenshots captured and synced successfully!');
}

run().catch((err) => {
    console.error('Error capturing screenshots:', err);
    process.exit(1);
});
