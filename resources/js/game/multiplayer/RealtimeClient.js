/**
 * Paradise Gods - Realtime WebSocket Client
 * Connects browser to central WebSocket server, manages 2-way event synchronization,
 * and implements a clean reconnection state machine with graceful UX.
 */
export class RealtimeClient {
    constructor(wsUrl = null, toast = null) {
        const metaTag = document.querySelector('meta[name="ws-url"]');
        const defaultHost = window.location.hostname || '127.0.0.1';
        this.wsUrl = wsUrl || metaTag?.getAttribute('content') || `ws://${defaultHost}:8089`;
        this.toast = toast;

        this.socket = null;
        this.reconnectTimer = null;
        this.reconnectAttempts = 0;
        this.isExplicitlyClosed = false;
        this.currentGod = null;

        // Connection State Machine: CONNECTING, CONNECTED, RECONNECTING, DEGRADED, OFFLINE
        this.state = 'CONNECTING';
        this.disconnectStartedAt = null;
        this.disconnectNoticeTimer = null;
        this.degradedNoticeTimer = null;

        // Throttled movement sender (~12 updates/sec)
        this.lastMoveSentAt = 0;
        this.moveThrottleMs = 80;

        // Throttled citizen drag sender (~15 updates/sec)
        this.lastCitizenDragSentAt = 0;
        this.citizenDragThrottleMs = 65;

        // UI Indicator element
        this.indicatorEl = document.getElementById('reconnect-indicator');

        // Reconnect callback (e.g. for world snapshot reconciliation)
        this.onReconnected = null;

        // Event callbacks
        this.handlers = {
            'presence.sync': [],
            'god.joined': [],
            'god.left': [],
            'god.moved': [],
            'god.created': [],
            'god.profile_updated': [],
            'citizen.created': [],
            'citizen.grabbed': [],
            'citizen.moved': [],
            'citizen.released': [],
            'citizen.thrown': [],
            'citizen.drowning': [],
            'citizen.rescued': [],
            'citizen.drowned': [],
            'citizen.renamed': [],
            'island.renamed': [],
            'divine.blessing': [],
            'divine.emote': [],
            'world.reset': [],
        };

        // Heartbeat interval (every 5 seconds)
        this.heartbeatInterval = setInterval(() => {
            if (this.socket && this.socket.readyState === WebSocket.OPEN) {
                this.socket.send(JSON.stringify({ type: 'god.heartbeat' }));
            }
        }, 5000);
    }

    on(eventType, callback) {
        if (!this.handlers[eventType]) {
            this.handlers[eventType] = [];
        }
        this.handlers[eventType].push(callback);
    }

