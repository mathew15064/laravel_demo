import { test, expect } from '@playwright/test';

test.describe('Paradise Gods — Cooperative Shared World Multiplayer', () => {

    test('40. Two Player: Mutual Visibility, Shared World, Realtime Grab, Ballistic Throw & Cross-God Rescue', async ({ browser }) => {
        // 1. Create two isolated browser contexts (Zeus and Athena)
        const zeusContext = await browser.newContext();
        const athenaContext = await browser.newContext();

        const zeusPage = await zeusContext.newPage();
        const athenaPage = await athenaContext.newPage();

        // 2. Launch Zeus into the Paradise World
        await zeusPage.goto('/?god=Zeus');
        await zeusPage.waitForSelector('#game-canvas-container canvas', { timeout: 15000 });
        await expect(zeusPage.locator('#hud-god-name')).toContainText('Zeus');
        await expect(zeusPage.locator('#hud-presence-list')).toContainText('Zeus');

        // 3. Launch Athena into the same shared world
        await athenaPage.goto('/?god=Athena');
        await athenaPage.waitForSelector('#game-canvas-container canvas', { timeout: 15000 });
        await expect(athenaPage.locator('#hud-god-name')).toContainText('Athena');
        await expect(athenaPage.locator('#hud-presence-list')).toContainText('Athena');

        // 4. Mutual Realtime Presence:
        // Zeus sees Athena, Athena sees Zeus without reloading!
        await expect(zeusPage.locator('#hud-presence-list')).toContainText('Athena', { timeout: 8000 });
        await expect(athenaPage.locator('#hud-presence-list')).toContainText('Zeus', { timeout: 8000 });

        // Physical 3D Divine Avatars exist in Three.js scene
        await zeusPage.waitForFunction(() => {
            const world = window.__paradiseGame?.activeParadiseWorld;
            return world?.godManager?.avatars?.size > 0;
        }, { timeout: 8000 });

        await athenaPage.waitForFunction(() => {
            const world = window.__paradiseGame?.activeParadiseWorld;
            return world?.godManager?.avatars?.size > 0;
        }, { timeout: 8000 });

        const zeusSeesAthenaAvatar = await zeusPage.evaluate(() => {
            return window.__paradiseGame.activeParadiseWorld.godManager.avatars.size > 0;
        });
        expect(zeusSeesAthenaAvatar).toBe(true);

        const athenaSeesZeusAvatar = await athenaPage.evaluate(() => {
            return window.__paradiseGame.activeParadiseWorld.godManager.avatars.size > 0;
        });
        expect(athenaSeesZeusAvatar).toBe(true);

        // 5. Zeus creates citizen "Thần Dân Mới"
        const initialPop = await athenaPage.locator('#hud-world-population').textContent();
        const createRes = await zeusPage.evaluate(async () => {
            const world = window.__paradiseGame?.activeParadiseWorld;
            const island = world.islands[0];
            return await world.apiClient.createCitizen(island.id, 'Thần Dân Mới');
        });
        expect(createRes.ok).toBe(true);
        const newCitizenId = createRes.data.citizen.id;

        // Athena receives citizen.created event without reload
        await athenaPage.waitForFunction((citId) => {
            const world = window.__paradiseGame?.activeParadiseWorld;
            return world?.citizens?.some(c => c.id === citId);
        }, newCitizenId, { timeout: 6000 });

        await expect(athenaPage.locator('#hud-world-population')).not.toHaveText(initialPop);

        // 6. Zeus grabs citizen #newCitizenId -> Server broadcasts citizen.grabbed
        const grabRes = await zeusPage.evaluate(async (citId) => {
            const world = window.__paradiseGame?.activeParadiseWorld;
            return await world.apiClient.request(`/api/citizens/${citId}/grab`, {
                method: 'POST',
                body: JSON.stringify({ god_uuid: world.apiClient.getGodUuid() }),
            });
        }, newCitizenId);
        expect(grabRes.ok).toBe(true);

        // Athena sees citizen held in air by Zeus!
        await athenaPage.waitForFunction((citId) => {
            const cit = window.__paradiseGame?.activeParadiseWorld?.citizens?.find(c => c.id === citId);
            return cit && cit.status === 'held';
        }, newCitizenId, { timeout: 6000 });

        // 7. Zeus throws citizen into ocean -> Ballistic trajectory reproduced
        const throwRes = await zeusPage.evaluate(async (citId) => {
            const world = window.__paradiseGame?.activeParadiseWorld;
            return await world.apiClient.request(`/api/citizens/${citId}/throw`, {
                method: 'POST',
                body: JSON.stringify({
                    god_uuid: world.apiClient.getGodUuid(),
                    start_position: { x: 0, y: 5.5, z: 0 },
                    velocity: { x: 80, y: 8, z: 80 },
                }),
            });
        }, newCitizenId);

        expect(throwRes.ok).toBe(true);
        expect(throwRes.data.outcome).toBe('landed_ocean');

        // 8. Citizen enters drowning: Athena sees urgent drowning alert
        const athenaAlert = athenaPage.locator(`#drowning-alert-${newCitizenId}`);
        await expect(athenaAlert).toBeVisible({ timeout: 6000 });
        await expect(athenaAlert.locator('.countdown-text')).toBeVisible();

        // 9. Cross-God Rescue: Athena rescues citizen thrown by Zeus!
        await athenaAlert.locator('button.rescue-btn').click();

        // Drowning alert disappears on both screens
        await expect(athenaAlert).toBeHidden({ timeout: 6000 });
        await expect(zeusPage.locator(`#drowning-alert-${newCitizenId}`)).toBeHidden({ timeout: 6000 });

        // 10. Zeus sees citizen rescued and back alive
        await zeusPage.waitForFunction((citId) => {
            const cit = window.__paradiseGame?.activeParadiseWorld?.citizens?.find(c => c.id === citId);
            return cit && cit.status === 'alive';
        }, newCitizenId, { timeout: 8000 });

        await zeusContext.close();
        await athenaContext.close();
    });

    test('41. Shared Control: Creator Does Not Own Citizen (Zeus creates, Athena grabs/lifts/releases, Apollo grabs)', async ({ browser }) => {
        const zeusContext = await browser.newContext();
        const athenaContext = await browser.newContext();
        const apolloContext = await browser.newContext();

        const zeusPage = await zeusContext.newPage();
        const athenaPage = await athenaContext.newPage();
        const apolloPage = await apolloContext.newPage();

        await zeusPage.goto('/?god=Zeus');
        await athenaPage.goto('/?god=Athena');
        await apolloPage.goto('/?god=Apollo');

        await zeusPage.waitForSelector('#game-canvas-container canvas', { timeout: 15000 });
        await athenaPage.waitForSelector('#game-canvas-container canvas', { timeout: 15000 });
        await apolloPage.waitForSelector('#game-canvas-container canvas', { timeout: 15000 });

        // 1. Zeus creates citizen "Minh"
        const createRes = await zeusPage.evaluate(async () => {
            const world = window.__paradiseGame.activeParadiseWorld;
            const island = world.islands[0];
            return await world.apiClient.createCitizen(island.id, 'Minh');
        });
        expect(createRes.ok).toBe(true);
        const minhId = createRes.data.citizen.id;

        // Wait for Athena to have Minh in memory
        await athenaPage.waitForFunction((citId) => {
            return window.__paradiseGame?.activeParadiseWorld?.citizens?.some(c => c.id === citId);
        }, minhId, { timeout: 6000 });

        // 2. Athena (non-creator) grabs Minh -> Must PASS (200 OK)
        const athenaGrab = await athenaPage.evaluate(async (citId) => {
            const world = window.__paradiseGame.activeParadiseWorld;
            return await world.apiClient.request(`/api/citizens/${citId}/grab`, {
                method: 'POST',
                body: JSON.stringify({ god_uuid: world.apiClient.getGodUuid() }),
            });
        }, minhId);
        expect(athenaGrab.ok).toBe(true);
        expect(athenaGrab.data.citizen.status).toBe('held');

        // 3. Athena releases Minh on island
        const athenaRelease = await athenaPage.evaluate(async (citId) => {
            const world = window.__paradiseGame.activeParadiseWorld;
            return await world.apiClient.request(`/api/citizens/${citId}/release`, {
                method: 'POST',
                body: JSON.stringify({
                    god_uuid: world.apiClient.getGodUuid(),
                    position: { x: 0, y: 2.0, z: 0 },
                }),
            });
        }, minhId);
        expect(athenaRelease.ok).toBe(true);
        expect(athenaRelease.data.citizen.status).toBe('alive');

        // 4. Apollo (third god) grabs Minh -> Must PASS (200 OK)
        const apolloGrab = await apolloPage.evaluate(async (citId) => {
            const world = window.__paradiseGame.activeParadiseWorld;
            return await world.apiClient.request(`/api/citizens/${citId}/grab`, {
                method: 'POST',
                body: JSON.stringify({ god_uuid: world.apiClient.getGodUuid() }),
            });
        }, minhId);
        expect(apolloGrab.ok).toBe(true);
        expect(apolloGrab.data.citizen.status).toBe('held');

        await zeusContext.close();
        await athenaContext.close();
        await apolloContext.close();
    });

    test('42. Rescue Race: Simultaneous Atomic Rescue Handled Gracefully', async ({ browser }) => {
        const zeusContext = await browser.newContext();
        const athenaContext = await browser.newContext();

        const zeusPage = await zeusContext.newPage();
        const athenaPage = await athenaContext.newPage();

        await zeusPage.goto('/?god=Zeus');
        await athenaPage.goto('/?god=Athena');

        await zeusPage.waitForSelector('#game-canvas-container canvas', { timeout: 15000 });
        await athenaPage.waitForSelector('#game-canvas-container canvas', { timeout: 15000 });

        // Create a citizen and set them drowning
        const setupRes = await zeusPage.evaluate(async () => {
            const world = window.__paradiseGame.activeParadiseWorld;
            const island = world.islands[0];
            const created = await world.apiClient.createCitizen(island.id, 'DrowningMinh');
            const citId = created.data.citizen.id;
            await world.apiClient.markDrowning(citId);
            return citId;
        });

        // Both Zeus and Athena issue simultaneous rescue requests
        const [zeusRescue, athenaRescue] = await Promise.all([
            zeusPage.evaluate(async (citId) => {
                const world = window.__paradiseGame.activeParadiseWorld;
                return await world.apiClient.rescueCitizen(citId);
            }, setupRes),
            athenaPage.evaluate(async (citId) => {
                const world = window.__paradiseGame.activeParadiseWorld;
                return await world.apiClient.rescueCitizen(citId);
            }, setupRes),
        ]);

        // Exactly one should be 'ok', the other should be 'already_rescued'
        const statuses = [zeusRescue.data.status, athenaRescue.data.status];
        expect(statuses).toContain('ok');
        expect(statuses).toContain('already_rescued');

        await zeusContext.close();
        await athenaContext.close();
    });

    test('43. Reconnect UX: Silent short reconnect (< 3s) vs Graceful long reconnect (12s)', async ({ browser }) => {
        const zeusContext = await browser.newContext();
        const athenaContext = await browser.newContext();

        const zeusPage = await zeusContext.newPage();
        const athenaPage = await athenaContext.newPage();

        await zeusPage.goto('/?god=Zeus');
        await athenaPage.goto('/?god=Athena');

        await zeusPage.waitForSelector('#game-canvas-container canvas', { timeout: 15000 });
        await athenaPage.waitForSelector('#game-canvas-container canvas', { timeout: 15000 });

        // Verify mutual presence
        await expect(zeusPage.locator('#hud-presence-list')).toContainText('Athena', { timeout: 8000 });

        // Phase 1: Short disconnect (1.5 seconds)
        await athenaPage.evaluate(() => {
            window.__paradiseGame.activeParadiseWorld.realtimeClient.simulateDisconnect(1500);
        });

        // Wait 1.0 second: assert NO giant warning banner and indicator is hidden (< 3s)
        await athenaPage.waitForTimeout(1000);
        const indicator = athenaPage.locator('#reconnect-indicator');
        await expect(indicator).toBeHidden();

        // Zeus should NOT have Athena avatar despawned (grace period protects presence!)
        const zeusStillSeesAthena = await zeusPage.evaluate(() => {
            return window.__paradiseGame.activeParadiseWorld.godManager.avatars.size > 0;
        });
        expect(zeusStillSeesAthena).toBe(true);

        // Phase 2: Disconnect lasting > 3 seconds (5.0 seconds) triggers subtle indicator
        await athenaPage.evaluate(() => {
            window.__paradiseGame.activeParadiseWorld.realtimeClient.simulateDisconnect(5000);
        });

        // Wait 3.5 seconds -> indicator appears!
        await athenaPage.waitForTimeout(3500);
        await expect(indicator).toBeVisible({ timeout: 4000 });
        await expect(indicator).toContainText('Đang kết nối lại');

        // Scene must still be rendered and canvas visible!
        await expect(athenaPage.locator('#game-canvas-container canvas')).toBeVisible();

        // On successful reconnection, indicator disappears
        await expect(indicator).toBeHidden({ timeout: 7000 });

        await zeusContext.close();
        await athenaContext.close();
    });

    test('44. God Visibility: 3 Concurrent Gods (Zeus, Athena, Apollo) Render Each Other in 3D Scene', async ({ browser }) => {
        const zeusContext = await browser.newContext();
        const athenaContext = await browser.newContext();
        const apolloContext = await browser.newContext();

        const zeusPage = await zeusContext.newPage();
        const athenaPage = await athenaContext.newPage();
        const apolloPage = await apolloContext.newPage();

        await zeusPage.goto('/?god=Zeus');
        await athenaPage.goto('/?god=Athena');
        await apolloPage.goto('/?god=Apollo');

        await zeusPage.waitForSelector('#game-canvas-container canvas', { timeout: 15000 });
        await athenaPage.waitForSelector('#game-canvas-container canvas', { timeout: 15000 });
        await apolloPage.waitForSelector('#game-canvas-container canvas', { timeout: 15000 });

        // Wait for all 3 presence lists to stabilize
        await expect(zeusPage.locator('#hud-presence-list')).toContainText('Athena', { timeout: 8000 });
        await expect(zeusPage.locator('#hud-presence-list')).toContainText('Apollo', { timeout: 8000 });

        await expect(athenaPage.locator('#hud-presence-list')).toContainText('Zeus', { timeout: 8000 });
        await expect(athenaPage.locator('#hud-presence-list')).toContainText('Apollo', { timeout: 8000 });

        await expect(apolloPage.locator('#hud-presence-list')).toContainText('Zeus', { timeout: 8000 });
        await expect(apolloPage.locator('#hud-presence-list')).toContainText('Athena', { timeout: 8000 });

        // Wait for avatars to spawn in 3D scene (each god sees the other 2 gods)
        await zeusPage.waitForFunction(() => {
            return window.__paradiseGame?.activeParadiseWorld?.godManager?.avatars?.size >= 2;
        }, { timeout: 8000 });

        await athenaPage.waitForFunction(() => {
            return window.__paradiseGame?.activeParadiseWorld?.godManager?.avatars?.size >= 2;
        }, { timeout: 8000 });

        await apolloPage.waitForFunction(() => {
            return window.__paradiseGame?.activeParadiseWorld?.godManager?.avatars?.size >= 2;
        }, { timeout: 8000 });

        // Verify each God has physical 3D avatars in their Three.js scene (the other Gods)
        const zeusAvatarsCount = await zeusPage.evaluate(() => {
            return window.__paradiseGame.activeParadiseWorld.godManager.avatars.size;
        });
        expect(zeusAvatarsCount).toBeGreaterThanOrEqual(2);

        const athenaAvatarsCount = await athenaPage.evaluate(() => {
            return window.__paradiseGame.activeParadiseWorld.godManager.avatars.size;
        });
        expect(athenaAvatarsCount).toBeGreaterThanOrEqual(2);

        const apolloAvatarsCount = await apolloPage.evaluate(() => {
            return window.__paradiseGame.activeParadiseWorld.godManager.avatars.size;
        });
        expect(apolloAvatarsCount).toBeGreaterThanOrEqual(2);

        await zeusContext.close();
        await athenaContext.close();
        await apolloContext.close();
    });
});
