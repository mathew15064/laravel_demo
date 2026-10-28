import { WebSocketServer, WebSocket } from 'ws';
import Redis from 'ioredis';

const PORT = parseInt(process.env.WEBSOCKET_PORT || '8089', 10);
const REDIS_HOST = process.env.REDIS_HOST || '127.0.0.1';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10);
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || '123456';
const LARAVEL_API_URL = process.env.APP_URL || 'http://127.0.0.1:8008';

console.log(`[Paradise-WS] Starting WebSocket server on port ${PORT}...`);

// Redis command client
const redisCmd = new Redis({
    host: REDIS_HOST,
    port: REDIS_PORT,
    password: REDIS_PASSWORD,
    retryStrategy: (times) => Math.min(times * 100, 3000),
});

// Redis subscriber client
const redisSub = new Redis({
    host: REDIS_HOST,
    port: REDIS_PORT,
    password: REDIS_PASSWORD,
    retryStrategy: (times) => Math.min(times * 100, 3000),
});

const wss = new WebSocketServer({ port: PORT });

// Clean up stale presence on server boot
redisCmd.del('paradise:online_gods').catch(() => {});

// Active connection tracking: ws -> god metadata
const clients = new Map();

// Grace period timers for transient disconnects (10 seconds)
const disconnectGraceTimers = new Map(); // god_id -> { timer, name }

// In-memory throttling for Redis position updates (max 1 write / sec per god)
const lastPosRedisWrite = new Map(); // god_id -> timestamp

// In-memory event-driven tracking of drowning citizens (eliminates 1s /api/world polling)
const activeDrowningWatch = new Map(); // citizen_id -> deadline_at

// Helper to broadcast to all connected WebSocket clients
function broadcastToAll(payload, excludeWs = null) {
    const raw = typeof payload === 'string' ? payload : JSON.stringify(payload);
    for (const [client] of clients.entries()) {
        if (client !== excludeWs && client.readyState === WebSocket.OPEN) {
            try {
                client.send(raw);
            } catch (err) {
                console.error('[Paradise-WS] Error sending to client:', err.message);
            }
        }
    }
}

// Subscribe to Redis paradise.events channel (fired by Laravel or other workers)
redisSub.subscribe('paradise.events', (err, count) => {
    if (err) {
        console.error('[Paradise-WS] Failed to subscribe to paradise.events:', err);
    } else {
        console.log(`[Paradise-WS] Subscribed to paradise.events (${count} channels active)`);
    }
});

redisSub.on('message', (channel, message) => {
    if (channel === 'paradise.events') {
        try {
            const parsed = JSON.parse(message);
            broadcastToAll(parsed);

            // In-memory event-driven drowning tracker (eliminates all /api/world polling)
            if (parsed.event_type === 'citizen.thrown' && parsed.payload?.outcome === 'landed_ocean') {
                if (parsed.payload.citizen_id && parsed.payload.drowning_deadline_at) {
                    activeDrowningWatch.set(parsed.payload.citizen_id, parsed.payload.drowning_deadline_at);
                }
            } else if (parsed.event_type === 'citizen.drowning' && parsed.payload?.citizen_id) {
                if (parsed.payload.drowning_deadline_at) {
                    activeDrowningWatch.set(parsed.payload.citizen_id, parsed.payload.drowning_deadline_at);
                }
            } else if (parsed.event_type === 'citizen.rescued' || parsed.event_type === 'citizen.drowned') {
                if (parsed.payload?.citizen_id) {
                    activeDrowningWatch.delete(parsed.payload.citizen_id);
                }
            }
        } catch (e) {
            console.error('[Paradise-WS] Invalid JSON received from Redis:', message);
        }
    }
});

// Helper to publish event to Redis
async function publishWorldEvent(eventType, actorGodId, entityId, payload) {
    try {
        let current = await redisCmd.get('paradise:world_version');
        if (!current || parseInt(current, 10) < 1000) {
            await redisCmd.set('paradise:world_version', 1000);
        }
        const version = await redisCmd.incr('paradise:world_version');
        const event = {
            event_id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
            world_version: version,
            event_type: eventType,
            actor_god_id: actorGodId || null,
            entity_id: entityId || null,
            occurred_at: Date.now(),
            payload: payload || {},
        };
        await redisCmd.publish('paradise.events', JSON.stringify(event));
        return event;
    } catch (err) {
        console.error('[Paradise-WS] publishWorldEvent error:', err.message);
    }
}

