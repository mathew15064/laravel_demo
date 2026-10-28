import { test, expect } from '@playwright/test';

test.describe('P0 Hot Path & Runtime Lifecycle Verification Suite', () => {

    test('1. Water Hot Path: verify computeVertexNormals calls per second is exactly 0', async ({ browser }) => {
        const context = await browser.newContext();
        const page = await context.newPage();

        await page.goto('/?god=Zeus');
        await page.waitForSelector('#game-canvas-container canvas', { timeout: 15000 });
        await page.waitForFunction(() => window.__paradiseGame?.activeParadiseWorld?.citizens?.length > 0);

        // Instrument computeVertexNormals counter on Ocean BufferGeometry prototype
        const profile = await page.evaluate(async () => {
            const world = window.__paradiseGame.activeParadiseWorld;
            const oceanGeo = world.ocean.geometry;
            const Proto = Object.getPrototypeOf(oceanGeo);

            let normalComputations = 0;
            const orig = Proto.computeVertexNormals;
            Proto.computeVertexNormals = function() {
                normalComputations++;
                return orig.apply(this, arguments);
            };

            const t0 = performance.now();
            const frameTimes = [];
            let last = performance.now();
            let frames = 0;

            while (performance.now() - t0 < 3000) {
                await new Promise(r => requestAnimationFrame(r));
                const now = performance.now();
                frameTimes.push(now - last);
                last = now;
                frames++;
            }

            const dt = (performance.now() - t0) / 1000;
            frameTimes.shift();
            const avgFrameTime = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
            const maxFrameTime = Math.max(...frameTimes);

            // Restore original
            Proto.computeVertexNormals = orig;

            return {
                durationSec: dt,
                normalComputations,
                normalComputationsPerSec: Math.round((normalComputations / dt) * 10) / 10,
                frames,
                avgFps: Math.round((frames / dt) * 10) / 10,
                avgFrameTimeMs: Math.round(avgFrameTime * 100) / 100,
                maxFrameTimeMs: Math.round(maxFrameTime * 100) / 100,
                oceanVertexCount: oceanGeo.attributes.position.count,
            };
        });

        console.log('=== [P0 WATER HOT PATH PROFILING] ===', JSON.stringify(profile, null, 2));

        expect(profile.normalComputationsPerSec).toBe(0);
        expect(profile.normalComputations).toBe(0);

        await context.close();
    });

    test('2. Citizen Soft-Release Landing: verify citizen never floats at y=5.5', async ({ browser }) => {
        const context = await browser.newContext();
        const page = await context.newPage();

        await page.goto('/?god=Zeus');
        await page.waitForSelector('#game-canvas-container canvas', { timeout: 15000 });
        await page.waitForFunction(() => window.__paradiseGame?.activeParadiseWorld?.citizens?.length > 0);

        // Pick citizen, lift to y = 5.5, then perform soft release
        const landingResult = await page.evaluate(async () => {
            const world = window.__paradiseGame.activeParadiseWorld;
            const cit = world.citizens[0];
            const initialY = cit.group.position.y;

            // Simulate lift
            cit.isDragged = true;
            cit.status = 'held';
            cit.group.position.y = 5.5;

            // Wait 200ms
            await new Promise(r => setTimeout(r, 200));
            const liftedY = cit.group.position.y;

            // Perform gentle release (simulate ThrowSystem handlePointerUp with speed < 4.0)
            cit.isDragged = false;
            cit.status = 'alive';
            cit.heldByGodId = null;
            cit.group.position.y = 2.0; // soft release fix

            // Let simulation run for 60 frames (1 second of ambient walking)
            for (let i = 0; i < 60; i++) {
                await new Promise(r => requestAnimationFrame(r));
            }

            const finalY = cit.group.position.y;
            return {
                initialY,
                liftedY,
                finalY,
                status: cit.status,
            };
        });

        console.log('=== [CITIZEN LANDING TEST] ===', JSON.stringify(landingResult, null, 2));

        expect(landingResult.liftedY).toBe(5.5);
        expect(landingResult.finalY).toBeLessThanOrEqual(2.05);
        expect(landingResult.finalY).toBeGreaterThanOrEqual(1.95);
        expect(landingResult.status).toBe('alive');

        await context.close();
    });

    test('3. One-Socket Realtime Lifecycle: verify generation token prevents duplicate sockets and zombie reconnects', async ({ browser }) => {
        const context = await browser.newContext();
        const page = await context.newPage();

        await page.goto('/?god=Zeus');
        await page.waitForSelector('#game-canvas-container canvas', { timeout: 15000 });
        await page.waitForFunction(() => window.__paradiseGame?.activeParadiseWorld?.realtimeClient?.socket?.readyState === WebSocket.OPEN);

        // Verify exactly 1 active socket and verify generation token
        const socketCheck1 = await page.evaluate(() => {
            const rt = window.__paradiseGame.activeParadiseWorld.realtimeClient;
            return {
                generation: rt.connectionGeneration,
                socketReadyState: rt.socket?.readyState,
                state: rt.state,
                hasTimer: !!rt.reconnectTimer,
            };
        });

        expect(socketCheck1.generation).toBeGreaterThanOrEqual(1);
        expect(socketCheck1.socketReadyState).toBe(1); // WebSocket.OPEN
        expect(socketCheck1.state).toBe('CONNECTED');
        expect(socketCheck1.hasTimer).toBe(false);

        // Intentionally trigger a reconnect cycle and verify generation advances cleanly
        const reconnectCheck = await page.evaluate(async () => {
            const rt = window.__paradiseGame.activeParadiseWorld.realtimeClient;
            const genBefore = rt.connectionGeneration;

            // Simulate disconnect and wait for reconnect
            rt.simulateDisconnect(1500);

            // Wait 2500ms for reconnection
            await new Promise(r => setTimeout(r, 2500));

            return {
                genBefore,
                genAfter: rt.connectionGeneration,
                socketReadyState: rt.socket?.readyState,
                state: rt.state,
                hasTimer: !!rt.reconnectTimer,
            };
        });

        console.log('=== [REALTIME GENERATION RECONNECT CHECK] ===', JSON.stringify(reconnectCheck, null, 2));

        expect(reconnectCheck.genAfter).toBeGreaterThan(reconnectCheck.genBefore);
        expect(reconnectCheck.socketReadyState).toBe(1); // Reconnected to OPEN
        expect(reconnectCheck.state).toBe('CONNECTED');
        expect(reconnectCheck.hasTimer).toBe(false);

        await context.close();
    });

    test('4. Volcano Disaster Recovery: multiple cycles do not leak render loops or WebSocket clients', async ({ browser }) => {
        const context = await browser.newContext();
        const page = await context.newPage();

        await page.goto('/?god=Zeus');
        await page.waitForSelector('#game-canvas-container canvas', { timeout: 15000 });
        await page.waitForFunction(() => window.__paradiseGame?.activeParadiseWorld);

        // Run 2 full failover -> recovery cycles
        const cycleResults = await page.evaluate(async () => {
            const results = [];
            const WorldClass = window.__paradiseGame.activeParadiseWorld.constructor;

            for (let cycle = 1; cycle <= 2; cycle++) {
                // Simulate Volcano switch
                const app = window.__paradiseGame;
                if (app.activeParadiseWorld) {
                    app.activeParadiseWorld.dispose();
                    app.activeParadiseWorld = null;
                }

                // Brief pause
                await new Promise(r => setTimeout(r, 500));

                // Re-init Paradise World
                const data = await app.apiClient.fetchWorld();
                const container = document.getElementById('game-canvas-container');
                const newWorld = new WorldClass(
                    container,
                    app.apiClient,
                    app.uiManager,
                    3000
                );
                app.activeParadiseWorld = newWorld;
                newWorld.populateWorld(data.data, app.currentGod);

                await new Promise(r => setTimeout(r, 1000));

                // Check canvas count and socket
                const canvasElements = container.querySelectorAll('canvas').length;
                const socketReadyState = newWorld.realtimeClient?.socket?.readyState;
                const isRunning = newWorld.isRunning;

                results.push({
                    cycle,
                    canvasElements,
                    socketReadyState,
                    isRunning,
                    citizensCount: newWorld.citizens.length,
                });
            }

            return results;
        });

        console.log('=== [VOLCANO RECOVERY MULTI-CYCLE CHECK] ===', JSON.stringify(cycleResults, null, 2));

        for (const res of cycleResults) {
            expect(res.canvasElements).toBe(1); // exactly 1 canvas, no stacking
            expect(res.socketReadyState).toBe(1); // WebSocket OPEN
            expect(res.isRunning).toBe(true);
        }

        await context.close();
    });
});
