import * as THREE from 'three';

/**
 * Paradise Gods - Citizen Pick Up & Throw System
 * Cooperative Shared World: Any God can pick up, lift, move, and throw any citizen.
 * Features server-authoritative grab synchronization and real-time movement broadcast.
 */
export class ThrowSystem {
    constructor(camera, domElement, controls, citizenManager, apiClient = null, realtimeClient = null) {
        this.camera = camera;
        this.domElement = domElement;
        this.controls = controls;
        this.citizenManager = citizenManager;
        this.apiClient = apiClient;
        this.realtimeClient = realtimeClient;

        this.currentGod = null;

        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -5.5); // float 5.5 units above water
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

    setRealtimeClient(client) {
        this.realtimeClient = client;
    }

    initEvents() {
        this.onPointerDown = this.handlePointerDown.bind(this);
        this.onPointerMove = this.handlePointerMove.bind(this);
        this.onPointerUp = this.handlePointerUp.bind(this);

        this.domElement.addEventListener('pointerdown', this.onPointerDown);
        window.addEventListener('pointermove', this.onPointerMove);
        window.addEventListener('pointerup', this.onPointerUp);
    }

    async handlePointerDown(e) {
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
                // If already held by another god, do not grab
                const currentGodId = this.currentGod?.id || this.currentGod?.god_id;
                if (citizen.status === 'held' && citizen.heldByGodId && citizen.heldByGodId !== currentGodId) {
                    return; // Softly ignore without intrusive popup
                }

                // Server-authoritative atomic grab
                if (this.apiClient) {
                    const res = await this.apiClient.request(`/api/citizens/${citizen.id}/grab`, {
                        method: 'POST',
                        body: JSON.stringify({ god_uuid: this.apiClient.getGodUuid() }),
                    });

                    if (!res.ok && res.status === 409) {
                        // Another god won the race! Softly deselect.
                        return;
                    }
                }

                this.draggedCitizen = citizen;
                citizen.isDragged = true;
                citizen.isThrown = false;
                citizen.status = 'held';
                citizen.heldByGodId = currentGodId;
                citizen.group.position.y = 5.5;
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
            this.draggedCitizen.group.position.y = 5.5;

            // Broadcast real-time citizen drag position to other online gods
            if (this.realtimeClient) {
                this.realtimeClient.sendCitizenDrag(
                    this.draggedCitizen.id,
                    this.draggedCitizen.group.position,
                    this.draggedCitizen.data?.version || 1
                );
            }
        }
    }

    async handlePointerUp() {
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

            citizen.velocity.copy(launchVelocity);
            citizen.isThrown = true;
            citizen.status = 'alive';
            citizen.heldByGodId = null;

            // Authoritative throw API dispatch to backend
            if (this.apiClient) {
                await this.apiClient.request(`/api/citizens/${citizen.id}/throw`, {
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
                this.onReleaseCallback(citizen, true);
            }
        } else {
            // Gentle placement / release
            citizen.status = 'alive';
            citizen.heldByGodId = null;
            citizen.group.position.y = 2.0; // Reset height to island ground level

            if (this.apiClient) {
                await this.apiClient.request(`/api/citizens/${citizen.id}/release`, {
                    method: 'POST',
                    body: JSON.stringify({
                        god_uuid: this.apiClient.getGodUuid(),
                        position: {
                            x: citizen.group.position.x,
                            y: 2.0,
                            z: citizen.group.position.z,
                        },
                    }),
                });
            }

            if (this.onReleaseCallback) {
                this.onReleaseCallback(citizen, false);
            }
        }
    }

    dispose() {
        this.domElement.removeEventListener('pointerdown', this.onPointerDown);
        window.removeEventListener('pointermove', this.onPointerMove);
        window.removeEventListener('pointerup', this.onPointerUp);
    }
}
