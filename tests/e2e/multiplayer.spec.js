import { test, expect } from '@playwright/test';

test.describe('Paradise Gods — Realtime Multiplayer Expansion', () => {
    test('Multiplayer World: Simultaneous Gods Presence, Sync & Cooperative Rescue', async ({ browser }) => {
        // 1. Create two isolated browser contexts (Zeus and Athena)
        const zeusContext = await browser.newContext();
        const athenaContext = await browser.newContext();

        const zeusPage = await zeusContext.newPage();
        const athenaPage = await athenaContext.newPage();

        // 2. Launch Zeus into the Paradise World
        await zeusPage.goto('/?god=Zeus');
        await zeusPage.waitForSelector('#game-canvas-container canvas', { timeout: 15000 });
        await expect(zeusPage.locator('#hud-god-name')).toContainText('Zeus');

        // Verify Zeus is online in his presence list
        await expect(zeusPage.locator('#hud-presence-list')).toContainText('Zeus');

        // 3. Launch Athena into the same persistent world
        await athenaPage.goto('/?god=Athena');
        await athenaPage.waitForSelector('#game-canvas-container canvas', { timeout: 15000 });
        await expect(athenaPage.locator('#hud-god-name')).toContainText('Athena');

        // Verify Athena is online in her presence list
        await expect(athenaPage.locator('#hud-presence-list')).toContainText('Athena');

        // 4. Verify Mutual Realtime Presence without reloading!
        // Zeus must see Athena appear in presence card
        await expect(zeusPage.locator('#hud-presence-list')).toContainText('Athena', { timeout: 8000 });
        // Athena must see Zeus in presence card
        await expect(athenaPage.locator('#hud-presence-list')).toContainText('Zeus', { timeout: 8000 });

        // Verify 3D divine avatars exist in Three.js world
        const zeusSeesAthenaAvatar = await zeusPage.evaluate(() => {
            const world = window.__paradiseGame?.activeParadiseWorld;
            if (!world || !world.godManager) return false;
            return world.godManager.avatars.size > 0;
        });
        expect(zeusSeesAthenaAvatar).toBe(true);

        const athenaSeesZeusAvatar = await athenaPage.evaluate(() => {
            const world = window.__paradiseGame?.activeParadiseWorld;
            if (!world || !world.godManager) return false;
            return world.godManager.avatars.size > 0;
        });
        expect(athenaSeesZeusAvatar).toBe(true);

        // 5. Test Shared Realtime Creation:
        // Zeus creates citizen "Thần Dân Mới" on Island 1
        const initialPop = await athenaPage.locator('#hud-world-population').textContent();

        const createRes = await zeusPage.evaluate(async () => {
            const world = window.__paradiseGame?.activeParadiseWorld;
            const island = world.islands[0];
            return await world.apiClient.createCitizen(island.id, 'Thần Dân Mới');
        });
        expect(createRes.ok).toBe(true);
        const newCitizenId = createRes.data.citizen.id;

        // Athena's browser receives citizen.created event via WebSocket without reloading!
        await athenaPage.waitForFunction((citId) => {
            const world = window.__paradiseGame?.activeParadiseWorld;
            return world && world.citizens.some(c => c.id === citId);
        }, newCitizenId, { timeout: 6000 });

        // World population increments in Athena's HUD
        await expect(athenaPage.locator('#hud-world-population')).not.toHaveText(initialPop);

        // 6. Test Realtime Ballistic Throw into Ocean & Authoritative Drowning:
        // Zeus throws citizen far into ocean
        const throwRes = await zeusPage.evaluate(async (citId) => {
            const world = window.__paradiseGame?.activeParadiseWorld;
            return await world.apiClient.request(`/api/citizens/${citId}/throw`, {
                method: 'POST',
                body: JSON.stringify({
                    god_uuid: world.apiClient.getGodUuid(),
                    start_position: { x: 0, y: 5, z: 0 },
                    velocity: { x: 80, y: 8, z: 80 },
                }),
            });
        }, newCitizenId);

        expect(throwRes.ok).toBe(true);
        expect(throwRes.data.outcome).toBe('landed_ocean');

        // Athena receives drowning event: Urgent Drowning Alert card appears on Athena's screen!
        const athenaAlert = athenaPage.locator(`#drowning-alert-${newCitizenId}`);
        await expect(athenaAlert).toBeVisible({ timeout: 6000 });
        await expect(athenaAlert.locator('.countdown-text')).toBeVisible();

        // 7. Test Cooperative Rescue by Athena (Cross-God Rescue!):
        // Athena clicks the rescue button on her screen
        await athenaAlert.locator('button.rescue-btn').click();

        // Drowning alert disappears on both screens!
        await expect(athenaAlert).toBeHidden({ timeout: 6000 });
        await expect(zeusPage.locator(`#drowning-alert-${newCitizenId}`)).toBeHidden({ timeout: 6000 });

        // Verify citizen is back alive
        const citizenStateAfterRescue = await zeusPage.evaluate((citId) => {
            const cit = window.__paradiseGame?.activeParadiseWorld?.citizens.find(c => c.id === citId);
            return cit ? cit.status : null;
        }, newCitizenId);
        expect(citizenStateAfterRescue).toBe('alive');

        // 8. Test Divine Interactions:
        // Athena clicks Zeus in her presence list to open Zeus's profile modal
        await athenaPage.locator(`#hud-presence-list [data-god-id="1"]`).click();
        const profileModal = athenaPage.locator('#god-profile-modal');
        await expect(profileModal).toBeVisible();
        await expect(profileModal).toContainText('Thần Zeus');

        // Athena clicks "Ban phước lành"
        await profileModal.locator('#god-profile-bless-btn').click();
        await expect(profileModal).toBeHidden();

        // Zeus receives notification toast
        await expect(zeusPage.locator('#toast-container')).toContainText('ban phước lành', { timeout: 6000 });

        // Clean up
        await zeusContext.close();
        await athenaContext.close();
    });
});
