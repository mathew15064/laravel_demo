/**
 * Paradise Gods - API Client
 * Manages communication with Laravel simulation backend.
 */
export class ApiClient {
    constructor() {
        this.godUuid = localStorage.getItem('paradise_god_uuid') || null;
        this.csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
    }

    setGodUuid(uuid) {
        this.godUuid = uuid;
        if (uuid) {
            localStorage.setItem('paradise_god_uuid', uuid);
        } else {
            localStorage.removeItem('paradise_god_uuid');
        }
    }

    getGodUuid() {
        return this.godUuid;
    }

    async request(url, options = {}) {
        const headers = {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN': this.csrfToken,
            ...(options.headers || {}),
        };

        if (this.godUuid) {
            headers['X-God-UUID'] = this.godUuid;
        }

        const config = {
            ...options,
            headers,
        };

        try {
            const response = await fetch(url, config);
            const data = await response.json().catch(() => null);

            return {
                ok: response.ok,
                status: response.status,
                data: data || {},
            };
        } catch (error) {
            return {
                ok: false,
                status: 0,
                error: error.message,
                data: { status: 'error', code: 'NETWORK_ERROR' },
            };
        }
    }

    async fetchWorld() {
        const query = this.godUuid ? `?god_uuid=${encodeURIComponent(this.godUuid)}` : '';
        return this.request(`/api/world${query}`, { method: 'GET' });
    }

    async checkDatabaseHealth() {
        return this.request('/api/health/database', { method: 'GET' });
    }

    async registerGod(name) {
        const res = await this.request('/api/gods', {
            method: 'POST',
            body: JSON.stringify({ name }),
        });
        if (res.ok && res.data?.god?.uuid) {
            this.setGodUuid(res.data.god.uuid);
        }
        return res;
    }

    async fetchGod(uuid) {
        return this.request(`/api/gods/${uuid}`, { method: 'GET' });
    }

    async renameGod(name) {
        if (!this.godUuid) return { ok: false };
        return this.request(`/api/gods/${this.godUuid}`, {
            method: 'PATCH',
            body: JSON.stringify({ name }),
        });
    }

    async renameIsland(islandId, name) {
        return this.request(`/api/islands/${islandId}`, {
            method: 'PATCH',
            body: JSON.stringify({ name }),
        });
    }

    async createCitizen(islandId, name) {
        return this.request(`/api/islands/${islandId}/citizens`, {
            method: 'POST',
            body: JSON.stringify({
                name,
                god_uuid: this.godUuid,
            }),
        });
    }

    async renameCitizen(citizenId, name) {
        return this.request(`/api/citizens/${citizenId}`, {
            method: 'PATCH',
            body: JSON.stringify({ name }),
        });
    }

    async moveCitizen(citizenId, targetIslandId, posX, posZ) {
        return this.request(`/api/citizens/${citizenId}/move`, {
            method: 'POST',
            body: JSON.stringify({
                target_island_id: targetIslandId,
                position_x: posX,
                position_z: posZ,
            }),
        });
    }

    async markDrowning(citizenId) {
        return this.request(`/api/citizens/${citizenId}/drowning`, {
            method: 'POST',
        });
    }

    async rescueCitizen(citizenId) {
        return this.request(`/api/citizens/${citizenId}/rescue`, {
            method: 'POST',
        });
    }

    async drownCitizen(citizenId) {
        return this.request(`/api/citizens/${citizenId}/drown`, {
            method: 'POST',
        });
    }

    async resetWorld() {
        return this.request('/api/world/reset', { method: 'POST' });
    }
}
