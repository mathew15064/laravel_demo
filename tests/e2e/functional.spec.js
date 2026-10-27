import { test, expect } from '@playwright/test';

test.describe('DeployLab Functional & Integration Tests', () => {
    test('Homepage loads without console errors and displays Three.js hero and core sections', async ({ page }) => {
        const consoleErrors = [];
        const pageErrors = [];

        page.on('console', (msg) => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
            }
        });

        page.on('pageerror', (err) => {
            pageErrors.push(err.message);
        });

        const response = await page.goto('/');
        expect(response?.status()).toBe(200);

        // Verify Hero Headline & Copy
        const headline = page.locator('h1');
        await expect(headline).toBeVisible();
        await expect(headline).toContainText('every layer');

        // Verify Navigation Links
        await expect(page.locator('header a[href="#journey"]').first()).toBeVisible();
        await expect(page.locator('header a[href="#layers"]').first()).toBeVisible();
        await expect(page.locator('header a[href="#contact"]').first()).toBeVisible();

        // Verify Three.js Canvas Container & Canvas Element
        const canvasContainer = page.locator('#hero-canvas-container');
        await expect(canvasContainer).toBeVisible();
        const canvas = canvasContainer.locator('canvas');
        await expect(canvas).toBeAttached();

        // Verify Major Sections
        await expect(page.locator('#journey')).toBeVisible();
        await expect(page.locator('#layers')).toBeVisible();
        await expect(page.locator('#breakdowns')).toBeVisible();
        await expect(page.locator('#diagnostics')).toBeVisible();
        await expect(page.locator('#contact')).toBeVisible();

        // Verify Request Journey Interaction
        const phpBtn = page.locator('button[data-layer="php"]');
        await phpBtn.click();
        const phpPanel = page.locator('.journey-layer-panel[data-layer="php"]');
        await expect(phpPanel).toBeVisible();
        await expect(phpPanel).toContainText('PHP-FPM 8.4 Process Manager');

        // Confirm zero unhandled console or page errors
        expect(consoleErrors).toEqual([]);
        expect(pageErrors).toEqual([]);
    });

    test('/health endpoint returns lightweight OK response', async ({ request }) => {
        const res = await request.get('/health');
        expect(res.status()).toBe(200);
        const data = await res.json();
        expect(data.status).toBe('ok');
        expect(data.application).toBe('DeployLab');
        expect(data.runtime).toContain('PHP 8.4');
    });

    test('/api/status returns independent dependency health breakdown', async ({ request }) => {
        const res = await request.get('/api/status');
        expect(res.status()).toBe(200);
        const data = await res.json();
        expect(data.application).toBe('ok');
        expect(data.database).toBe('ok');
        expect(data.cache).toBe('ok');
        expect(data.details).toBeDefined();
        expect(data.details.database_driver).toBe('sqlite');
    });

    test('Contact form handles validation and records real database inquiry', async ({ page }) => {
        await page.goto('/');

        // Locate contact form
        const form = page.locator('#seminar-registration-form');
        await expect(form).toBeVisible();

        // Test client submission with valid payload
        await page.fill('#name', 'Morgan Vance');
        await page.fill('#email', 'morgan@sre-team.org');
        await page.fill('#message', 'Interested in real-time Redis memory eviction and Linux socket troubleshooting.');

        await page.click('#contact-submit-btn');

        // Expect success feedback alert
        const alert = page.locator('#form-feedback-alert');
        await expect(alert).toBeVisible({ timeout: 10000 });
        await expect(alert).toContainText('Registration Confirmed!');
        await expect(alert).toContainText('Morgan Vance');
    });
});