wss.on('connection', (ws, req) => {
    ws.isAlive = true;
    ws.on('pong', () => {
        ws.isAlive = true;
    });

    console.log(`[Paradise-WS] New incoming socket connection from ${req.socket.remoteAddress}`);

    ws.on('message', async (data) => {
        try {
            const msg = JSON.parse(data.toString());

            switch (msg.type) {
                case 'god.join': {
                    const { god_id, uuid, name, god_color } = msg;
                    if (!god_id) return;

                    // If God reconnected during grace period, cancel grace timer
                    if (disconnectGraceTimers.has(god_id)) {
                        console.log(`[Paradise-WS] God ${name} reconnected within grace period. Preserving session.`);
                        clearTimeout(disconnectGraceTimers.get(god_id).timer);
                        disconnectGraceTimers.delete(god_id);
                    }

                    // Count active sockets for this god before registering current
                    let activeBefore = 0;
                    for (const meta of clients.values()) {
                        if (meta.god_id === god_id) activeBefore++;
                    }

                    clients.set(ws, { god_id, uuid, name, god_color });

                    // Register presence in Redis (45s TTL)
                    await redisCmd.sadd('paradise:online_gods', String(god_id));
                    await redisCmd.set(
                        `paradise:presence:${god_id}`,
                        JSON.stringify({ god_id, uuid, name, god_color, joined_at: Date.now() }),
                        'EX',
                        45
                    );

                    // Always broadcast join if this is the first active connection for this god
                    if (activeBefore === 0) {
                        console.log(`[Paradise-WS] God joined: ${name} (ID: ${god_id}, Color: ${god_color})`);
                        await publishWorldEvent('god.joined', god_id, god_id, {
                            god_id,
                            uuid,
                            name,
                            god_color,
                            message: `✨ Một luồng ánh sáng xuất hiện trên bầu trời. Vị thần ${name} đã giáng thế!`,
                        });
                    }

                    // Send current authoritative online gods list directly to this newly joined client
                    const onlineList = [];
                    const seenGodIds = new Set();
                    for (const meta of clients.values()) {
                        if (meta.god_id && !seenGodIds.has(meta.god_id)) {
                            seenGodIds.add(meta.god_id);
                            onlineList.push(meta);
                        }
                    }
                    try {
                        ws.send(JSON.stringify({
                            event_type: 'presence.sync',
                            payload: {
                                online_gods: onlineList,
                            },
                        }));
                    } catch (e) {
                        console.error('[Paradise-WS] Failed to send presence.sync:', e.message);
                    }
                    break;
                }

                case 'god.heartbeat': {
                    const clientData = clients.get(ws);
                    if (clientData && clientData.god_id) {
                        await redisCmd.expire(`paradise:presence:${clientData.god_id}`, 45);
                        await redisCmd.expire(`paradise:pos:${clientData.god_id}`, 45);
                    }
                    break;
                }

                case 'god.move': {
                    const clientData = clients.get(ws);
                    if (!clientData || !msg.position) return;

                    const { god_id } = clientData;
                    const pos = msg.position;
                    const focus = msg.focus || null;

                    // Throttled update to Redis (max 1 write / sec per god) to reduce Redis load
                    const now = Date.now();
                    if (now - (lastPosRedisWrite.get(god_id) || 0) > 1000) {
                        lastPosRedisWrite.set(god_id, now);
                        redisCmd.set(
                            `paradise:pos:${god_id}`,
                            JSON.stringify(pos),
                            'EX',
                            45
                        ).catch(() => {});
                    }

                    // Broadcast movement to all other clients immediately in-memory
                    broadcastToAll(
                        {
                            event_type: 'god.moved',
                            actor_god_id: god_id,
                            payload: {
                                god_id,
                                position: pos,
                                focus,
                            },
                        },
                        ws // exclude sender
                    );
                    break;
                }

                case 'citizen.drag': {
                    const clientData = clients.get(ws);
                    if (!clientData || !msg.citizen_id || !msg.position) return;

                    // Broadcast citizen movement while held in air
                    broadcastToAll(
                        {
                            event_type: 'citizen.moved',
                            actor_god_id: clientData.god_id,
                            payload: {
                                citizen_id: msg.citizen_id,
                                god_id: clientData.god_id,
                                god_name: clientData.name,
                                god_color: clientData.god_color,
                                position: msg.position,
                                version: msg.version || 1,
                            },
                        },
                        ws // exclude dragging client
                    );
                    break;
                }

                case 'divine.emote': {
                    const clientData = clients.get(ws);
                    if (clientData) {
                        await publishWorldEvent('divine.emote', clientData.god_id, msg.target_id || null, {
                            type: msg.emote_type || 'greet',
                            actor_id: clientData.god_id,
                            actor_name: clientData.name,
                            target_id: msg.target_id,
                            target_name: msg.target_name,
                            message: msg.message || `👋 ${clientData.name} gửi cử chỉ thần thánh.`,
                        });
                    }
                    break;
                }

                case 'divine.bless': {
                    const clientData = clients.get(ws);
                    if (clientData) {
                        await publishWorldEvent('divine.blessing', clientData.god_id, msg.target_id || null, {
                            actor_id: clientData.god_id,
                            actor_name: clientData.name,
                            actor_color: clientData.god_color,
                            target_id: msg.target_id,
                            target_name: msg.target_name,
                            message: `✨ ${clientData.name} đã ban phước lành thần thánh cho ${msg.target_name}!`,
                        });
                    }
                    break;
                }

                default:
                    break;
            }
        } catch (e) {
            console.error('[Paradise-WS] Error parsing client message:', e.message);
        }
    });

    ws.on('close', async () => {
        const clientData = clients.get(ws);
        clients.delete(ws);

        if (!clientData) return;

        const { god_id, name } = clientData;

        // Check if god has other active socket connections (e.g. multiple tabs)
        let otherActive = false;
        for (const meta of clients.values()) {
            if (meta.god_id === god_id) {
                otherActive = true;
                break;
            }
        }

        // If no other connections are active, start graceful disconnect period (10 seconds)
        if (!otherActive) {
            console.log(`[Paradise-WS] God ${name} disconnected. Starting 10s grace period before marking offline...`);

            if (disconnectGraceTimers.has(god_id)) {
                clearTimeout(disconnectGraceTimers.get(god_id).timer);
            }

            const timer = setTimeout(async () => {
                disconnectGraceTimers.delete(god_id);

                // Double check if reconnected during timer
                let reconnected = false;
                for (const meta of clients.values()) {
                    if (meta.god_id === god_id) {
                        reconnected = true;
                        break;
                    }
                }

                if (!reconnected) {
                    console.log(`[Paradise-WS] Grace period expired. God left: ${name} (ID: ${god_id})`);
                    try {
                        await redisCmd.srem('paradise:online_gods', String(god_id));
                        await redisCmd.del(`paradise:presence:${god_id}`);
                        await redisCmd.del(`paradise:pos:${god_id}`);

                        await publishWorldEvent('god.left', god_id, god_id, {
                            god_id,
                            name,
                            message: `○ ${name} — vừa rời khỏi thiên đường.`,
                        });
                    } catch (err) {
                        console.error('[Paradise-WS] Error updating presence on disconnect:', err.message);
                    }
                }
            }, 10000);

            disconnectGraceTimers.set(god_id, { timer, name });
        }
    });

    ws.on('error', (err) => {
        console.error('[Paradise-WS] WebSocket connection error:', err.message);
    });
});

