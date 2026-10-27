import * as THREE from 'three';

/**
 * Paradise Gods - Citizen Pick Up & Throw System
 * Enforces ownership: Only the creator God can pick up and throw their citizen.
 * Computes trajectory and notifies backend & multiplayer network.
 */
export class ThrowSystem {
    constructor(camera, domElement, controls, citizenManager, apiClient = null) {
        this.camera = camera;
        this.domElement = domElement;
        this.controls = controls;
        this.citizenManager = citizenManager;
        this.apiClient = apiClient;

        this.currentGod = null;

        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -4.0);
        this.dragIntersection = new THREE.Vector3();

        this.draggedCitizen = null;
        this.previousPosition = new THREE.Vector3();
        this.previousTime = 0;
        this.computedVelocity = new THREE.Vector3();

        this.initEvents();
    }

    setCurrentGod(god) {
        this.currentGod = god;
    }

    initEvents() {
        this.onPointerDown = this.handlePointerDown.bind(this);
        this.onPointerMove = this.handlePointerMove.bind(this);
        this.onPointerUp = this.handlePointerUp.bind(this);

        this.domElement.addEventListener('pointerdown', this.onPointerDown);
        window.addEventListener('pointermove', this.onPointerMove);
        window.addEventListener('pointerup', this.onPointerUp);
    }

    handlePointerDown(e) {
        if (e.button !== 0) return;

        const rect = this.domElement.getBoundingClientRect();
        this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);

        const citizenMeshes = this.citizenManager.getCitizenMeshes();
        const intersects = this.raycaster.intersectObjects(citizenMeshes, true);

        if (intersects.length > 0) {
            let hitObj = intersects[0].object;
            while (hitObj.parent && !hitObj.userData?.citizenInstance) {
                hitObj = hitObj.parent;
            }

            const citizen = hitObj.userData?.citizenInstance;
            if (citizen && citizen.status !== 'dead') {
                // Ownership check: only creator God can pick up & throw!
                const creatorId = citizen.createdByGodId || citizen.data?.created_by_god_id;
                if (this.currentGod && creatorId && creatorId !== this.currentGod.id && creatorId !== this.currentGod.god_id) {
                    if (this.onUnauthorizedThrow) {
                        this.onUnauthorizedThrow(citizen);
                    }
                    return;
                }

                this.draggedCitizen = citizen;
                citizen.isDragged = true;
                citizen.isThrown = false;
                citizen.group.position.y = 4.2;
                this.controls.enabled = false;

                this.previousPosition.copy(citizen.group.position);
                this.previousTime = performance.now();
                this.computedVelocity.set(0, 0, 0);

                if (this.onPickupCallback) {
                    this.onPickupCallback(citizen);
                }
            }
        }
    }

    handlePointerMove(e) {
        if (!this.draggedCitizen) return;

        const rect = this.domElement.getBoundingClientRect();
        this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);

        if (this.raycaster.ray.intersectPlane(this.dragPlane, this.dragIntersection)) {
            const now = performance.now();
            const dt = (now - this.previousTime) / 1000;

            if (dt > 0.01) {
                this.computedVelocity.set(
                    (this.dragIntersection.x - this.previousPosition.x) / dt,
                    0,
                    (this.dragIntersection.z - this.previousPosition.z) / dt
                );
                this.previousPosition.copy(this.dragIntersection);
                this.previousTime = now;
            }

            this.draggedCitizen.group.position.x = this.dragIntersection.x;
            this.draggedCitizen.group.position.z = this.dragIntersection.z;
        }
    }

    handlePointerUp() {
        if (!this.draggedCitizen) return;

        const citizen = this.draggedCitizen;
        this.draggedCitizen = null;
        this.controls.enabled = true;
        citizen.isDragged = false;

        const speed = this.computedVelocity.length();
        let launchVelocity = new THREE.Vector3(0, -5.0, 0);

        if (speed > 4.0) {
            const cappedSpeed = Math.min(speed * 0.7, 35.0);
            const dir = this.computedVelocity.clone().normalize();
            launchVelocity.set(
                dir.x * cappedSpeed,
                Math.min(cappedSpeed * 0.5 + 4.0, 16.0),
                dir.z * cappedSpeed
            );
        }

        citizen.velocity.copy(launchVelocity);
        citizen.isThrown = true;

        // Authoritative throw API dispatch to backend
        if (this.apiClient) {
            this.apiClient.request(`/api/citizens/${citizen.id}/throw`, {
                method: 'POST',
                body: JSON.stringify({
                    god_uuid: this.apiClient.getGodUuid(),
                    start_position: {
                        x: citizen.group.position.x,
                        y: citizen.group.position.y,
                        z: citizen.group.position.z,
                    },
                    velocity: {
                        x: launchVelocity.x,
                        y: launchVelocity.y,
                        z: launchVelocity.z,
                    },
                }),
            });
        }

        if (this.onReleaseCallback) {
            this.onReleaseCallback(citizen, speed > 4.0);
        }
    }

    dispose() {
        this.domElement.removeEventListener('pointerdown', this.onPointerDown);
        window.removeEventListener('pointermove', this.onPointerMove);
        window.removeEventListener('pointerup', this.onPointerUp);
    }
}
