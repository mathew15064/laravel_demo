import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Ocean } from './Ocean.js';
import { Island } from './Island.js';
import { Environment } from './Environment.js';
import { Citizen } from '../entities/Citizen.js';
import { ThrowSystem } from '../systems/ThrowSystem.js';
import { DrowningSystem } from '../systems/DrowningSystem.js';
import { EffectsSystem } from '../systems/EffectsSystem.js';
import { SelectionSystem } from '../systems/SelectionSystem.js';
import { GodManager } from '../multiplayer/GodManager.js';
import { RealtimeClient } from '../multiplayer/RealtimeClient.js';

import { PERFORMANCE_CONFIG } from '../config/performance.js';

/**
 * Paradise Gods - Main 3D World (Thiên Đường Quần Đảo)
 * Manages Three.js rendering, Archipelago, Citizens, Realtime Multiplayer Sync, and Physics.
 */
export class ParadiseWorld {
    constructor(container, apiClient, uiManager, drowningTimeoutMs = 3000) {
        this.container = container;
        this.apiClient = apiClient;
        this.ui = uiManager;
        this.drowningTimeoutMs = drowningTimeoutMs;

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xbae6fd); // tropical sky azure
        this.scene.fog = new THREE.FogExp2(0xbae6fd, 0.007);

        const width = container.clientWidth || window.innerWidth;
        const height = container.clientHeight || window.innerHeight;

