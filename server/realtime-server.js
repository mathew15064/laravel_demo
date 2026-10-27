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

// Active connection tracking: ws -> god metadata
const clients = new Map();

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

                    clients.set(ws, { god_id, uuid, name, god_color });

                    // Register presence in Redis
                    await redisCmd.sadd('paradise:online_gods', String(god_id));
                    await redisCmd.set(
                        `paradise:presence:${god_id}`,
                        JSON.stringify({ god_id, uuid, name, god_color, joined_at: Date.now() }),
                        'EX',
                        3600
                    );

                    console.log(`[Paradise-WS] God joined: ${name} (ID: ${god_id}, Color: ${god_color})`);

                    // Publish join event
                    await publishWorldEvent('god.joined', god_id, god_id, {
                        god_id,
                        uuid,
                        name,
                        god_color,
                        message: `✨ Một luồng ánh sáng xuất hiện trên bầu trời. Vị thần ${name} đã giáng thế!`,
                    });
                    break;
                }

                case 'god.move': {
                    const clientData = clients.get(ws);
                    if (!clientData || !msg.position) return;

                    const { god_id } = clientData;
                    const pos = msg.position;
                    const focus = msg.focus || null;

                    // Update position in Redis
                    await redisCmd.set(
                        `paradise:pos:${god_id}`,
                        JSON.stringify(pos),
                        'EX',
                        300
                    );

                    // Broadcast movement to all other clients immediately
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

        if (!otherActive) {
            console.log(`[Paradise-WS] God left: ${name} (ID: ${god_id})`);
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

// Authoritative Drowning Ticker: runs every 1000ms
let isCheckingDrowning = false;
const drowningTicker = setInterval(async () => {
    if (isCheckingDrowning) return;
    isCheckingDrowning = true;
    try {
        const resp = await fetch(`${LARAVEL_API_URL}/api/world`);
        if (resp.ok) {
            const data = await resp.json();
            const now = Date.now();
            const drowningCitizens = (data.citizens || []).filter(
                (c) => c.status === 'drowning' && c.drowning_deadline_at && c.drowning_deadline_at <= now
            );

            for (const dc of drowningCitizens) {
                console.log(`[Paradise-WS] Citizen ${dc.name} (${dc.id}) deadline expired. Triggering authoritative drown...`);
                try {
                    const drownResp = await fetch(`${LARAVEL_API_URL}/api/citizens/${dc.id}/drown`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                    });
                    if (drownResp.ok) {
                        console.log(`[Paradise-WS] Authoritative drown completed for ${dc.name}.`);
                    }
                } catch (derr) {
                    console.error(`[Paradise-WS] Error finalizing drown for ${dc.id}:`, derr.message);
                }
            }
        }
    } catch (e) {
        // Ignore network hiccups while Laravel server might be starting up
    } finally {
        isCheckingDrowning = false;
    }
}, 1000);

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('[Paradise-WS] SIGTERM received. Closing server...');
    clearInterval(heartbeatInterval);
    clearInterval(drowningTicker);
    wss.close();
    redisCmd.disconnect();
    redisSub.disconnect();
    process.exit(0);
});

console.log(`[Paradise-WS] Realtime WebSocket server listening on port ${PORT}`);
