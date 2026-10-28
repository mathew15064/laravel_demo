import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { PERFORMANCE_CONFIG } from '../config/performance.js';

/**
 * Paradise Gods - Tropical Environment & Atmosphere
 * Dreamy atmospheric sky dome, warm cinematic sunlight, two-tier parallax cumulus clouds,
 * circling seagulls, bobbing tropical fishing boats, and complete lifecycle disposal.
 */
export class Environment {
    constructor(scene) {
        this.scene = scene;
        this.clouds = [];
        this.birds = [];
        this.boats = [];
        this.disposables = [];

        this.setupSkyDome();
        this.setupLighting();
        this.createClouds();
        this.createBirds();
        this.createBoats();
    }

    setupSkyDome() {
        // Atmospheric gradient sky dome
        const skyGeo = new THREE.SphereGeometry(280, 24, 16);
        // Invert geometry so faces point inward
        skyGeo.scale(-1, 1, 1);

        const vertexShader = `
            varying vec3 vWorldPosition;
            void main() {
                vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                vWorldPosition = worldPosition.xyz;
                gl_Position = projectionMatrix * viewMatrix * worldPosition;
            }
        `;

        const fragmentShader = `
            varying vec3 vWorldPosition;
            void main() {
                // Vertical gradient from horizon to zenith
                float h = normalize(vWorldPosition).y;

                // Zenith: celestial tropical blue
                vec3 topColor = vec3(0.12, 0.65, 0.95);
                // Mid-sky: soft azure
                vec3 midColor = vec3(0.55, 0.82, 0.98);
                // Horizon: warm golden tropical sun haze
                vec3 horizonColor = vec3(0.98, 0.95, 0.88);
                // Below horizon: soft celestial horizon haze
                vec3 oceanHaze = vec3(0.55, 0.82, 0.98);

                vec3 sky = mix(horizonColor, midColor, smoothstep(0.02, 0.35, h));
                sky = mix(sky, topColor, smoothstep(0.35, 0.95, h));

                if (h < 0.02) {
                    sky = mix(oceanHaze, horizonColor, smoothstep(-0.4, 0.02, h));
                }

                gl_FragColor = vec4(sky, 1.0);
            }
        `;

        const skyMat = new THREE.ShaderMaterial({
            vertexShader,
            fragmentShader,
            side: THREE.BackSide,
            depthWrite: false,
        });

        this.skyMesh = new THREE.Mesh(skyGeo, skyMat);
        this.skyMesh.name = 'skyDome';
        this.scene.add(this.skyMesh);

        this.disposables.push(skyGeo, skyMat);
    }

    setupLighting() {
        // 1. Warm tropical sunlight with soft directional shadows
        this.sunLight = new THREE.DirectionalLight(0xfffbeb, 2.2);
        this.sunLight.position.set(65, 85, 55);
        this.sunLight.castShadow = true;
        this.sunLight.shadow.mapSize.width = PERFORMANCE_CONFIG.shadowMapSize;
        this.sunLight.shadow.mapSize.height = PERFORMANCE_CONFIG.shadowMapSize;
        this.sunLight.shadow.camera.near = 10;
        this.sunLight.shadow.camera.far = PERFORMANCE_CONFIG.shadowCameraFar;
        this.sunLight.shadow.bias = -0.0005;

        const d = 95;
        this.sunLight.shadow.camera.left = -d;
        this.sunLight.shadow.camera.right = d;
        this.sunLight.shadow.camera.top = d;
        this.sunLight.shadow.camera.bottom = -d;
        this.scene.add(this.sunLight);

        // 2. Sky & sea hemisphere bounce (warm celestial sky + tropical turquoise sea reflection)
        this.hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x0d9488, 0.95);
        this.scene.add(this.hemiLight);

        // 3. Ambient light for shadow lift
        this.ambientLight = new THREE.AmbientLight(0xfffaed, 0.45);
        this.scene.add(this.ambientLight);