        this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 500);
        this.camera.position.set(0, 52, 78);

        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            powerPreference: 'high-performance',
        });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, PERFORMANCE_CONFIG.maxPixelRatio));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFShadowMap;

        this.domElement = this.renderer.domElement;
        this.container.appendChild(this.domElement);

        this.controls = new OrbitControls(this.camera, this.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.maxPolarAngle = Math.PI / 2.15;
        this.controls.minDistance = 15;
        this.controls.maxDistance = 175;
        this.controls.target.set(0, 2, 0);

        this.islands = [];
        this.citizens = [];

        this.lastLabelUpdate = 0;
        this.localPresencePos = { x: 0, y: 8.0, z: 0 };

        this.ocean = new Ocean(this.scene, 320);
        this.environment = new Environment(this.scene);
        this.effects = new EffectsSystem(this.scene);

        // Multiplayer Managers
        this.godManager = new GodManager(this.scene, (godData) => {
            if (this.ui.godProfileModal) {
                this.ui.godProfileModal.show(godData);
            }
        });

        this.realtimeClient = new RealtimeClient(null, this.ui.toast);

        this.drowningSystem = new DrowningSystem(
            this.scene,
            this.apiClient,
            this.ui.drowningAlert,
            this.ui.toast,
            this.effects
        );

        this.drowningSystem.onStatsUpdated = (stats) => {
            if (this.currentGod) {
                this.currentGod.stats = stats;
                this.ui.hud.setGod(this.currentGod);
            }
        };

        this.drowningSystem.onWorldPopulationUpdated = (pop) => {
            this.ui.hud.setWorldPopulation(pop);
        };

        this.throwSystem = new ThrowSystem(
            this.camera,
            this.domElement,
            this.controls,
            { getCitizenMeshes: () => this.citizens.map((c) => c.group) },
            this.apiClient,
            this.realtimeClient
        );

        this.throwSystem.onPickupCallback = (citizen) => {
            this.ui.toast.show(`Thần đã nhấc ${citizen.name} lên không trung!`);
        };

        this.throwSystem.onReleaseCallback = (citizen, wasThrown) => {
            if (wasThrown) {
                this.ui.toast.show(`Thần đã phóng ${citizen.name} bay qua quần đảo!`);
            }
        };

        this.selectionSystem = new SelectionSystem(
            this.camera,
            this.domElement,
            this.controls,
            { getCitizenMeshes: () => this.citizens.map((c) => c.group) },
            { getIslandMeshes: () => this.islands.map((i) => i.group) },
            this.ui.islandPanel,
            this.ui.citizenPanel,
            this.godManager,
            (godData) => {
                if (this.ui.godProfileModal) {
                    this.ui.godProfileModal.show(godData);
                }
            }
        );

        this.initCallbacks();
        this.initMultiplayerEvents();

        this.clock = new THREE.Clock();
        this.isRunning = true;
        this.animate = this.renderLoop.bind(this);
        this.renderLoop();

        this.onResize = () => {
            const w = container.clientWidth || window.innerWidth;
            const h = container.clientHeight || window.innerHeight;
            this.camera.aspect = w / h;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(w, h);
        };
        window.addEventListener('resize', this.onResize);
    }

    initCallbacks() {
        // Island Panel citizen creation
        this.ui.islandPanel.onCreateCitizen = async (island, name) => {
            const res = await this.apiClient.createCitizen(island.id, name);
            if (res.ok && res.data?.citizen) {
                this.spawnCitizen(res.data.citizen, island);
                island.data.population = res.data.island_population;
                island.updateLabel(null, res.data.island_population);
                const popEl = document.getElementById('island-panel-population');
                if (popEl) popEl.textContent = res.data.island_population;
                this.ui.hud.setWorldPopulation(res.data.world_population);
                if (res.data.god_stats && this.currentGod) {
                    this.currentGod.stats = res.data.god_stats;
                    this.ui.hud.setGod(this.currentGod);
                }
                this.ui.toast.show(`✨ ${res.data.message}`, 'success');
            } else {
                this.ui.toast.show(res.data?.message || 'Không thể tạo cư dân lúc này.', 'danger');
            }
        };

        // Island focus
        this.ui.islandPanel.onFocusIsland = (x, z) => {
            this.selectionSystem.focusOn(x, z, 32);
        };

        // Island renamed
        this.ui.islandPanel.onIslandRenamed = (island, newName) => {
            this.ui.toast.show(`Đã đổi tên đảo thành ${newName}.`, 'info');
        };

        // Island claimed (no-op in cooperative shared world)
        this.ui.islandPanel.onIslandClaimed = (island, islandData) => {};

        // Citizen Panel lift/throw
        this.ui.citizenPanel.onLiftCitizen = (citizen) => {
            citizen.group.position.y = 5.5;
            const vx = (Math.random() - 0.5) * 14;
            const vz = (Math.random() - 0.5) * 14;
            citizen.velocity.set(vx, 12.0, vz);
            citizen.isThrown = true;
            this.ui.citizenPanel.hide();

            this.apiClient.request(`/api/citizens/${citizen.id}/throw`, {
                method: 'POST',
                body: JSON.stringify({
                    god_uuid: this.apiClient.getGodUuid(),
                    start_position: { x: citizen.group.position.x, y: 5.5, z: citizen.group.position.z },
                    velocity: { x: vx, y: 12.0, z: vz },
                }),
            });

            this.ui.toast.show(`Thần đã phóng ${citizen.name} lên không trung!`);
        };

        // Citizen Panel rescue
        this.ui.citizenPanel.onRescueCitizen = (citizen) => {
            this.drowningSystem.rescueCitizen(citizen.id);
            this.ui.citizenPanel.hide();
        };

        // HUD click on online god -> open profile & optionally focus on avatar position
        this.ui.hud.onSelectOnlineGod = (god) => {
            if (this.ui.godProfileModal) {
                this.ui.godProfileModal.show(god);
            }
            const avatar = this.godManager.getAvatar(god.id || god.god_id);
            if (avatar) {
                this.selectionSystem.focusOn(avatar.group.position.x, avatar.group.position.z, 30);
            }
        };
    }

    initMultiplayerEvents() {
        // 0. Initial Presence Sync on WebSocket connect/join
        this.realtimeClient.on('presence.sync', (payload) => {
            if (payload && Array.isArray(payload.online_gods)) {
                this.godManager.syncOnlineGods(payload.online_gods, this.currentGod?.id);
                this.ui.hud.updateOnlineGods(this.godManager.onlineGodsList);
            }
        });

        // 1. God joined
        this.realtimeClient.on('god.joined', (payload) => {
            const godId = payload.god_id;
            if (this.currentGod && (this.currentGod.id === godId || this.currentGod.uuid === payload.uuid)) {
                return;
            }
            this.godManager.addGod(payload);
            this.ui.hud.updateOnlineGods(this.godManager.onlineGodsList);
            this.ui.toast.show(payload.message || `✨ Vị thần ${payload.name} đã giáng thế!`, 'info');
        });

        // 2. God left
        this.realtimeClient.on('god.left', (payload) => {
            this.godManager.removeGod(payload.god_id);
            this.ui.hud.addRecentLeave(payload.god_id, payload.name);
            this.ui.toast.show(payload.message || `○ ${payload.name} — vừa rời khỏi thiên đường.`, 'info');
        });

        // 3. God moved
        this.realtimeClient.on('god.moved', (payload) => {
            this.godManager.updateGodPosition(payload.god_id, payload.position);
        });

        // 4. Citizen created
        this.realtimeClient.on('citizen.created', (payload) => {
            const citData = payload.citizen;
            if (!citData) return;

            let citizen = this.citizens.find((c) => c.id === citData.id);
            if (!citizen) {
                const island = this.islands.find((i) => i.id === payload.island_id) || this.islands[0];
                this.spawnCitizen(citData, island);
            }
            if (payload.island_id) {
                const isl = this.islands.find((i) => i.id === payload.island_id);
                if (isl) isl.updateLabel(null, isl.data.population + 1);
            }
            this.ui.hud.setWorldPopulation(this.citizens.length);
            this.ui.toast.show(payload.message, 'info');
        });

        // 4b. Citizen grabbed by another God
        this.realtimeClient.on('citizen.grabbed', (payload) => {
            const cit = this.citizens.find((c) => c.id === payload.citizen_id);
            if (cit) {
                cit.setHoldingGod(payload.god_id, payload.god_name, payload.god_color);
                cit.group.position.y = 5.5;
                if (this.currentGod && (this.currentGod.id !== payload.god_id && this.currentGod.god_id !== payload.god_id)) {
                    this.ui.toast.show(payload.message || `✋ Thần ${payload.god_name} đang nhấc ${cit.name}!`, 'info');
                }
            }
        });

        // 4c. Citizen moved while held
        this.realtimeClient.on('citizen.moved', (payload) => {
            const cit = this.citizens.find((c) => c.id === payload.citizen_id);
            if (cit && payload.position) {
                cit.status = 'held';
                cit.setTargetPosition(payload.position);
            }
        });

        // 4d. Citizen released
        this.realtimeClient.on('citizen.released', (payload) => {
            const cit = this.citizens.find((c) => c.id === payload.citizen_id);
            if (cit) {
                cit.clearHoldingGod();
                cit.status = 'alive';
                if (payload.position) {
                    cit.group.position.set(payload.position.x, payload.position.y || 2.0, payload.position.z);
                }
            }
        });

        // 5. Citizen thrown
        this.realtimeClient.on('citizen.thrown', (payload) => {
            const cit = this.citizens.find((c) => c.id === payload.citizen_id);
            if (!cit) return;

            // Launch synchronized ballistic arc
            if (payload.start_position && payload.velocity) {
                cit.group.position.set(payload.start_position.x, payload.start_position.y, payload.start_position.z);
                cit.velocity.set(payload.velocity.x, payload.velocity.y, payload.velocity.z);
                cit.isThrown = true;
            }

            if (payload.outcome === 'landed_ocean') {
                if (cit._flightTimeout) {
                    clearTimeout(cit._flightTimeout);
                }
                const drownVersion = payload.drowning_version || 1;
                cit._flightTimeout = setTimeout(() => {
                    cit._flightTimeout = null;
                    if (cit.status !== 'alive') {
                        this.drowningSystem.startDrowning(
                            cit,
                            payload.drowning_deadline_at,
                            drownVersion
                        );
                    }
                }, (payload.flight_time || 1.0) * 1000);
            }

            this.ui.toast.show(payload.message, 'info');
        });

        // 6. Citizen rescued
        this.realtimeClient.on('citizen.rescued', (payload) => {
            const citizen = this.citizens.find((c) => c.id === payload.citizen_id);
            const saviorAvatar = this.godManager.getAvatar(payload.savior_id);

            if (citizen) {
                if (citizen._flightTimeout) {
                    clearTimeout(citizen._flightTimeout);
                    citizen._flightTimeout = null;
                }
                citizen.status = 'alive';
                citizen.state = 'idle';
                citizen.clearHoldingGod();
            }

            // Play divine rescue beam from savior avatar to citizen!
            if (saviorAvatar && citizen) {
                saviorAvatar.playRescueBeam(citizen.group.position);
            }

            this.drowningSystem.handleRescueSuccess(payload.citizen_id, payload, citizen);

            if (payload.target_island_id) {
                const island = this.islands.find((i) => i.id === payload.target_island_id);
                if (island && citizen) {
                    citizen.setIsland(island);
                }
            }

            this.ui.toast.show(payload.message || `✨ Vị thần đã cứu vớt ${payload.citizen_name}!`, 'success');
        });

        // 7. Citizen drowned
        this.realtimeClient.on('citizen.drowned', (payload) => {
            this.drowningSystem.confirmDeath(payload.citizen_id);
            const idx = this.citizens.findIndex((c) => c.id === payload.citizen_id);
            if (idx !== -1) {
                this.citizens.splice(idx, 1);
            }
            this.ui.hud.setWorldPopulation(this.citizens.length);
            this.ui.toast.show(payload.message || `🌊 Cư dân đã chìm xuống đại dương.`, 'warning');
        });

        // 8. Citizen renamed
        this.realtimeClient.on('citizen.renamed', (payload) => {
            const cit = this.citizens.find((c) => c.id === payload.citizen_id);
            if (cit) {
                cit.updateLabel(payload.name);
            }
        });

        // 9. Island claimed (deprecated - islands are shared territory)
        this.realtimeClient.on('island.claimed', (payload) => {});

        // 10. Island renamed
        this.realtimeClient.on('island.renamed', (payload) => {
            const isl = this.islands.find((i) => i.id === payload.island_id);
            if (isl) {
                isl.updateLabel(payload.name);
            }
        });

        // 11. Divine Blessing
        this.realtimeClient.on('divine.blessing', (payload) => {
            const targetAvatar = this.godManager.getAvatar(payload.target_id);
            if (targetAvatar) {
                targetAvatar.playBlessingBurst();
            } else if (this.currentGod && this.currentGod.id === payload.target_id) {
                this.effects.createBirthSpark(this.camera.position.x, 20, this.camera.position.z);
            }
            this.ui.toast.show(payload.message, 'success');
        });

        // 12. Divine Emote
        this.realtimeClient.on('divine.emote', (payload) => {
            this.ui.toast.show(payload.message, 'info');
        });

        // 13. World Reset
        this.realtimeClient.on('world.reset', () => {
            this.ui.toast.show('Thế giới đã được tái khởi nguyên. Đang tải lại...', 'warning');
            setTimeout(() => window.location.reload(), 1500);
        });

        // 14. Seamless Reconnection Reconciliation
        this.realtimeClient.onReconnected = async () => {
            await this.reconcileWorld();
        };
    }

    async reconcileWorld() {
        try {
            const res = await this.apiClient.fetchWorld();
            if (!res.ok || !res.data) return;

            const snapshot = res.data;

            // 1. Reconcile population
            this.ui.hud.setWorldPopulation(snapshot.world_population ?? this.citizens.length);

            // 2. Reconcile online gods
            this.godManager.syncOnlineGods(snapshot.online_gods || [], this.currentGod?.id);
            this.ui.hud.updateOnlineGods(this.godManager.onlineGodsList);

            // 3. Reconcile citizens
            const snapshotCitizens = snapshot.citizens || [];

            for (const citData of snapshotCitizens) {
                let existing = this.citizens.find((c) => c.id === citData.id);
                if (!existing) {
                    const island = this.islands.find((i) => i.id === citData.island_id) || this.islands[0];
                    existing = this.spawnCitizen(citData, island);
                } else {
                    existing.status = citData.status;
                    if (citData.status === 'held') {
                        existing.setHoldingGod(citData.held_by_god_id, citData.held_by_god_name, citData.held_by_god_color);
                    } else {
                        existing.clearHoldingGod();
                    }
                    if (citData.status === 'drowning' && citData.drowning_deadline_at) {
                        this.drowningSystem.startDrowning(existing, citData.drowning_deadline_at, citData.drowning_version || 1);
                    } else if (citData.status === 'alive') {
                        this.drowningSystem.clearDrowning(existing.id);
                    }
                }
            }

            // Remove dead citizens
            const activeSnapshotIds = new Set(snapshotCitizens.map((c) => c.id));
            for (let i = this.citizens.length - 1; i >= 0; i--) {
                const c = this.citizens[i];
                if (!activeSnapshotIds.has(c.id)) {
                    this.drowningSystem.confirmDeath(c.id);
                    c.dispose();
                    this.citizens.splice(i, 1);
                }
            }
        } catch (e) {
            console.warn('[ParadiseWorld] Reconcile error:', e.message);
        }
    }

    populateWorld(data, god) {
        this.currentGod = god;
        this.throwSystem.setCurrentGod(god);
        this.ui.citizenPanel.setCurrentGod(god);
        this.ui.islandPanel.setCurrentGod(god);

        // 1. Create Islands
        (data.islands || []).forEach((islData) => {
            const island = new Island(this.scene, islData);
            this.islands.push(island);
        });

        // 2. Create Citizens
        (data.citizens || []).forEach((citData) => {
            const island = this.islands.find((i) => i.id === citData.island_id) || this.islands[0];
            const citizen = this.spawnCitizen(citData, island);

            // If already drowning on load, initialize drowning countdown
            if (citData.status === 'drowning') {
                this.drowningSystem.startDrowning(
                    citizen,
                    citData.drowning_deadline_at,
                    citData.drowning_version || 1
                );
            }
        });

        // 3. Sync Online Gods Presence & Avatars
        this.godManager.syncOnlineGods(data.online_gods || [], god?.id);

        // 4. Update HUD
        this.ui.hud.setGod(god);
        this.ui.hud.setWorldPopulation(data.world_population ?? this.citizens.length);
        this.ui.hud.updateOnlineGods(this.godManager.onlineGodsList);

        // 5. Connect WebSocket Realtime Network
        this.realtimeClient.connect(god);
    }

    spawnCitizen(data, island) {
        const citizen = new Citizen(this.scene, data);
        citizen.setIsland(island);
        citizen.createdByGodId = data.created_by_god_id;
        citizen.creatorColor = data.creator_color;

        // Hook landing callbacks
        citizen.onLandedIslandCallback = (cit, newIsland, oldIsland, isNewIsland) => {
            if (isNewIsland) {
                this.apiClient.moveCitizen(cit.id, newIsland.id, cit.group.position.x, cit.group.position.z).then((res) => {
                    if (res.ok) {
                        if (oldIsland && res.data?.old_island_population !== undefined) {
                            oldIsland.updateLabel(null, res.data.old_island_population);
                        }
                        if (res.data?.new_island_population !== undefined) {
                            newIsland.updateLabel(null, res.data.new_island_population);
                        }
                    }
                });
                this.ui.toast.show(`${cit.name} đã bay từ ${oldIsland ? oldIsland.name : 'biển'} sang ${newIsland.name}!`, 'success');
            }
        };

        citizen.onFellInWaterCallback = (cit) => {
            const timeoutMs = this.drowningTimeoutMs || 3000;
            const deadlineAt = Date.now() + timeoutMs;
            this.apiClient.markDrowning(cit.id);
            this.drowningSystem.startDrowning(
                cit,
                deadlineAt,
                (cit.data?.drowning_version || 0) + 1,
                (rescuedCit) => {
                    this.effects.createBirthSpark(rescuedCit.group.position.x, 2.0, rescuedCit.group.position.z);
                },
                (deadCit) => {
                    const idx = this.citizens.indexOf(deadCit);
                    if (idx !== -1) {
                        this.citizens.splice(idx, 1);
                    }
                    this.ui.hud.setWorldPopulation(this.citizens.length);
                    if (deadCit.currentIsland) {
                        deadCit.currentIsland.updateLabel(null, Math.max(0, deadCit.currentIsland.data.population - 1));
                    }
                }
            );
        };

        this.citizens.push(citizen);
        this.effects.createBirthSpark(citizen.group.position.x, 2.0, citizen.group.position.z);
        return citizen;
    }

    renderLoop() {
        if (!this.isRunning) return;
        this.rafId = requestAnimationFrame(this.animate);

        const delta = Math.min(this.clock.getDelta(), 0.1);
        const elapsed = this.clock.getElapsedTime();

        this.controls.update();
        this.ocean.update(elapsed);
        this.environment.update(elapsed);
        this.effects.update(delta);
        this.godManager.update(delta, elapsed);
        this.drowningSystem.update(delta);

        this.citizens.forEach((citizen) => {
            citizen.update(delta, elapsed, this.islands);
        });

        // Throttle culling and LOD checks (~3 Hz)
        if (performance.now() - this.lastLabelUpdate > PERFORMANCE_CONFIG.labelVisibilityIntervalMs) {
            this.lastLabelUpdate = performance.now();
            this.updateCullingAndLOD();
        }

        // Send local God presence position to network (floating presence point above camera target)
        if (this.currentGod && this.controls?.target) {
            this.localPresencePos.x = this.controls.target.x;
            this.localPresencePos.y = 8.0;
            this.localPresencePos.z = this.controls.target.z;
            this.realtimeClient.sendMove(this.localPresencePos, this.controls.target);
        }

        this.renderer.render(this.scene, this.camera);
    }

    updateCullingAndLOD() {
        const camPos = this.camera.position;
        const labelThresholdSq = PERFORMANCE_CONFIG.labelDistanceThresholdSq;
        const limbLodThresholdSq = 50 * 50; // 50 units
        const selectedCit = this.ui?.citizenPanel?.selectedCitizen;
        let labelCount = 0;

        for (let i = 0; i < this.citizens.length; i++) {
            const c = this.citizens[i];
            const isUrgent = c.status === 'drowning' || c.status === 'held' || c === selectedCit;
            const distSq = c.group.position.distanceToSquared(camPos);

            // 1. Label culling: max visible labels
            if (c.labelSprite) {
                if (isUrgent || (distSq < labelThresholdSq && labelCount < PERFORMANCE_CONFIG.maxVisibleLabels)) {
                    c.labelSprite.visible = true;
                    labelCount++;
                } else {
                    c.labelSprite.visible = false;
                }
            }

            // 2. Limb Level of Detail (LOD): hide distant tiny sub-limbs to minimize draw calls
            const showLimbs = isUrgent || distSq < limbLodThresholdSq;
            if (c.leftArm && c.leftArm.visible !== showLimbs) {
                c.leftArm.visible = showLimbs;
                c.rightArm.visible = showLimbs;
                c.leftLeg.visible = showLimbs;
                c.rightLeg.visible = showLimbs;
            }
        }
    }

    dispose() {
        this.isRunning = false;
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
        window.removeEventListener('resize', this.onResize);

        this.realtimeClient.disconnect();
        this.selectionSystem.dispose();
        this.throwSystem.dispose();
        this.drowningSystem.dispose();
        this.godManager.dispose();
        this.effects.dispose();
        this.ocean.dispose();

        this.citizens.forEach((c) => c.dispose());
        this.citizens = [];

        this.islands.forEach((i) => {
            this.scene.remove(i.group);
        });
        this.islands = [];

        this.renderer.dispose();
        if (this.domElement && this.domElement.parentNode === this.container) {
            this.container.removeChild(this.domElement);
        }
    }
}
