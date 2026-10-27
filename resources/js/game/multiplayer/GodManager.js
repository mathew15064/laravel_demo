import { DivineAvatar } from './DivineAvatar.js';

/**
 * Paradise Gods - God Manager
 * Tracks all remote online Gods in the world, renders their avatars,
 * and enables interaction / clicking.
 */
export class GodManager {
    constructor(scene, onSelectGodCallback = null) {
        this.scene = scene;
        this.onSelectGod = onSelectGodCallback;
        this.avatars = new Map(); // god_id -> DivineAvatar
        this.onlineGodsList = []; // list of god metadata for HUD
    }

    syncOnlineGods(godsList, currentGodId = null) {
        this.onlineGodsList = godsList || [];
        const seenIds = new Set();

        (godsList || []).forEach((g) => {
            const id = g.id || g.god_id;
            seenIds.add(id);

            // Don't render avatar for local current player
            if (currentGodId && id === currentGodId) return;

            if (!this.avatars.has(id)) {
                this.addGod(g);
            } else {
                const avatar = this.avatars.get(id);
                if (g.position) {
                    avatar.setTargetPosition(g.position);
                }
            }
        });

        // Prune any gods no longer online
        for (const [id, avatar] of this.avatars.entries()) {
            if (!seenIds.has(id)) {
                this.removeGod(id);
            }
        }
    }

    addGod(godData) {
        const id = godData.id || godData.god_id;
        if (!id || this.avatars.has(id)) return;

        const avatar = new DivineAvatar(this.scene, godData);
        this.avatars.set(id, avatar);

        // Add to metadata list if not present
        if (!this.onlineGodsList.some((g) => (g.id || g.god_id) === id)) {
            this.onlineGodsList.push(godData);
        }
    }

    removeGod(godId) {
        const avatar = this.avatars.get(godId);
        if (!avatar) return;

        // Animate gentle fade out before removing
        avatar.playDespawnFade(() => {
            avatar.dispose();
            this.avatars.delete(godId);
        });

        this.onlineGodsList = this.onlineGodsList.filter((g) => (g.id || g.god_id) !== godId);
    }

    updateGodPosition(godId, position) {
        const avatar = this.avatars.get(godId);
        if (avatar && position) {
            avatar.setTargetPosition(position);
        }
    }

    getAvatar(godId) {
        return this.avatars.get(godId);
    }

    getGodMeshes() {
        const meshes = [];
        for (const avatar of this.avatars.values()) {
            meshes.push(avatar.group);
        }
        return meshes;
    }

    update(delta, elapsed) {
        for (const avatar of this.avatars.values()) {
            avatar.update(delta, elapsed);
        }
    }

    dispose() {
        for (const avatar of this.avatars.values()) {
            avatar.dispose();
        }
        this.avatars.clear();
        this.onlineGodsList = [];
    }
}
