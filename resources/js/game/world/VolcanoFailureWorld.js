import * as THREE from 'three';

/**
 * Paradise Gods - Volcano Failure World
 * Dramatic catastrophic 3D scene rendered when database is offline during seminars.
 * Features a massive smoking volcano, glowing lava cracks, rising embers, and falling ash particles.
 */
export class VolcanoFailureWorld {
    constructor(container) {
        this.container = container;
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x180505); // dark charcoal red
        this.scene.fog = new THREE.FogExp2(0x1a0707, 0.025);

        const width = container.clientWidth || window.innerWidth;
        const height = container.clientHeight || window.innerHeight;

        this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 300);
        this.camera.position.set(0, 22, 60);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;

        this.domElement = this.renderer.domElement;
        this.container.appendChild(this.domElement);

        this.camera.lookAt(0, 10, 0);

        this.setupLighting();
        this.buildTerrain();
        this.buildVolcano();
        this.buildLavaStreams();
        this.buildParticles();

        this.animate = this.renderLoop.bind(this);
        this.clock = new THREE.Clock();
        this.isRunning = true;
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

    setupLighting() {
        // Red sky ambient
        const ambient = new THREE.AmbientLight(0x7f1d1d, 1.2);
        this.scene.add(ambient);

        // Menacing red directional moonlight
        const dirLight = new THREE.DirectionalLight(0xf87171, 0.8);
        dirLight.position.set(-30, 50, 40);
        this.scene.add(dirLight);

        // Intense crater lava point light
        this.craterLight = new THREE.PointLight(0xff4500, 4.0, 80);
        this.craterLight.position.set(0, 22, 0);
        this.scene.add(this.craterLight);
    }

    buildTerrain() {
        // Black charred cracked wasteland plane
        const terrainGeo = new THREE.PlaneGeometry(240, 240, 32, 32);
        terrainGeo.rotateX(-Math.PI / 2);

        // Distort terrain height
        const pos = terrainGeo.attributes.position;
        for (let i = 0; i < pos.count; i++) {
            const x = pos.getX(i);
            const z = pos.getZ(i);
            const dist = Math.hypot(x, z);
            if (dist > 25) {
                pos.setY(i, (Math.random() - 0.5) * 1.5);
            }
        }
        terrainGeo.computeVertexNormals();

        const terrainMat = new THREE.MeshStandardMaterial({
            color: 0x171212, // dark scorched rock
            roughness: 0.9,
            flatShading: true,
        });
        const terrain = new THREE.Mesh(terrainGeo, terrainMat);
        terrain.position.y = 0;
        this.scene.add(terrain);
    }

    buildVolcano() {
        this.volcanoGroup = new THREE.Group();

        // 1. Massive rocky cone (hollowed at top for crater)
        const coneGeo = new THREE.CylinderGeometry(6, 28, 22, 20, 4);
        const coneMat = new THREE.MeshStandardMaterial({
            color: 0x261919, // dark volcanic rock
            roughness: 0.95,
            flatShading: true,
        });

        // Add jagged rock variation to volcano slopes
        const pos = coneGeo.attributes.position;
        for (let i = 0; i < pos.count; i++) {
            const y = pos.getY(i);
            const angle = Math.atan2(pos.getZ(i), pos.getX(i));
            const r = Math.hypot(pos.getX(i), pos.getZ(i));
            const noise = Math.sin(angle * 7) * 1.4 + Math.cos(y * 0.8) * 1.2;
            pos.setX(i, Math.cos(angle) * (r + noise));
            pos.setZ(i, Math.sin(angle) * (r + noise));
        }
        coneGeo.computeVertexNormals();

        const volcanoCone = new THREE.Mesh(coneGeo, coneMat);
        volcanoCone.position.y = 11;
        this.volcanoGroup.add(volcanoCone);

        // 2. Glowing Molten Lava Lake in Crater
        const lavaLakeGeo = new THREE.CylinderGeometry(5.2, 5.2, 0.4, 16);
        this.lavaLakeMat = new THREE.MeshStandardMaterial({
            color: 0xff3b00,
            emissive: 0xff4500,
            emissiveIntensity: 1.2,
            roughness: 0.2,
        });
        const lavaLake = new THREE.Mesh(lavaLakeGeo, this.lavaLakeMat);
        lavaLake.position.y = 21.8;
        this.volcanoGroup.add(lavaLake);

        this.scene.add(this.volcanoGroup);
    }

    buildLavaStreams() {
        // Glowing lava rivers spilling down sides
        const streamMat = new THREE.MeshStandardMaterial({
            color: 0xff2200,
            emissive: 0xff4500,
            emissiveIntensity: 1.0,
            flatShading: true,
        });

        const angles = [0.4, 1.8, 3.2, 4.8];
        angles.forEach((angle) => {
            const riverGeo = new THREE.BoxGeometry(2.5, 0.3, 24);
            const river = new THREE.Mesh(riverGeo, streamMat);
            river.position.set(Math.cos(angle) * 14, 8, Math.sin(angle) * 14);
            river.rotation.y = -angle;
            river.rotation.x = 0.55; // slope down
            this.scene.add(river);
        });
    }

    buildParticles() {
        // 1. Rising Smoke from Crater
        this.smokeCount = 60;
        this.smokeGeo = new THREE.BufferGeometry();
        this.smokePositions = new Float32Array(this.smokeCount * 3);
        this.smokeVelocities = [];

        for (let i = 0; i < this.smokeCount; i++) {
            this.smokePositions[i * 3] = (Math.random() - 0.5) * 5;
            this.smokePositions[i * 3 + 1] = 22 + Math.random() * 20;
            this.smokePositions[i * 3 + 2] = (Math.random() - 0.5) * 5;
            this.smokeVelocities.push({
                vy: 0.8 + Math.random() * 1.2,
                vx: (Math.random() - 0.5) * 0.4,
                vz: (Math.random() - 0.5) * 0.4,
            });
        }
        this.smokeGeo.setAttribute('position', new THREE.BufferAttribute(this.smokePositions, 3));

        const smokeMat = new THREE.PointsMaterial({
            color: 0x3f1d1d,
            size: 2.2,
            transparent: true,
            opacity: 0.6,
        });
        this.smokePoints = new THREE.Points(this.smokeGeo, smokeMat);
        this.scene.add(this.smokePoints);

        // 2. Burning Embers & Falling Ash
        this.emberCount = 120;
        this.emberGeo = new THREE.BufferGeometry();
        this.emberPositions = new Float32Array(this.emberCount * 3);
        for (let i = 0; i < this.emberCount; i++) {
            this.emberPositions[i * 3] = (Math.random() - 0.5) * 80;
            this.emberPositions[i * 3 + 1] = Math.random() * 40;
            this.emberPositions[i * 3 + 2] = (Math.random() - 0.5) * 80;
        }
        this.emberGeo.setAttribute('position', new THREE.BufferAttribute(this.emberPositions, 3));

        const emberMat = new THREE.PointsMaterial({
            color: 0xfb923c, // glowing orange ember
            size: 0.35,
            transparent: true,
            opacity: 0.85,
            blending: THREE.AdditiveBlending,
        });
        this.emberPoints = new THREE.Points(this.emberGeo, emberMat);
        this.scene.add(this.emberPoints);
    }

    renderLoop() {
        if (!this.isRunning) return;
        this.rafId = requestAnimationFrame(this.animate);

        const delta = Math.min(this.clock.getDelta(), 0.1);
        const elapsed = this.clock.getElapsedTime();

        // Pulsating lava light
        const pulse = Math.sin(elapsed * 4.0) * 0.6 + Math.cos(elapsed * 7.0) * 0.4;
        this.craterLight.intensity = 3.6 + pulse;
        this.lavaLakeMat.emissiveIntensity = 1.0 + pulse * 0.3;

        // Slow camera orbit around volcano
        this.camera.position.x = Math.sin(elapsed * 0.12) * 55;
        this.camera.position.z = Math.cos(elapsed * 0.12) * 55;
        this.camera.lookAt(0, 12, 0);

        // Animate rising smoke
        const sPos = this.smokeGeo.attributes.position.array;
        for (let i = 0; i < this.smokeCount; i++) {
            sPos[i * 3 + 1] += this.smokeVelocities[i].vy * delta * 8;
            sPos[i * 3] += this.smokeVelocities[i].vx * delta * 8;
            sPos[i * 3 + 2] += this.smokeVelocities[i].vz * delta * 8;

            if (sPos[i * 3 + 1] > 46) {
                sPos[i * 3 + 1] = 22;
                sPos[i * 3] = (Math.random() - 0.5) * 4;
                sPos[i * 3 + 2] = (Math.random() - 0.5) * 4;
            }
        }
        this.smokeGeo.attributes.position.needsUpdate = true;

        // Animate drifting embers
        const ePos = this.emberGeo.attributes.position.array;
        for (let i = 0; i < this.emberCount; i++) {
            ePos[i * 3 + 1] -= delta * 3.5;
            ePos[i * 3] += Math.sin(elapsed + i) * delta * 2.0;

            if (ePos[i * 3 + 1] <= 0) {
                ePos[i * 3 + 1] = 38;
            }
        }
        this.emberGeo.attributes.position.needsUpdate = true;

        this.renderer.render(this.scene, this.camera);
    }

    dispose() {
        this.isRunning = false;
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
        window.removeEventListener('resize', this.onResize);

        this.scene.traverse((obj) => {
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) {
                if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
                else obj.material.dispose();
            }
        });

        this.renderer.dispose();
        if (this.domElement && this.domElement.parentNode === this.container) {
            this.container.removeChild(this.domElement);
        }
    }
}
