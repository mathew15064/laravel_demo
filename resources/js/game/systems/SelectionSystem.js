import * as THREE from 'three';

/**
 * Paradise Gods - Selection System
 * Raycasts clicks on 3D canvas to select Citizens (priority) or Islands.
 */
export class SelectionSystem {
    constructor(camera, domElement, controls, citizenManager, islandManager, islandPanel, citizenPanel) {
        this.camera = camera;
        this.domElement = domElement;
        this.controls = controls;
        this.citizenManager = citizenManager;
        this.islandManager = islandManager;
        this.islandPanel = islandPanel;
        this.citizenPanel = citizenPanel;

        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.selectedIsland = null;
        this.selectedCitizen = null;

        this.pointerDownPos = new THREE.Vector2();

        this.initEvents();
    }

    initEvents() {
        this.onPointerDown = (e) => {
            this.pointerDownPos.set(e.clientX, e.clientY);
        };

        this.onPointerUp = (e) => {
            // Only trigger selection if not a camera drag
            const dist = Math.hypot(e.clientX - this.pointerDownPos.x, e.clientY - this.pointerDownPos.y);
            if (dist < 6) {
                this.handleClick(e);
            }
        };

        this.domElement.addEventListener('pointerdown', this.onPointerDown);
        this.domElement.addEventListener('pointerup', this.onPointerUp);
    }

    handleClick(e) {
        const rect = this.domElement.getBoundingClientRect();
        this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);

        // 1. Raycast against Citizens FIRST (Priority per Requirement 18)
        const citizenMeshes = this.citizenManager.getCitizenMeshes();
        const citizenHits = this.raycaster.intersectObjects(citizenMeshes, true);

        if (citizenHits.length > 0) {
            let hit = citizenHits[0].object;
            while (hit.parent && !hit.userData?.citizenInstance) {
                hit = hit.parent;
            }
            const citizen = hit.userData?.citizenInstance;
            if (citizen && citizen.status !== 'dead') {
                this.selectCitizen(citizen);
                return;
            }
        }

        // 2. Raycast against Islands
        const islandMeshes = this.islandManager.getIslandMeshes();
        const islandHits = this.raycaster.intersectObjects(islandMeshes, true);

        if (islandHits.length > 0) {
            let hit = islandHits[0].object;
            while (hit.parent && !hit.userData?.islandInstance) {
                hit = hit.parent;
            }
            const island = hit.userData?.islandInstance;
            if (island) {
                this.selectIsland(island);
                return;
            }
        }

        // 3. Clicked water or empty space -> deselect
        this.clearSelection();
    }

    selectIsland(island) {
        this.clearSelection();
        this.selectedIsland = island;
        island.setSelected(true);
        this.islandPanel.show(island);
    }

    selectCitizen(citizen) {
        this.clearSelection();
        this.selectedCitizen = citizen;
        this.citizenPanel.show(citizen);
    }

    clearSelection() {
        if (this.selectedIsland) {
            this.selectedIsland.setSelected(false);
            this.selectedIsland = null;
            this.islandPanel.hide();
        }
        if (this.selectedCitizen) {
            this.selectedCitizen = null;
            this.citizenPanel.hide();
        }
    }

    focusOn(targetX, targetZ, distance = 35) {
        const startTarget = this.controls.target.clone();
        const startCam = this.camera.position.clone();
        const endTarget = new THREE.Vector3(targetX, 2.0, targetZ);
        const endCam = new THREE.Vector3(targetX, distance * 0.8, targetZ + distance);

        let t = 0;
        const interval = setInterval(() => {
            t += 0.04;
            const ease = t * t * (3 - 2 * t);
            this.controls.target.lerpVectors(startTarget, endTarget, ease);
            this.camera.position.lerpVectors(startCam, endCam, ease);
            this.controls.update();

            if (t >= 1.0) {
                clearInterval(interval);
            }
        }, 16);
    }

    dispose() {
        this.domElement.removeEventListener('pointerdown', this.onPointerDown);
        this.domElement.removeEventListener('pointerup', this.onPointerUp);
    }
}