    connect(god) {
        if (god) this.currentGod = god;
        this.isExplicitlyClosed = false;

        try {
            this.socket = new WebSocket(this.wsUrl);
        } catch (e) {
            console.warn('[RealtimeClient] Connection creation error:', e.message);
            this.handleDisconnect();
            return;
        }

        this.socket.onopen = () => {
            console.log('[RealtimeClient] Connected to Paradise Realtime Server at', this.wsUrl);
            const wasDisconnected = this.state === 'RECONNECTING' || this.state === 'DEGRADED';
            const duration = this.disconnectStartedAt ? Date.now() - this.disconnectStartedAt : 0;

            this.state = 'CONNECTED';
            this.reconnectAttempts = 0;
            this.clearDisconnectTimers();

            if (this.indicatorEl) {
                this.indicatorEl.classList.add('hidden');
            }

            if (wasDisconnected && duration >= 3000 && this.toast) {
                this.toast.show('Đã kết nối lại', 'success');
            }

            if (this.currentGod) {
                this.sendJoin(this.currentGod);
            }

            if (wasDisconnected && this.onReconnected) {
                this.onReconnected();
            }

            this.disconnectStartedAt = null;
        };

        this.socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                this.handleIncomingEvent(data);
            } catch (e) {
                console.error('[RealtimeClient] Parse error:', e.message);
            }
        };

        this.socket.onclose = () => {
            if (!this.isExplicitlyClosed) {
                this.handleDisconnect();
            }
        };

        this.socket.onerror = (err) => {
            console.warn('[RealtimeClient] Socket error:', err.message || 'error');
        };
    }

    simulateDisconnect(durationMs = 4000) {
        if (this.socket) {
            this.socket.close();
        }
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        this.handleDisconnect();
        if (durationMs > 0) {
            if (this.reconnectTimer) {
                clearTimeout(this.reconnectTimer);
            }
            this.reconnectTimer = setTimeout(() => {
                this.reconnectTimer = null;
                this.connect(this.currentGod);
            }, durationMs);
        }
    }

    handleDisconnect() {
        if (this.isExplicitlyClosed) return;

        if (!this.disconnectStartedAt) {
            this.disconnectStartedAt = Date.now();
            this.state = 'RECONNECTING';

            // Disconnect < 3s: show NOTHING. Silent retry.
            // Disconnect 3s-10s: show small indicator in corner.
            this.disconnectNoticeTimer = setTimeout(() => {
                if (this.state === 'RECONNECTING' && this.indicatorEl) {
                    this.indicatorEl.classList.remove('hidden');
                }
            }, 3000);

            // Disconnect > 10s: degraded state, small toast.
            this.degradedNoticeTimer = setTimeout(() => {
                if (this.state === 'RECONNECTING') {
                    this.state = 'DEGRADED';
                    if (this.toast) {
                        this.toast.show('Realtime tạm thời mất kết nối. Đang thử kết nối lại...', 'info');
                    }
                }
            }, 10000);
        }

        this.scheduleReconnect();
    }

    clearDisconnectTimers() {
        if (this.disconnectNoticeTimer) {
            clearTimeout(this.disconnectNoticeTimer);
            this.disconnectNoticeTimer = null;
        }
        if (this.degradedNoticeTimer) {
            clearTimeout(this.degradedNoticeTimer);
            this.degradedNoticeTimer = null;
        }
    }

    scheduleReconnect() {
        if (this.reconnectTimer || this.isExplicitlyClosed) return;

        this.reconnectAttempts++;
        // Exponential backoff with small jitter: 500ms, 1s, 2s, 3s, 5s...
        const delays = [500, 1000, 2000, 3000, 5000];
        const baseDelay = delays[Math.min(this.reconnectAttempts - 1, delays.length - 1)];
        const jitter = Math.random() * 200;
        const delay = baseDelay + jitter;

        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.connect(this.currentGod);
        }, delay);
    }

    sendJoin(god) {
        this.currentGod = god;
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;

        this.socket.send(JSON.stringify({
            type: 'god.join',
            god_id: god.id,
            uuid: god.uuid,
            name: god.name,
            god_color: god.god_color || '#8b5cf6',
        }));
    }

    sendMove(position, focus = null) {
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN || !this.currentGod) return;

        const now = performance.now();
        if (now - this.lastMoveSentAt < this.moveThrottleMs) {
            return;
        }
        this.lastMoveSentAt = now;

        this.socket.send(JSON.stringify({
            type: 'god.move',
            position: {
                x: Number(position.x.toFixed(2)),
                y: Number(position.y.toFixed(2)),
                z: Number(position.z.toFixed(2)),
            },
            focus: focus ? {
                x: Number(focus.x.toFixed(2)),
                y: Number(focus.y.toFixed(2)),
                z: Number(focus.z.toFixed(2)),
            } : null,
        }));
    }

    sendCitizenDrag(citizenId, position, version = 1) {
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN || !this.currentGod) return;

        const now = performance.now();
        if (now - this.lastCitizenDragSentAt < this.citizenDragThrottleMs) {
            return;
        }
        this.lastCitizenDragSentAt = now;

        this.socket.send(JSON.stringify({
            type: 'citizen.drag',
            citizen_id: citizenId,
            position: {
                x: Number(position.x.toFixed(2)),
                y: Number(position.y.toFixed(2)),
                z: Number(position.z.toFixed(2)),
            },
            version: version,
        }));
    }

    sendBless(targetGod) {
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN || !this.currentGod) return;
        this.socket.send(JSON.stringify({
            type: 'divine.bless',
            target_id: targetGod.id,
            target_name: targetGod.name,
        }));
    }

    sendEmote(targetGod, emoteType = 'greet') {
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN || !this.currentGod) return;
        this.socket.send(JSON.stringify({
            type: 'divine.emote',
            emote_type: emoteType,
            target_id: targetGod.id,
            target_name: targetGod.name,
        }));
    }

    handleIncomingEvent(data) {
        const type = data.event_type;
        if (!type) return;

        const callbacks = this.handlers[type] || [];
        for (const cb of callbacks) {
            try {
                cb(data.payload || {}, data);
            } catch (err) {
                console.error(`[RealtimeClient] Handler error for ${type}:`, err);
            }
        }
    }

    disconnect() {
        this.isExplicitlyClosed = true;
        this.clearDisconnectTimers();
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
        if (this.indicatorEl) {
            this.indicatorEl.classList.add('hidden');
        }
    }
}