// Ping-pong heartbeat to purge dead connections
const heartbeatInterval = setInterval(() => {
    for (const [ws] of clients.entries()) {
        if (ws.isAlive === false) {
            console.log('[Paradise-WS] Terminating stale socket');
            ws.terminate();
            clients.delete(ws);
            continue;
        }
        ws.isAlive = false;
        ws.ping();
    }
}, 30000);

// Backup Authoritative Drowning Ticker: checks in-memory watch map every 3000ms (zero database/world polling)
let isCheckingDrowning = false;
const drowningTicker = setInterval(async () => {
    if (isCheckingDrowning || activeDrowningWatch.size === 0) return;
    isCheckingDrowning = true;
    try {
        const now = Date.now();
        for (const [citizenId, deadlineAt] of activeDrowningWatch.entries()) {
            if (now >= deadlineAt) {
                activeDrowningWatch.delete(citizenId);
                try {
                    await fetch(`${LARAVEL_API_URL}/api/citizens/${citizenId}/drown`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                    });
                } catch (derr) {
                    console.error(`[Paradise-WS] Backup drown error for citizen ${citizenId}:`, derr.message);
                }
            }
        }
    } finally {
        isCheckingDrowning = false;
    }
}, 3000);

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('[Paradise-WS] SIGTERM received. Closing server...');
    clearInterval(heartbeatInterval);
    clearInterval(drowningTicker);
    for (const { timer } of disconnectGraceTimers.values()) {
        clearTimeout(timer);
    }
    disconnectGraceTimers.clear();
    wss.close();
    redisCmd.disconnect();
    redisSub.disconnect();
    process.exit(0);
});

console.log(`[Paradise-WS] Realtime WebSocket server listening on port ${PORT}`);
