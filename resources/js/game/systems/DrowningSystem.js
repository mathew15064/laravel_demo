import { RescueBeacon } from '../multiplayer/RescueBeacon.js';

/**
 * Paradise Gods - Server Authoritative Drowning & Rescue System
 * Computes remaining countdown from server timestamp (drowning_deadline_at).
 * Manages 3D Emergency Rescue Beacons and cooperative rescue animations.
 */
export class DrowningSystem {
    constructor(scene, apiClient, alertUi, toastUi, effectsSystem) {
        this.scene = scene;
        this.apiClient = apiClient;
        this.alertUi = alertUi;
        this.toastUi = toastUi;
        this.effectsSystem = effectsSystem;

        this.timeoutDuration = 3000;
        this.drowningCitizens = new Map(); // citizenId -> entry
    }

    setTimeoutDuration(ms) {
        if (ms && ms > 500) {
            this.timeoutDuration = ms;
        }
    }

    startDrowning(citizen, deadlineAt = null, version = 1, onRescueCallback = null, onDeathCallback = null) {
        const id = citizen.id;

        const effectiveDeadline = deadlineAt || (Date.now() + this.timeoutDuration);

        // If already tracking this citizen, update deadline
        if (this.drowningCitizens.has(id)) {
            const existing = this.drowningCitizens.get(id);
            existing.deadlineAt = effectiveDeadline;
            return;
        }

        // Visual water splash at entry
        this.effectsSystem.createWaterSplash(citizen.group.position.x, citizen.group.position.z);

        // Create 3D vertical emergency rescue beacon
        const beacon = new RescueBeacon(this.scene, {
            x: citizen.group.position.x,
            z: citizen.group.position.z,
        });

        const entry = {
            citizen,
            deadlineAt: effectiveDeadline,
            version,
            beacon,
            isFinalizing: false,
            onRescueCallback,
            onDeathCallback,
        };

        this.drowningCitizens.set(id, entry);
        citizen.status = 'drowning';
        citizen.state = 'drowning';

        // Add to UI alert list with countdown calculated from deadline
        this.alertUi.addAlert(citizen, entry.deadlineAt, () => {
            this.rescueCitizen(id);
        });

        this.toastUi.show(`🌊 ${citizen.name} rơi xuống biển và đang chết đuối! Cần cứu trợ gấp!`, 'warning');
    }

    update(delta) {
        const now = Date.now();
        for (const [id, entry] of this.drowningCitizens.entries()) {
            if (entry.beacon) {
                entry.beacon.setPosition(entry.citizen.group.position.x, entry.citizen.group.position.z);
                entry.beacon.update(delta);
            }

            // Client-side expiration check
            if (now >= entry.deadlineAt && !entry.isFinalizing) {
                entry.isFinalizing = true;
                this.apiClient.request(`/api/citizens/${id}/drown`, { method: 'POST' }).then((res) => {
                    this.confirmDeath(id);
                    if (res.ok && res.data?.world_population !== undefined && this.onWorldPopulationUpdated) {
                        this.onWorldPopulationUpdated(res.data.world_population);
                    }
                }).catch(() => {
                    this.confirmDeath(id);
                });
            }
        }
    }

    async rescueCitizen(citizenId) {
        const entry = this.drowningCitizens.get(citizenId);
        if (!entry) return;

        // Call backend atomic rescue
        const res = await this.apiClient.request(`/api/citizens/${citizenId}/rescue`, { method: 'POST' });

        if (res.ok && res.data?.status === 'ok') {
            this.handleRescueSuccess(citizenId, res.data);
        } else if (res.data?.status === 'already_rescued') {
            this.toastUi.show(res.data.message || 'Cư dân đã được một vị thần khác giải cứu trước!', 'info');
            this.clearDrowning(citizenId);
        } else if (res.status === 410 || res.data?.status === 'already_dead') {
            this.toastUi.show(res.data?.message || 'Đã quá trễ, cư dân đã chìm xuống đáy biển.', 'danger');
            this.confirmDeath(citizenId);
        }
    }

    handleRescueSuccess(citizenId, data) {
        const entry = this.drowningCitizens.get(citizenId);
        const citizen = entry ? entry.citizen : null;

        this.clearDrowning(citizenId);

        if (citizen) {
            citizen.status = 'alive';
            citizen.state = 'idle';

            const safePos = data.safe_position || { x: 0, y: 0, z: 0 };

            // Levitate and fly back to land animation
            this.animateRescueFlight(citizen, safePos.x, safePos.z, () => {
                if (entry && entry.onRescueCallback) {
                    entry.onRescueCallback(citizen);
                }
            });
        }

        if (data.savior?.stats && this.onStatsUpdated) {
            this.onStatsUpdated(data.savior.stats);
        }

        this.toastUi.show(data.message || `Đã cứu ${citizen?.name || 'cư dân'} thoát khỏi biển sâu!`, 'success');
    }

    clearDrowning(citizenId) {
        const entry = this.drowningCitizens.get(citizenId);
        if (entry) {
            if (entry.beacon) {
                entry.beacon.dispose();
            }
            this.drowningCitizens.delete(citizenId);
            this.alertUi.removeAlert(citizenId);
        }
    }

    confirmDeath(citizenId) {
        const entry = this.drowningCitizens.get(citizenId);
        if (!entry) return;

        const citizen = entry.citizen;
        this.clearDrowning(citizenId);

        citizen.status = 'dead';
        citizen.state = 'dead';

        this.animateSinking(citizen, () => {
            citizen.dispose();
            if (entry.onDeathCallback) {
                entry.onDeathCallback(citizen);
            }
        });
    }

    animateRescueFlight(citizen, targetX, targetZ, onDone) {
        const startX = citizen.group.position.x;
        const startY = citizen.group.position.y;
        const startZ = citizen.group.position.z;

        let t = 0;
        const animate = () => {
            t += 0.035;
            const progress = Math.min(t, 1.0);
            const ease = 0.5 - 0.5 * Math.cos(progress * Math.PI);

            citizen.group.position.x = startX + (targetX - startX) * ease;
            citizen.group.position.z = startZ + (targetZ - startZ) * ease;

            const arc = Math.sin(progress * Math.PI) * 5.0;
            citizen.group.position.y = startY + (2.0 - startY) * ease + arc;

            if (progress < 1.0) {
                requestAnimationFrame(animate);
            } else {
                citizen.group.position.set(targetX, 2.0, targetZ);
                if (onDone) onDone();
            }
        };
        requestAnimationFrame(animate);
    }

    animateSinking(citizen, onDone) {
        let t = 0;
        const animate = () => {
            t += 0.03;
            citizen.group.position.y -= 0.04;
            citizen.group.scale.multiplyScalar(0.97);

            if (t < 1.0) {
                requestAnimationFrame(animate);
            } else {
                if (onDone) onDone();
            }
        };
        requestAnimationFrame(animate);
    }

    dispose() {
        for (const entry of this.drowningCitizens.values()) {
            if (entry.beacon) entry.beacon.dispose();
        }
        this.drowningCitizens.clear();
    }
}
