import { ApiClient } from './api/ApiClient.js';
import { ParadiseWorld } from './world/ParadiseWorld.js';
import { VolcanoFailureWorld } from './world/VolcanoFailureWorld.js';
import { Hud } from './ui/Hud.js';
import { GodWelcome } from './ui/GodWelcome.js';
import { GodStats } from './ui/GodStats.js';
import { IslandPanel } from './ui/IslandPanel.js';
import { CitizenPanel } from './ui/CitizenPanel.js';
import { DrowningAlert } from './ui/DrowningAlert.js';
import { FailureOverlay } from './ui/FailureOverlay.js';
import { Toast } from './ui/Toast.js';

document.addEventListener('DOMContentLoaded', async () => {
    const canvasContainer = document.getElementById('game-canvas-container');
    const hudContainer = document.getElementById('game-hud-container');
    const welcomeOverlay = document.getElementById('god-welcome-overlay');
    const godStatsModal = document.getElementById('god-stats-modal');
    const islandPanelContainer = document.getElementById('island-panel-container');
    const citizenPanelContainer = document.getElementById('citizen-panel-container');
    const drowningAlertContainer = document.getElementById('drowning-alerts-container');
    const failureOverlayContainer = document.getElementById('failure-overlay-container');
    const toastContainer = document.getElementById('toast-container');

    if (!canvasContainer) return;

    const apiClient = new ApiClient();
    const toast = new Toast(toastContainer);

    let activeParadiseWorld = null;
    let activeVolcanoWorld = null;
    let currentGod = null;
    let worldData = null;

    // 1. Initialize UI Singletons
    const godStats = new GodStats(godStatsModal, apiClient, (updatedGod) => {
        currentGod = updatedGod;
        hud.setGod(updatedGod);
        toast.show(`⚡ Danh xưng của ngài nay là Thần ${updatedGod.name}.`, 'success');
    });

    const hud = new Hud(
        hudContainer,
        () => {
            if (currentGod) {
                godStats.show(currentGod);
            }
        },
        async () => {
            const res = await apiClient.resetWorld();
            if (res.ok) {
                window.location.reload();
            }
        }
    );

    const islandPanel = new IslandPanel(islandPanelContainer, apiClient);
    const citizenPanel = new CitizenPanel(citizenPanelContainer, apiClient);
    const drowningAlert = new DrowningAlert(drowningAlertContainer);

    const uiManager = {
        hud,
        toast,
        islandPanel,
        citizenPanel,
        drowningAlert,
    };

    // 2. Fetch World State from Laravel Backend
    const timeoutSetting = parseInt(document.body.getAttribute('data-drowning-timeout') || '3000', 10);

    async function loadSimulation() {
        const res = await apiClient.fetchWorld();

        if (!res.ok || res.data?.code === 'DATABASE_UNAVAILABLE') {
            // DATABASE OFFLINE -> Transform into Volcano Failure World!
            initVolcanoWorld();
            return;
        }

        // DATABASE HEALTHY -> Transform into Paradise World!
        worldData = res.data;
        initParadiseWorld(worldData);
    }

    function initVolcanoWorld() {
        if (activeParadiseWorld) {
            activeParadiseWorld.dispose();
            activeParadiseWorld = null;
        }

        hudContainer.classList.add('hidden');
        islandPanelContainer.classList.add('hidden');
        citizenPanelContainer.classList.add('hidden');
        welcomeOverlay.classList.add('hidden');

        activeVolcanoWorld = new VolcanoFailureWorld(canvasContainer);
        window.__paradiseGame = {
            activeParadiseWorld: null,
            activeVolcanoWorld,
            apiClient,
            uiManager,
            currentGod: null,
        };

        const failureOverlay = new FailureOverlay(failureOverlayContainer, async () => {
            const healthRes = await apiClient.checkDatabaseHealth();
            if (healthRes.ok && healthRes.data?.status === 'ok') {
                activeVolcanoWorld.dispose();
                activeVolcanoWorld = null;
                await loadSimulation();
                return true;
            }
            return false;
        });

        failureOverlay.show();
    }

    function initParadiseWorld(data) {
        if (activeVolcanoWorld) {
            activeVolcanoWorld.dispose();
            activeVolcanoWorld = null;
        }

        hudContainer.classList.remove('hidden');

        activeParadiseWorld = new ParadiseWorld(canvasContainer, apiClient, uiManager, timeoutSetting);
        window.__paradiseGame = {
            activeParadiseWorld,
            activeVolcanoWorld: null,
            apiClient,
            uiManager,
            currentGod,
        };

        // Check God Identity
        const welcome = new GodWelcome(welcomeOverlay, apiClient, (god) => {
            currentGod = god;
            if (window.__paradiseGame) window.__paradiseGame.currentGod = god;
            activeParadiseWorld.populateWorld(data, god);
            const rawName = god?.name || 'Vô Danh';
            const cleanName = rawName.startsWith('Thần ') ? rawName.slice(5) : rawName;
            toast.show(`Thần ${cleanName} đã ngự trị Quần Đảo Thiên Đường!`, 'success');
        });

        if (data.god) {
            currentGod = data.god;
            welcome.showReturningGod(data.god);
        } else {
            welcome.showRegistration();
        }
    }

    // Launch world
    loadSimulation();
});
