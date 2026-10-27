import * as THREE from 'three';

/**
 * Paradise Gods - Citizen Pick Up & Throw System
 * Allows dragging a citizen above the archipelago and launching them across islands or into water.
 */
export class ThrowSystem {
    constructor(camera, domElement, controls, citizenManager) {
        this.camera = camera;
        this.domElement = domElement;
        this.controls = controls;
        this.citizenManager = citizenManager;

        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -4.0); // horizontal drag plane at y=4
        this.dragIntersection = new THREE.Vector3();

        this.draggedCitizen = null;
        this.previousPosition = new THREE.Vector3();
        this.previousTime = 0;
        this.computedVelocity = new THREE.Vector3();

        this.initEvents();
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
        // Only left click or primary touch
        if (e.button !== 0) return;

        const rect = this.domElement.getBoundingClientRect();
        this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);

        // Raycast against citizens
        const citizenMeshes = this.citizenManager.getCitizenMeshes();
        const intersects = this.raycaster.intersectObjects(citizenMeshes, true);

        if (intersects.length > 0) {
            // Find root citizen
            let hitObj = intersects[0].object;
            while (hitObj.parent && !hitObj.userData?.citizenInstance) {
                hitObj = hitObj.parent;
            }

            const citizen = hitObj.userData?.citizenInstance;
            if (citizen && citizen.status !== 'dead') {
                this.draggedCitizen = citizen;
                citizen.isDragged = true;
                citizen.isThrown = false;
                citizen.group.position.y = 4.2; // lift into air
                this.controls.enabled = false; // disable camera orbit while dragging!

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
                // Compute instantaneous drag velocity
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
        this.controls.enabled = true; // re-enable camera orbit
        citizen.isDragged = false;

        const speed = this.computedVelocity.length();
        // Fast release (> 4.0 speed): throw citizen with upward arc!
        if (speed > 4.0) {
            citizen.isThrown = true;
            // Cap throw velocity to reasonable bounds
            const cappedSpeed = Math.min(speed * 0.7, 35.0);
            const dir = this.computedVelocity.clone().normalize();
            citizen.velocity.set(
                dir.x * cappedSpeed,
                Math.min(cappedSpeed * 0.5 + 4.0, 16.0), // upward launch arc
                dir.z * cappedSpeed
            );
        } else {
            // Slow release: drop gently
            citizen.velocity.set(0, -5.0, 0);
            citizen.isThrown = true;
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
