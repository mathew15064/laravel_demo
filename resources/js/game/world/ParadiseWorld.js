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

/**
 * Paradise Gods - Main 3D World (Thiên Đường Quần Đảo)
 * Manages Three.js rendering, OrbitControls, archipelago islands, citizens, and physics systems.
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
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        this.domElement = this.renderer.domElement;
        this.container.appendChild(this.domElement);

        this.controls = new OrbitControls(this.camera, this.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.maxPolarAngle = Math.PI / 2.15; // don't go below water level
        this.controls.minDistance = 15;
        this.controls.maxDistance = 175;
        this.controls.target.set(0, 2, 0);

        this.islands = [];
        this.citizens = [];

        this.ocean = new Ocean(this.scene, 320);
        this.environment = new Environment(this.scene);
        this.effects = new EffectsSystem(this.scene);

        this.drowningSystem = new DrowningSystem(
            this.apiClient,
            this.ui.drowningAlert,
            this.ui.toast,
            this.effects
        );
        this.drowningSystem.setTimeoutDuration(this.drowningTimeoutMs);

        this.drowningSystem.onStatsUpdated = (stats) => {
            if (this.currentGod) {
                this.currentGod.stats = stats;
            }
        };

        this.drowningSystem.onWorldPopulationUpdated = (pop) => {
            this.ui.hud.setWorldPopulation(pop);
        };

        this.throwSystem = new ThrowSystem(this.camera, this.domElement, this.controls, {
            getCitizenMeshes: () => this.citizens.map((c) => c.group),
        });

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
            this.ui.citizenPanel
        );

        this.initCallbacks();

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
        // When Island Panel requests new citizen creation
        this.ui.islandPanel.onCreateCitizen = async (island, name) => {
            const res = await this.apiClient.createCitizen(island.id, name);
            if (res.ok && res.data?.citizen) {
                this.spawnCitizen(res.data.citizen, island);
                island.updateLabel(null, res.data.island_population);
                this.ui.hud.setWorldPopulation(res.data.world_population);
                if (res.data.god_stats && this.currentGod) {
                    this.currentGod.stats = res.data.god_stats;
                }
                this.ui.toast.show(`✨ ${res.data.message}`, 'success');
            } else {
                this.ui.toast.show(res.data?.message || 'Không thể tạo cư dân lúc này.', 'danger');
            }
        };

        // When Island Panel requests camera focus
        this.ui.islandPanel.onFocusIsland = (x, z) => {
            this.selectionSystem.focusOn(x, z, 32);
        };

        // When Island is renamed
        this.ui.islandPanel.onIslandRenamed = (island, newName) => {
            this.ui.toast.show(`Đã đổi tên đảo thành ${newName}.`, 'info');
        };

        // When Citizen is lifted from Citizen Panel
        this.ui.citizenPanel.onLiftCitizen = (citizen) => {
            citizen.group.position.y = 5.0;
            citizen.velocity.set((Math.random() - 0.5) * 14, 12.0, (Math.random() - 0.5) * 14);
            citizen.isThrown = true;
            this.ui.citizenPanel.hide();
            this.ui.toast.show(`Thần đã phóng ${citizen.name} lên không trung!`);
        };
    }

    populateWorld(data, god) {
        this.currentGod = god;

        // 1. Create Islands
        (data.islands || []).forEach((islData) => {
            const island = new Island(this.scene, islData);
            this.islands.push(island);
        });

        // 2. Create Citizens
        (data.citizens || []).forEach((citData) => {
            const island = this.islands.find((i) => i.id === citData.island_id) || this.islands[0];
            this.spawnCitizen(citData, island);
        });

        // 3. Update HUD
        this.ui.hud.setGod(god);
        this.ui.hud.setWorldPopulation(data.world_population ?? this.citizens.length);
    }

    spawnCitizen(data, island) {
        const citizen = new Citizen(this.scene, data);
        citizen.setIsland(island);

        // Hook landing callbacks
        citizen.onLandedIslandCallback = (cit, newIsland, oldIsland, isNewIsland) => {
            if (isNewIsland) {
                // Landed on a DIFFERENT island!
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
            // Trigger Drowning System!
            this.drowningSystem.startDrowning(
                cit,
                (rescuedCit) => {
                    // Rescued callback
                    this.effects.createBirthSpark(rescuedCit.group.position.x, 2.0, rescuedCit.group.position.z);
                },
                (deadCit) => {
                    // Death callback: remove citizen from active tracking array
                    const idx = this.citizens.indexOf(deadCit);
                    if (idx !== -1) {
                        this.citizens.splice(idx, 1);
                    }
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
        requestAnimationFrame(this.animate);

        const delta = Math.min(this.clock.getDelta(), 0.1);
        const elapsed = this.clock.getElapsedTime();

        this.controls.update();
        this.ocean.update(elapsed);
        this.environment.update(elapsed);
        this.effects.update(delta);
        this.drowningSystem.update(delta);

        this.citizens.forEach((citizen) => {
            citizen.update(delta, elapsed, this.islands);
        });

        this.renderer.render(this.scene, this.camera);
    }

    dispose() {
        this.isRunning = false;
        window.removeEventListener('resize', this.onResize);

        this.selectionSystem.dispose();
        this.throwSystem.dispose();
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
