/**
 * Paradise Gods - Drowning & Rescue System
 * Tracks drowning citizens, updates 3.0s countdowns, handles rescue flights, and manages drowning death.
 */
export class DrowningSystem {
    constructor(apiClient, alertUi, toastUi, effectsSystem) {
        this.apiClient = apiClient;
        this.alertUi = alertUi;
        this.toastUi = toastUi;
        this.effectsSystem = effectsSystem;

        this.timeoutDuration = 3000; // 3.0 seconds default
        this.drowningCitizens = new Map(); // citizenId -> entry
    }

    setTimeoutDuration(ms) {
        if (ms && ms > 500) {
            this.timeoutDuration = ms;
        }
    }

    startDrowning(citizen, onRescueCallback, onDeathCallback) {
        const id = citizen.id;
        if (this.drowningCitizens.has(id)) return;

        // Visual water splash at entry
        this.effectsSystem.createWaterSplash(citizen.group.position.x, citizen.group.position.z);

        const entry = {
            citizen,
            remainingTime: this.timeoutDuration,
            onRescueCallback,
            onDeathCallback,
        };

        this.drowningCitizens.set(id, entry);

        // Notify Laravel backend that citizen is drowning (population remains unchanged!)
        this.apiClient.markDrowning(id);

        // Show drowning alert card in UI
        this.alertUi.addAlert(citizen, this.timeoutDuration, () => {
            this.rescueCitizen(id);
        });

        this.toastUi.show(`⚠ ${citizen.name} đã rơi xuống biển và đang chết đuối!`, 'warning');
    }

    rescueCitizen(citizenId) {
        const entry = this.drowningCitizens.get(citizenId);
        if (!entry) return;

        const citizen = entry.citizen;
        this.drowningCitizens.delete(citizenId);
        this.alertUi.removeAlert(citizenId);

        // Fly back to land animation
        const targetIsland = citizen.currentIsland;
        const targetX = targetIsland ? targetIsland.worldX : 0;
        const targetZ = targetIsland ? targetIsland.worldZ : 0;

        citizen.status = 'alive';
        citizen.state = 'idle';

        // Animate citizen lifting out of water back onto island
        this.animateRescueFlight(citizen, targetX, targetZ, () => {
            if (entry.onRescueCallback) {
                entry.onRescueCallback(citizen);
            }
        });

        // Notify backend & update God rescued statistics
        this.apiClient.rescueCitizen(citizenId).then((res) => {
            if (res.ok && res.data?.god_stats) {
                if (this.onStatsUpdated) this.onStatsUpdated(res.data.god_stats);
            }
        });

        this.toastUi.show(`Đã cứu ${citizen.name} thoát khỏi biển sâu!`, 'success');
    }

    confirmDeath(citizenId) {
        const entry = this.drowningCitizens.get(citizenId);
        if (!entry) return;

        const citizen = entry.citizen;
        this.drowningCitizens.delete(citizenId);
        this.alertUi.removeAlert(citizenId);

        citizen.status = 'dead';
        citizen.state = 'dead';

        // Sinking animation into deep ocean
        this.animateSinking(citizen, () => {
            citizen.dispose();
            if (entry.onDeathCallback) {
                entry.onDeathCallback(citizen);
            }
        });

        // Notify backend that citizen has drowned (decrements population & updates God stats)
        this.apiClient.drownCitizen(citizenId).then((res) => {
            if (res.ok) {
                if (res.data?.god_stats && this.onStatsUpdated) {
                    this.onStatsUpdated(res.data.god_stats);
                }
                if (res.data?.world_population !== undefined && this.onWorldPopulationUpdated) {
                    this.onWorldPopulationUpdated(res.data.world_population);
                }
            }
        });

        this.toastUi.show(`Biển đã nuốt chửng ${citizen.name}.`, 'danger');
    }

    animateRescueFlight(citizen, targetX, targetZ, onComplete) {
        const startPos = citizen.group.position.clone();
        const duration = 1.0;
        let elapsed = 0;

        const flightInterval = setInterval(() => {
            elapsed += 0.02;
            const t = Math.min(elapsed / duration, 1.0);
            const easeT = t * t * (3 - 2 * t); // smoothstep

            citizen.group.position.x = startPos.x + (targetX - startPos.x) * easeT;
            citizen.group.position.z = startPos.z + (targetZ - startPos.z) * easeT;
            // High parabolic arc upward
            citizen.group.position.y = startPos.y + Math.sin(t * Math.PI) * 5.0 + (2.0 - startPos.y) * t;

            if (t >= 1.0) {
                clearInterval(flightInterval);
                citizen.group.position.set(targetX, 2.0, targetZ);
                if (onComplete) onComplete();
            }
        }, 20);
    }

    animateSinking(citizen, onComplete) {
        let elapsed = 0;
        const sinkInterval = setInterval(() => {
            elapsed += 0.03;
            citizen.group.position.y -= 0.08;
            citizen.group.scale.multiplyScalar(0.96);

            if (elapsed >= 1.2) {
                clearInterval(sinkInterval);
                if (onComplete) onComplete();
            }
        }, 30);
    }

    update(delta) {
        const deltaMs = delta * 1000;
        const toDrown = [];

        this.drowningCitizens.forEach((entry, id) => {
            entry.remainingTime -= deltaMs;
            if (entry.remainingTime <= 0) {
                toDrown.push(id);
            } else {
                this.alertUi.updateAlert(id, entry.remainingTime);
            }
        });

        toDrown.forEach((id) => this.confirmDeath(id));
    }
}
