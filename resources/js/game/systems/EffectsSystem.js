import * as THREE from 'three';

/**
 * Paradise Gods - Visual Effects System
 * Manages ocean splashes, expanding water rings, and floating birth sparks.
 */
export class EffectsSystem {
    constructor(scene) {
        this.scene = scene;
        this.activeEffects = [];
    }

    createWaterSplash(x, z) {
        const group = new THREE.Group();
        group.position.set(x, 0.1, z);

        // 1. Expanding water ripple ring
        const ringGeo = new THREE.RingGeometry(0.3, 0.6, 24);
        const ringMat = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.9,
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = -Math.PI / 2;
        group.add(ring);

        // 2. Splash droplet particles
        const dropletCount = 18;
        const dropGeo = new THREE.DodecahedronGeometry(0.12, 0);
        const dropMat = new THREE.MeshStandardMaterial({
            color: 0x38bdf8,
            roughness: 0.2,
            metalness: 0.1,
            transparent: true,
            opacity: 0.85,
        });

        const droplets = [];
        for (let i = 0; i < dropletCount; i++) {
            const drop = new THREE.Mesh(dropGeo, dropMat);
            const angle = Math.random() * Math.PI * 2;
            const speed = 1.8 + Math.random() * 2.5;
            drop.userData = {
                vx: Math.cos(angle) * speed,
                vy: 3.5 + Math.random() * 3.0,
                vz: Math.sin(angle) * speed,
            };
            group.add(drop);
            droplets.push(drop);
        }

        this.scene.add(group);

        const effect = {
            group,
            ring,
            droplets,
            lifetime: 0.85,
            age: 0,
            update: (delta) => {
                effect.age += delta;
                const progress = effect.age / effect.lifetime;

                // Scale ring
                const ringScale = 1.0 + progress * 5.0;
                effect.ring.scale.set(ringScale, ringScale, 1);
                effect.ring.material.opacity = Math.max(0, 1.0 - progress);

                // Animate droplets
                effect.droplets.forEach((d) => {
                    d.userData.vy -= 14.0 * delta;
                    d.position.x += d.userData.vx * delta;
                    d.position.y += d.userData.vy * delta;
                    d.position.z += d.userData.vz * delta;
                });

                return progress >= 1.0;
            },
            dispose: () => {
                this.scene.remove(group);
                ringGeo.dispose();
                ringMat.dispose();
                dropGeo.dispose();
                dropMat.dispose();
            },
        };

        this.activeEffects.push(effect);
    }

    createBirthSpark(x, y, z) {
        const group = new THREE.Group();
        group.position.set(x, y, z);

        const sparkGeo = new THREE.SphereGeometry(0.1, 6, 6);
        const sparkMat = new THREE.MeshBasicMaterial({ color: 0xfef08a, transparent: true, opacity: 1 });
        const sparks = [];

        for (let i = 0; i < 14; i++) {
            const spark = new THREE.Mesh(sparkGeo, sparkMat);
            const a = Math.random() * Math.PI * 2;
            spark.userData = {
                vx: Math.cos(a) * (1.5 + Math.random() * 2),
                vy: 1.0 + Math.random() * 2.5,
                vz: Math.sin(a) * (1.5 + Math.random() * 2),
            };
            group.add(spark);
            sparks.push(spark);
        }

        this.scene.add(group);

        const effect = {
            group,
            sparks,
            lifetime: 0.7,
            age: 0,
            update: (delta) => {
                effect.age += delta;
                const progress = effect.age / effect.lifetime;
                effect.sparks.forEach((s) => {
                    s.userData.vy -= 5.0 * delta;
                    s.position.x += s.userData.vx * delta;
                    s.position.y += s.userData.vy * delta;
                    s.position.z += s.userData.vz * delta;
                    s.scale.setScalar(1.0 - progress);
                });
                return progress >= 1.0;
            },
            dispose: () => {
                this.scene.remove(group);
                sparkGeo.dispose();
                sparkMat.dispose();
            },
        };

        this.activeEffects.push(effect);
    }

    update(delta) {
        for (let i = this.activeEffects.length - 1; i >= 0; i--) {
            const effect = this.activeEffects[i];
            const isDone = effect.update(delta);
            if (isDone) {
                effect.dispose();
                this.activeEffects.splice(i, 1);
            }
        }
    }

    dispose() {
        this.activeEffects.forEach((e) => e.dispose());
        this.activeEffects = [];
    }
}
