import { test, expect } from '@playwright/test';

test.describe('Performance Benchmark Suite', () => {
    test('Measure Baseline Metrics: Single Client & Two Clients', async ({ browser }) => {
        const context1 = await browser.newContext({
            viewport: { width: 1280, height: 720 },
            deviceScaleFactor: 2, // test with 2x retina display
        });
        const page1 = await context1.newPage();

        // Track WebSocket metrics
        await page1.addInitScript(() => {
            window.__wsStats = {
                sentMsgs: 0,
                sentBytes: 0,
                recvMsgs: 0,
                recvBytes: 0,
                msgTypesSent: {},
                msgTypesRecv: {},
            };

            const OrigWebSocket = window.WebSocket;
            window.WebSocket = function (...args) {
                const ws = new OrigWebSocket(...args);
                const origSend = ws.send;
                ws.send = function (data) {
                    window.__wsStats.sentMsgs++;
                    const byteLen = typeof data === 'string' ? new Blob([data]).size : (data.byteLength || 0);
                    window.__wsStats.sentBytes += byteLen;
                    try {
                        const parsed = JSON.parse(data);
                        const type = parsed.type || 'unknown';
                        window.__wsStats.msgTypesSent[type] = (window.__wsStats.msgTypesSent[type] || 0) + 1;
                    } catch (e) {}
                    return origSend.apply(this, arguments);
                };

                ws.addEventListener('message', (event) => {
                    window.__wsStats.recvMsgs++;
                    const byteLen = typeof event.data === 'string' ? new Blob([event.data]).size : (event.data.byteLength || 0);
                    window.__wsStats.recvBytes += byteLen;
                    try {
                        const parsed = JSON.parse(event.data);
                        const type = parsed.event_type || 'unknown';
                        window.__wsStats.msgTypesRecv[type] = (window.__wsStats.msgTypesRecv[type] || 0) + 1;
                    } catch (e) {}
                });

                return ws;
            };
        });

        await page1.goto('/?god=Zeus');
        await page1.waitForSelector('#game-canvas-container canvas', { timeout: 15000 });
        await page1.waitForFunction(() => window.__paradiseGame?.activeParadiseWorld?.citizens?.length > 0);

        // Run profiling loop for 4 seconds
        const metrics = await page1.evaluate(async () => {
            const world = window.__paradiseGame.activeParadiseWorld;
            const renderer = world.renderer;

            const frameTimes = [];
            let lastTime = performance.now();
            let drawCalls = 0;
            let triangles = 0;
            let geometries = 0;
            let textures = 0;
            let framesCount = 0;

            const startTime = performance.now();
            while (performance.now() - startTime < 4000) {
                await new Promise((r) => requestAnimationFrame(r));
                const now = performance.now();
                const delta = now - lastTime;
                lastTime = now;
                frameTimes.push(delta);
                framesCount++;

                drawCalls = renderer.info.render.calls;
                triangles = renderer.info.render.triangles;
                geometries = renderer.info.memory.geometries;
                textures = renderer.info.memory.textures;
            }

            const totalDuration = performance.now() - startTime;
            const avgFps = (framesCount / (totalDuration / 1000));
            frameTimes.shift(); // remove initial frame outlier
            const maxFrameTime = Math.max(...frameTimes);
            const minFps = 1000 / maxFrameTime;
            const avgFrameTime = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;

            // Count visible labels
            const visibleLabels = world.citizens.filter((c) => c.labelSprite && c.labelSprite.visible).length;

            // Breakdown of meshes in scene
            const meshTypes = {};
            let shadowCasters = 0;
            world.scene.traverse((obj) => {
                if (obj.isMesh || obj.isSprite || obj.isInstancedMesh) {
                    const tag = obj.isInstancedMesh ? 'InstancedMesh' : (obj.isSprite ? 'Sprite' : (obj.geometry?.type || 'Mesh'));
                    meshTypes[tag] = (meshTypes[tag] || 0) + 1;
                    if (obj.castShadow) shadowCasters++;
                }
            });

            return {
                avgFps: Math.round(avgFps * 10) / 10,
                minFps: Math.round(minFps * 10) / 10,
                avgFrameTimeMs: Math.round(avgFrameTime * 100) / 100,
                maxFrameTimeMs: Math.round(maxFrameTime * 100) / 100,
                pixelRatio: renderer.getPixelRatio(),
                drawCalls,
                triangles,
                geometries,
                textures,
                totalCitizens: world.citizens.length,
                visibleLabels,
                shadowCasters,
                meshBreakdown: meshTypes,
                wsStats: window.__wsStats,
                durationSeconds: Math.round(totalDuration / 100) / 10,
            };
        });

        const wsSec = metrics.durationSeconds;
        metrics.wsSentRateHz = Math.round((metrics.wsStats.sentMsgs / wsSec) * 10) / 10;
        metrics.wsRecvRateHz = Math.round((metrics.wsStats.recvMsgs / wsSec) * 10) / 10;
        metrics.wsSentBytesSec = Math.round(metrics.wsStats.sentBytes / wsSec);
        metrics.wsRecvBytesSec = Math.round(metrics.wsStats.recvBytes / wsSec);

        console.log('=== [BASELINE PERFORMANCE METRICS] ===');
        console.log(JSON.stringify(metrics, null, 2));

        await context1.close();
    });

    test('Measure Baseline WebSocket Traffic: Two Active Clients', async ({ browser }) => {
        const context1 = await browser.newContext();
        const context2 = await browser.newContext();

        const page1 = await context1.newPage();
        const page2 = await context2.newPage();

        await page1.goto('/?god=Zeus');
        await page2.goto('/?god=Athena');

        await page1.waitForSelector('#game-canvas-container canvas', { timeout: 15000 });
        await page2.waitForSelector('#game-canvas-container canvas', { timeout: 15000 });

        await expect(page1.locator('#hud-presence-list')).toContainText('Athena', { timeout: 8000 });
        await expect(page2.locator('#hud-presence-list')).toContainText('Zeus', { timeout: 8000 });

        // Instrument WebSocket on page1
        await page1.evaluate(() => {
            const rt = window.__paradiseGame.activeParadiseWorld.realtimeClient;
            window.__wsStats = { sentMsgs: 0, sentBytes: 0, recvMsgs: 0, recvBytes: 0, msgTypesSent: {} };
            const origSend = rt.socket.send.bind(rt.socket);
            rt.socket.send = function(data) {
                window.__wsStats.sentMsgs++;
                try {
                    const parsed = JSON.parse(data);
                    window.__wsStats.msgTypesSent[parsed.type] = (window.__wsStats.msgTypesSent[parsed.type] || 0) + 1;
                } catch(e) {}
                const strLen = typeof data === 'string' ? new Blob([data]).size : (data.byteLength || 0);
                window.__wsStats.sentBytes += strLen;
                return origSend(data);
            };
            rt.socket.addEventListener('message', (e) => {
                window.__wsStats.recvMsgs++;
                window.__wsStats.recvBytes += (typeof e.data === 'string' ? new Blob([e.data]).size : e.data.byteLength || 0);
            });
        });

        // 1. Measure Stationary Traffic for 3 seconds
        await page1.waitForTimeout(3000);
        const stationaryStats = await page1.evaluate(() => ({ ...window.__wsStats }));

        console.log('=== [STATIONARY WEBSOCKET TRAFFIC (3s)] ===');
        console.log(JSON.stringify({
            stationarySentRateHz: Math.round((stationaryStats.sentMsgs / 3) * 10) / 10,
            stationaryRecvRateHz: Math.round((stationaryStats.recvMsgs / 3) * 10) / 10,
            typesSent: stationaryStats.msgTypesSent,
        }, null, 2));

        // 2. Measure Moving Traffic for 3 seconds (simulating camera drag/god movement)
        const t0 = Date.now();
        const startMovingStats = await page1.evaluate(() => ({ ...window.__wsStats }));

        // Simulate continuous movement by calling sendMove with shifting coordinates
        await page1.evaluate(async () => {
            const rt = window.__paradiseGame.activeParadiseWorld.realtimeClient;
            for (let i = 0; i < 30; i++) {
                // Moving 1 unit each step, interval 100ms
                rt.sendMove({ x: 10 + i * 0.5, y: 5, z: 20 + i * 0.5 }, { x: 0, y: 0, z: 0 });
                await new Promise(r => setTimeout(r, 100));
            }
        });

        const t1 = Date.now();
        const endMovingStats = await page1.evaluate(() => ({ ...window.__wsStats }));
        const dtSec = (t1 - t0) / 1000;

        const moveSentMsgs = endMovingStats.sentMsgs - startMovingStats.sentMsgs;
        const moveRecvMsgs = endMovingStats.recvMsgs - startMovingStats.recvMsgs;
        const moveSentBytes = endMovingStats.sentBytes - startMovingStats.sentBytes;

        console.log('=== [MOVING WEBSOCKET TRAFFIC (3s)] ===');
        console.log(JSON.stringify({
            durationSec: Math.round(dtSec * 10) / 10,
            sentRateHz: Math.round((moveSentMsgs / dtSec) * 10) / 10,
            recvRateHz: Math.round((moveRecvMsgs / dtSec) * 10) / 10,
            sentBytesSec: Math.round(moveSentBytes / dtSec),
            totalSent: moveSentMsgs,
            totalRecv: moveRecvMsgs,
            typesSent: endMovingStats.msgTypesSent,
        }, null, 2));

        await context1.close();
        await context2.close();
    });
});
