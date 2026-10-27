import * as THREE from 'three';

/**
 * Paradise Gods - Emergency Rescue Beacon
 * High-visibility pulsating light column and expanding ocean ripples
 * marking a drowning citizen so any online God can spot and rescue them.
 */
export class RescueBeacon {
    constructor(scene, position) {
        this.scene = scene;
        this.group = new THREE.Group();
        this.group.position.set(position.x, 0, position.z);

        this.time = 0;

        // 1. Vertical pulsating emergency beam
        const beamGeo = new THREE.CylinderGeometry(0.4, 1.8, 60, 16);
        this.beamMat = new THREE.MeshBasicMaterial({
            color: 0xef4444, // emergency bright red
            transparent: true,
            opacity: 0.65,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending,
        });
        this.beamMesh = new THREE.Mesh(beamGeo, this.beamMat);
        this.beamMesh.position.y = 30;
        this.group.add(this.beamMesh);

        // 2. Water shockwave ripple ring
        const ringGeo = new THREE.RingGeometry(0.5, 1.2, 32);
        this.ringMat = new THREE.MeshBasicMaterial({
            color: 0xf97316, // orange alert
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide,
        });
        this.ringMesh = new THREE.Mesh(ringGeo, this.ringMat);
        this.ringMesh.rotation.x = -Math.PI / 2;
        this.ringMesh.position.y = 0.05;
        this.group.add(this.ringMesh);

        this.scene.add(this.group);
    }

    setPosition(x, z) {
        this.group.position.x = x;
        this.group.position.z = z;
    }

    update(delta) {
        this.time += delta * 4.0;

        // Beam pulsating glow
        this.beamMat.opacity = 0.45 + Math.sin(this.time) * 0.25;

        // Ripple expansion
        const ripplePhase = (this.time * 0.4) % 1.0;
        const rippleScale = 1.0 + ripplePhase * 5.0;
        this.ringMesh.scale.set(rippleScale, rippleScale, 1.0);
        this.ringMat.opacity = Math.max(0, 0.8 * (1.0 - ripplePhase));
    }

    dispose() {
        this.scene.remove(this.group);
        this.beamMesh.geometry.dispose();
        this.beamMat.dispose();
        this.ringMesh.geometry.dispose();
        this.ringMat.dispose();
    }
}