        // 4. Subtle warm rim fill light opposite the sun to soften dark silhouettes
        this.fillLight = new THREE.DirectionalLight(0xfef08a, 0.35);
        this.fillLight.position.set(-55, 45, -45);
        this.scene.add(this.fillLight);
    }

    createClouds() {
        const cloudCount = 10;
        const cloudMat = new THREE.MeshLambertMaterial({
            color: 0xffffff,
            flatShading: true,
            transparent: true,
            opacity: 0.88,
        });
        this.disposables.push(cloudMat);

        for (let i = 0; i < cloudCount; i++) {
            const puffCount = 5 + Math.floor(Math.random() * 4);
            const puffGeos = [];
            for (let p = 0; p < puffCount; p++) {
                const puffSize = 2.4 + Math.random() * 2.2;
                const puffGeo = new THREE.DodecahedronGeometry(puffSize, 0);
                puffGeo.translate(
                    (p - puffCount / 2) * 2.4,
                    (Math.random() - 0.5) * 1.2,
                    (Math.random() - 0.5) * 1.8
                );
                puffGeos.push(puffGeo);
            }

            const mergedCloudGeo = BufferGeometryUtils.mergeGeometries(puffGeos, false);
            this.disposables.push(mergedCloudGeo);

            const cloudMesh = new THREE.Mesh(mergedCloudGeo, cloudMat);

            // Two parallax altitude tiers: low (26-34m) and high (42-52m)
            const isHigh = i % 2 === 0;
            const x = (Math.random() - 0.5) * 180;
            const y = isHigh ? 42 + Math.random() * 10 : 26 + Math.random() * 8;
            const z = (Math.random() - 0.5) * 180;
            cloudMesh.position.set(x, y, z);
            cloudMesh.userData = {
                speed: isHigh ? 0.025 + Math.random() * 0.02 : 0.045 + Math.random() * 0.03,
                baseY: y,
                wobblePhase: Math.random() * Math.PI * 2,
            };

            this.scene.add(cloudMesh);
            this.clouds.push(cloudMesh);
        }
    }

    createBirds() {
        const birdCount = 7;
        const birdMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
        this.disposables.push(birdMat);

        for (let i = 0; i < birdCount; i++) {
            const bird = new THREE.Group();
            const wingGeo = new THREE.BufferGeometry();
            const vertices = new Float32Array([
                0, 0, 0,
                -0.65, 0.22, 0.35,
                0, 0, 0.7,

                0, 0, 0,
                0.65, 0.22, 0.35,
                0, 0, 0.7,
            ]);
            wingGeo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
            this.disposables.push(wingGeo);

            const wingMesh = new THREE.Mesh(wingGeo, birdMat);
            bird.add(wingMesh);

            bird.userData = {
                radius: 20 + Math.random() * 32,
                angle: Math.random() * Math.PI * 2,
                speed: 0.014 + Math.random() * 0.014,
                height: 16 + Math.random() * 10,
                flapSpeed: 4.5 + Math.random() * 2.5,
                wingMesh,
                center: new THREE.Vector3((Math.random() - 0.5) * 35, 0, (Math.random() - 0.5) * 35),
            };

            this.scene.add(bird);
            this.birds.push(bird);
        }
    }

    createBoats() {
        const boatPositions = [
            { x: -14, z: -20, rot: 0.4 },
            { x: 16, z: -8, rot: 1.2 },
            { x: -18, z: 8, rot: 2.1 },
            { x: 12, z: 14, rot: -0.6 },
        ];

        const hullMat = new THREE.MeshStandardMaterial({ color: 0x854d0e, roughness: 0.75, flatShading: true });
        const sailMat = new THREE.MeshStandardMaterial({ color: 0xfefce8, roughness: 0.5, side: THREE.DoubleSide });
        this.disposables.push(hullMat, sailMat);

        boatPositions.forEach((pos, idx) => {
            const boat = new THREE.Group();
            boat.position.set(pos.x, 0.15, pos.z);
            boat.rotation.y = pos.rot;

            // Wooden hull
            const hullGeo = new THREE.BoxGeometry(1.3, 0.5, 2.8);
            this.disposables.push(hullGeo);
            const hull = new THREE.Mesh(hullGeo, hullMat);
            hull.position.y = 0.12;
            hull.castShadow = true;
            boat.add(hull);

            // Mast
            const mastGeo = new THREE.CylinderGeometry(0.04, 0.04, 2.4, 5);
            this.disposables.push(mastGeo);
            const mast = new THREE.Mesh(mastGeo, hullMat);
            mast.position.set(0, 1.3, 0);
            boat.add(mast);

            // Sail
            const sailGeo = new THREE.BufferGeometry();
            const sailVerts = new Float32Array([
                0, 0.4, 0,
                0, 2.1, 0,
                1.0, 0.65, 0,
            ]);
            sailGeo.setAttribute('position', new THREE.BufferAttribute(sailVerts, 3));
            this.disposables.push(sailGeo);
            const sail = new THREE.Mesh(sailGeo, sailMat);
            boat.add(sail);

            boat.userData = { initialY: 0.15, phase: idx * 1.5 };
            this.scene.add(boat);
            this.boats.push(boat);
        });
    }

    update(elapsedTime) {
        // 1. Drift clouds across the sky
        this.clouds.forEach((cloud) => {
            cloud.position.x += cloud.userData.speed;
            if (cloud.position.x > 105) {
                cloud.position.x = -105;
            }
            cloud.position.y = cloud.userData.baseY + Math.sin(elapsedTime * 0.4 + cloud.userData.wobblePhase) * 0.4;
        });

        // 2. Circling birds with gentle wing flaps
        this.birds.forEach((bird) => {
            bird.userData.angle += bird.userData.speed;
            const r = bird.userData.radius;
            const a = bird.userData.angle;
            bird.position.x = bird.userData.center.x + Math.cos(a) * r;
            bird.position.z = bird.userData.center.z + Math.sin(a) * r;
            bird.position.y = bird.userData.height + Math.sin(elapsedTime * 1.8 + a) * 0.6;
            bird.rotation.y = -a + Math.PI / 2;

            if (bird.userData.wingMesh) {
                bird.userData.wingMesh.rotation.z = Math.sin(elapsedTime * bird.userData.flapSpeed) * 0.25;
            }
        });

        // 3. Gentle boat bobbing
        this.boats.forEach((boat) => {
            boat.position.y = boat.userData.initialY + Math.sin(elapsedTime * 1.8 + boat.userData.phase) * 0.09;
            boat.rotation.z = Math.sin(elapsedTime * 1.4 + boat.userData.phase) * 0.06;
        });
    }

    dispose() {
        if (this.skyMesh) {
            this.scene.remove(this.skyMesh);
        }
        if (this.sunLight) this.scene.remove(this.sunLight);
        if (this.hemiLight) this.scene.remove(this.hemiLight);
        if (this.ambientLight) this.scene.remove(this.ambientLight);
        if (this.fillLight) this.scene.remove(this.fillLight);

        this.clouds.forEach((c) => this.scene.remove(c));
        this.clouds = [];

        this.birds.forEach((b) => this.scene.remove(b));
        this.birds = [];

        this.boats.forEach((b) => this.scene.remove(b));
        this.boats = [];

        this.disposables.forEach((res) => {
            if (res && typeof res.dispose === 'function') {
                res.dispose();
            }
        });
        this.disposables = [];
    }
}
