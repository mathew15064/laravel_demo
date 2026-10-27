import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const VIEWPORTS = [
    { name: '375', width: 375, height: 812, isMobile: true },
    { name: '768', width: 768, height: 1024, isMobile: false },
    { name: '1440', width: 1440, height: 1000, isMobile: false },
];

const TARGET_URL = process.env.APP_URL || 'http://127.0.0.1:8008';
const OUT_DIR = path.resolve('artifacts/screenshots');

if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
}

async function run() {
    console.log(`[Visual] Starting screenshot generation against: ${TARGET_URL}`);
    const browser = await chromium.launch({ headless: true });

    for (const vp of VIEWPORTS) {
        console.log(`[Visual] Capturing viewport ${vp.name} (${vp.width}x${vp.height})...`);
        const context = await browser.newContext({
            viewport: { width: vp.width, height: vp.height },
            deviceScaleFactor: 2,
            isMobile: vp.isMobile,
        });

        const page = await context.newPage();
        
        // Listen to console to ensure no errors
        page.on('console', (msg) => {
            if (msg.type() === 'error') {
                console.error(`[Browser Console Error] ${msg.text()}`);
            }
        });

        await page.goto(TARGET_URL, { waitUntil: 'networkidle', timeout: 30000 });

        // Wait for Three.js canvas to mount and render at least a few animation frames
        await page.waitForSelector('#hero-canvas-container canvas', { timeout: 10000 });
        await page.waitForTimeout(1800);

        // Full page screenshot
        const fullPath = path.join(OUT_DIR, `landing-${vp.name}.png`);
        await page.screenshot({ path: fullPath, fullPage: true });
        console.log(`[Visual] Saved: ${fullPath}`);

        // Also capture Hero-specific viewport screenshot
        const heroPath = path.join(OUT_DIR, `hero-${vp.name}.png`);
        const heroElement = await page.$('#hero');
        if (heroElement) {
            await heroElement.screenshot({ path: heroPath });
            console.log(`[Visual] Saved Hero View: ${heroPath}`);
        }

        await context.close();
    }

    await browser.close();
    console.log('[Visual] All screenshots successfully generated.');
}

run().catch((err) => {
    console.error('[Visual] Error capturing screenshots:', err);
    process.exit(1);
});
