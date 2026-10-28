import * as THREE from 'three';

/**
 * Paradise Gods - Divine Avatar
 * Visual 3D representation of an active God in the shared world.
 * Features glowing celestial orb, pulsating halo, nameplate, and divine animations.
 */
export class DivineAvatar {
    constructor(scene, godData) {
        this.scene = scene;
        this.data = godData;
        this.godId = godData.god_id || godData.id;
        this.name = godData.name;
        this.colorHex = godData.god_color || '#8b5cf6';
        this.colorInt = parseInt(this.colorHex.replace('#', '0x'), 16);

        this.group = new THREE.Group();
        this.group.userData = {
            isGodAvatar: true,
            godInstance: this,
            godData: this.data,
        };

        // Current and target positions for smooth interpolation
        const initialPos = godData.position || { x: 0, y: 16, z: 0 };
        this.group.position.set(initialPos.x, initialPos.y || 16, initialPos.z);
        this.targetPosition = new THREE.Vector3().copy(this.group.position);

        this.pulseTime = Math.random() * Math.PI * 2;
        this.isFadingOut = false;
        this.fadeAlpha = 1.0;

        this.buildMesh();
        this.scene.add(this.group);

        this.playSpawnBeam();
    }

    buildMesh() {
        // 1. Central glowing celestial core
        const coreGeo = new THREE.SphereGeometry(1.2, 32, 32);
        this.coreMat = new THREE.MeshStandardMaterial({
            color: this.colorInt,
            emissive: this.colorInt,
            emissiveIntensity: 0.85,
            roughness: 0.2,
            metalness: 0.1,
        });
        this.coreMesh = new THREE.Mesh(coreGeo, this.coreMat);
        this.coreMesh.castShadow = true;
        this.group.add(this.coreMesh);

        // 2. Translucent pulsing halo aura
        const haloGeo = new THREE.SphereGeometry(2.1, 24, 24);
        this.haloMat = new THREE.MeshBasicMaterial({
            color: this.colorInt,
            transparent: true,
            opacity: 0.35,
            side: THREE.BackSide,
            blending: THREE.AdditiveBlending,
        });
        this.haloMesh = new THREE.Mesh(haloGeo, this.haloMat);
        this.group.add(this.haloMesh);

        // 3. Rotating celestial orbital rings (Dual gyro astrolabe)
        this.ringGeo = new THREE.TorusGeometry(2.6, 0.08, 16, 48);
        this.ringMat = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.65,
        });
        this.ringMesh = new THREE.Mesh(this.ringGeo, this.ringMat);
        this.ringMesh.rotation.x = Math.PI / 3;
        this.group.add(this.ringMesh);

        this.ringGeo2 = new THREE.TorusGeometry(2.3, 0.06, 16, 48);
        this.ringMat2 = new THREE.MeshBasicMaterial({
            color: this.colorInt,
            transparent: true,
            opacity: 0.75,
        });
        this.ringMesh2 = new THREE.Mesh(this.ringGeo2, this.ringMat2);
        this.ringMesh2.rotation.y = Math.PI / 3;
        this.group.add(this.ringMesh2);

        // 4. Floating divine nameplate sprite above avatar
        this.nameSprite = this.createNameSprite(this.name, this.colorHex);
        this.nameSprite.position.set(0, 3.4, 0);
        this.group.add(this.nameSprite);
    }

    createNameSprite(name, colorHex) {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');

        // Draw soft rounded translucent backing pill
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.beginPath();
        ctx.roundRect(32, 24, 448, 80, 40);
        ctx.fill();

        // Border in god color
        ctx.lineWidth = 4;
        ctx.strokeStyle = colorHex;
        ctx.stroke();

        // Text
        ctx.font = 'bold 36px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`⚡ Thần ${name}`, 256, 64);

        const texture = new THREE.CanvasTexture(canvas);
        texture.minFilter = THREE.LinearFilter;
        const spriteMat = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            depthTest: false,
        });
        const sprite = new THREE.Sprite(spriteMat);
        sprite.scale.set(6.0, 1.5, 1.0);
        return sprite;
    }

    setTargetPosition(pos) {
        if (!pos) return;
        this.targetPosition.set(
            pos.x,
            pos.y !== undefined ? pos.y : 8.0,
            pos.z
        );
    }

    update(delta, elapsed) {
        // 1. Smooth position interpolation (Lerp)
        this.group.position.lerp(this.targetPosition, Math.min(delta * 8.0, 1.0));

        // 2. Floating bob and pulsing halo
        this.pulseTime += delta * 3.0;
        const bob = Math.sin(this.pulseTime) * 0.4;
        this.coreMesh.position.y = bob;
        this.haloMesh.position.y = bob;
        this.ringMesh.position.y = bob;
        if (this.ringMesh2) this.ringMesh2.position.y = bob;

        const scale = 1.0 + Math.sin(this.pulseTime * 1.5) * 0.12;
        this.haloMesh.scale.set(scale, scale, scale);

        // 3. Ring slow rotation
        this.ringMesh.rotation.z += delta * 1.2;
        this.ringMesh.rotation.y += delta * 0.8;
        if (this.ringMesh2) {
            this.ringMesh2.rotation.x += delta * 1.0;
            this.ringMesh2.rotation.z -= delta * 0.9;
        }

        // 4. Handle fade out on leave
        if (this.isFadingOut) {
            this.fadeAlpha = Math.max(0, this.fadeAlpha - delta * 1.5);
            this.coreMat.opacity = this.fadeAlpha;
            this.haloMat.opacity = this.fadeAlpha * 0.35;
            this.ringMat.opacity = this.fadeAlpha * 0.6;
            if (this.ringMat2) this.ringMat2.opacity = this.fadeAlpha * 0.75;
            this.nameSprite.material.opacity = this.fadeAlpha;
            if (this.fadeAlpha <= 0 && this.onFadeComplete) {
                this.onFadeComplete();
                this.onFadeComplete = null;
            }
        }
    }

    playSpawnBeam() {
        // Create vertical cylinder beam of divine light from sky
        const beamGeo = new THREE.CylinderGeometry(1.2, 2.5, 120, 16);
        const beamMat = new THREE.MeshBasicMaterial({
            color: this.colorInt,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide,
        });
        const beamMesh = new THREE.Mesh(beamGeo, beamMat);
        beamMesh.position.set(this.group.position.x, 60, this.group.position.z);
        this.scene.add(beamMesh);

        let elapsed = 0;
        const animateBeam = () => {
            elapsed += 0.04;
            beamMesh.scale.x = Math.max(0, 1 - elapsed);
            beamMesh.scale.z = Math.max(0, 1 - elapsed);
            beamMat.opacity = Math.max(0, 0.8 - elapsed * 0.8);
            if (elapsed < 1.0) {
                requestAnimationFrame(animateBeam);
            } else {
                this.scene.remove(beamMesh);
                beamGeo.dispose();
                beamMat.dispose();
            }
        };
        requestAnimationFrame(animateBeam);
    }

    playDespawnFade(onDone) {
        this.isFadingOut = true;
        this.coreMat.transparent = true;
        this.onFadeComplete = onDone;
    }

    playRescueBeam(targetPos) {
        // Create laser cylinder connecting divine avatar to drowning citizen
        const start = this.group.position.clone();
        const end = new THREE.Vector3(targetPos.x, targetPos.y || 0, targetPos.z);
        const distance = start.distanceTo(end);

        const beamGeo = new THREE.CylinderGeometry(0.35, 0.35, distance, 12);
        const beamMat = new THREE.MeshBasicMaterial({
            color: this.colorInt,
            transparent: true,
            opacity: 0.9,
            blending: THREE.AdditiveBlending,
        });
        const beamMesh = new THREE.Mesh(beamGeo, beamMat);

        // Position & orient beam
        const midPoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
        beamMesh.position.copy(midPoint);
        beamMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.clone().sub(start).normalize());
        this.scene.add(beamMesh);

        let life = 0;
        const animateRescue = () => {
            life += 0.05;
            beamMat.opacity = Math.max(0, 0.9 - life * 0.9);
            beamMesh.scale.x = 1.0 + life * 0.5;
            beamMesh.scale.z = 1.0 + life * 0.5;
            if (life < 1.0) {
                requestAnimationFrame(animateRescue);
            } else {
                this.scene.remove(beamMesh);
                beamGeo.dispose();
                beamMat.dispose();
            }
        };
        requestAnimationFrame(animateRescue);
    }

    playBlessingBurst() {
        const particleCount = 36;
        const geo = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const velocities = [];

        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = this.group.position.x;
            positions[i * 3 + 1] = this.group.position.y;
            positions[i * 3 + 2] = this.group.position.z;

            const theta = Math.random() * Math.PI * 2;
            const phi = (Math.random() - 0.5) * Math.PI;
            const speed = 4.0 + Math.random() * 6.0;
            velocities.push(
                Math.cos(phi) * Math.cos(theta) * speed,
                Math.sin(phi) * speed,
                Math.cos(phi) * Math.sin(theta) * speed
            );
        }
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const mat = new THREE.PointsMaterial({
            color: 0xfbbf24, // golden amber
            size: 0.8,
            transparent: true,
            opacity: 1.0,
            blending: THREE.AdditiveBlending,
        });
        const pSystem = new THREE.Points(geo, mat);
        this.scene.add(pSystem);

        let t = 0;
        const animateBurst = () => {
            t += 0.03;
            const posAttr = pSystem.geometry.attributes.position;
            const arr = posAttr.array;
            for (let i = 0; i < particleCount; i++) {
                arr[i * 3] += velocities[i * 3] * 0.03;
                arr[i * 3 + 1] += velocities[i * 3 + 1] * 0.03;
                arr[i * 3 + 2] += velocities[i * 3 + 2] * 0.03;
            }
            posAttr.needsUpdate = true;
            mat.opacity = Math.max(0, 1.0 - t);

            if (t < 1.0) {
                requestAnimationFrame(animateBurst);
            } else {
                this.scene.remove(pSystem);
                geo.dispose();
                mat.dispose();
            }
        };
        requestAnimationFrame(animateBurst);
    }

    dispose() {
        this.scene.remove(this.group);
        this.coreGeo?.dispose();
        this.coreMat?.dispose();
        this.haloGeo?.dispose();
        this.haloMat?.dispose();
        this.ringGeo?.dispose();
        this.ringMat?.dispose();
        this.ringGeo2?.dispose();
        this.ringMat2?.dispose();
        this.nameSprite?.material?.map?.dispose();
        this.nameSprite?.material?.dispose();
    }
}
