/**
 * Paradise Gods - Realtime WebSocket Client
 * Connects browser to central WebSocket server and manages 2-way event synchronization.
 */
export class RealtimeClient {
    constructor(wsUrl = null) {
        const metaTag = document.querySelector('meta[name="ws-url"]');
        const defaultHost = window.location.hostname || '127.0.0.1';
        this.wsUrl = wsUrl || metaTag?.getAttribute('content') || `ws://${defaultHost}:8089`;

        this.socket = null;
        this.reconnectTimer = null;
        this.reconnectAttempts = 0;
        this.isExplicitlyClosed = false;
        this.currentGod = null;

        // Throttled movement sender (~10 updates/sec)
        this.lastMoveSentAt = 0;
        this.pendingMove = null;
        this.moveThrottleMs = 90;

        this.bannerEl = document.getElementById('reconnect-banner');

        // Event callbacks
        this.handlers = {
            'god.joined': [],
            'god.left': [],
            'god.moved': [],
            'god.created': [],
            'god.profile_updated': [],
            'citizen.created': [],
            'citizen.thrown': [],
            'citizen.drowning': [],
            'citizen.rescued': [],
            'citizen.drowned': [],
            'citizen.renamed': [],
            'island.claimed': [],
            'island.renamed': [],
            'divine.blessing': [],
            'divine.emote': [],
            'world.reset': [],
        };
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
            console.warn('[RealtimeClient] Connection error:', e.message);
            this.scheduleReconnect();
            return;
        }

        this.socket.onopen = () => {
            console.log('[RealtimeClient] Connected to Paradise Realtime Server at', this.wsUrl);
            this.reconnectAttempts = 0;
            if (this.bannerEl) this.bannerEl.classList.add('hidden');

            if (this.currentGod) {
                this.sendJoin(this.currentGod);
            }
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
                if (this.bannerEl) this.bannerEl.classList.remove('hidden');
                this.scheduleReconnect();
            }
        };

        this.socket.onerror = (err) => {
            console.warn('[RealtimeClient] Socket error:', err);
        };
    }

    scheduleReconnect() {
        if (this.reconnectTimer || this.isExplicitlyClosed) return;
        this.reconnectAttempts++;
        const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 8000);
        console.log(`[RealtimeClient] Reconnecting in ${Math.round(delay)}ms...`);
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
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
    }
}
