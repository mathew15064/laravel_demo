import * as THREE from 'three';

/**
 * Paradise Gods - Tropical Environment
 * Atmospheric lighting, floating clouds, circling seagulls, and bobbing boats.
 */
export class Environment {
    constructor(scene) {
        this.scene = scene;
        this.clouds = [];
        this.birds = [];
        this.boats = [];

        this.setupLighting();
        this.createClouds();
        this.createBirds();
        this.createBoats();
    }

    setupLighting() {
        // Soft warm tropical sunlight
        this.sunLight = new THREE.DirectionalLight(0xfffaed, 1.8);
        this.sunLight.position.set(60, 80, 50);
        this.sunLight.castShadow = true;
        this.sunLight.shadow.mapSize.width = 2048;
        this.sunLight.shadow.mapSize.height = 2048;
        this.sunLight.shadow.camera.near = 10;
        this.sunLight.shadow.camera.far = 250;
        const d = 90;
        this.sunLight.shadow.camera.left = -d;
        this.sunLight.shadow.camera.right = d;
        this.sunLight.shadow.camera.top = d;
        this.sunLight.shadow.camera.bottom = -d;
        this.scene.add(this.sunLight);

        // Sky & ground hemisphere light (sky blue / ocean turquoise reflection)
        this.hemiLight = new THREE.HemisphereLight(0x7dd3fc, 0x0284c7, 0.9);
        this.scene.add(this.hemiLight);

        // Ambient light for soft shadows
        this.ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(this.ambientLight);
    }

    createClouds() {
        const cloudCount = 12;
        const cloudMat = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 0.9,
            flatShading: true,
            transparent: true,
            opacity: 0.85,
        });

        for (let i = 0; i < cloudCount; i++) {
            const cloud = new THREE.Group();
            const puffCount = 4 + Math.floor(Math.random() * 3);
            for (let p = 0; p < puffCount; p++) {
                const puffSize = 2.5 + Math.random() * 2.0;
                const puffGeo = new THREE.DodecahedronGeometry(puffSize, 0);
                const puff = new THREE.Mesh(puffGeo, cloudMat);
                puff.position.set(
                    (p - puffCount / 2) * 2.2,
                    (Math.random() - 0.5) * 1.0,
                    (Math.random() - 0.5) * 1.5
                );
                cloud.add(puff);
            }

            const x = (Math.random() - 0.5) * 160;
            const y = 24 + Math.random() * 12;
            const z = (Math.random() - 0.5) * 160;
            cloud.position.set(x, y, z);
            cloud.userData = { speed: 0.04 + Math.random() * 0.04 };

            this.scene.add(cloud);
            this.clouds.push(cloud);
        }
    }

    createBirds() {
        const birdCount = 8;
        const birdMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });

        for (let i = 0; i < birdCount; i++) {
            const bird = new THREE.Group();
            // 2 angled triangular wings
            const wingGeo = new THREE.BufferGeometry();
            const vertices = new Float32Array([
                0, 0, 0,
                -0.6, 0.2, 0.3,
                0, 0, 0.6,

                0, 0, 0,
                0.6, 0.2, 0.3,
                0, 0, 0.6,
            ]);
            wingGeo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
            const wingMesh = new THREE.Mesh(wingGeo, birdMat);
            bird.add(wingMesh);

            bird.userData = {
                radius: 18 + Math.random() * 30,
                angle: Math.random() * Math.PI * 2,
                speed: 0.015 + Math.random() * 0.015,
                height: 14 + Math.random() * 8,
                center: new THREE.Vector3((Math.random() - 0.5) * 30, 0, (Math.random() - 0.5) * 30),
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
            { x: 12, z: 12, rot: -0.6 },
        ];

        const hullMat = new THREE.MeshStandardMaterial({ color: 0x9a3412, roughness: 0.8, flatShading: true });
        const sailMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.5, side: THREE.DoubleSide });

        boatPositions.forEach((pos, idx) => {
            const boat = new THREE.Group();
            boat.position.set(pos.x, 0.15, pos.z);
            boat.rotation.y = pos.rot;

            // Hull
            const hullGeo = new THREE.BoxGeometry(1.2, 0.5, 2.6);
            const hull = new THREE.Mesh(hullGeo, hullMat);
            hull.position.y = 0.1;
            hull.castShadow = true;
            boat.add(hull);

            // Mast
            const mastGeo = new THREE.CylinderGeometry(0.04, 0.04, 2.2, 5);
            const mast = new THREE.Mesh(mastGeo, hullMat);
            mast.position.set(0, 1.2, 0);
            boat.add(mast);

            // Triangular Sail
            const sailGeo = new THREE.BufferGeometry();
            const sailVerts = new Float32Array([
                0, 0.4, 0,
                0, 2.0, 0,
                0.9, 0.6, 0,
            ]);
            sailGeo.setAttribute('position', new THREE.BufferAttribute(sailVerts, 3));
            const sail = new THREE.Mesh(sailGeo, sailMat);
            boat.add(sail);

            boat.userData = { initialY: 0.15, phase: idx * 1.5 };
            this.scene.add(boat);
            this.boats.push(boat);
        });
    }

    update(elapsedTime) {
        // Animate clouds
        this.clouds.forEach((cloud) => {
            cloud.position.x += cloud.userData.speed;
            if (cloud.position.x > 90) {
                cloud.position.x = -90;
            }
        });

        // Animate birds circling
        this.birds.forEach((bird) => {
            bird.userData.angle += bird.userData.speed;
            const r = bird.userData.radius;
            const a = bird.userData.angle;
            bird.position.x = bird.userData.center.x + Math.cos(a) * r;
            bird.position.z = bird.userData.center.z + Math.sin(a) * r;
            bird.position.y = bird.userData.height + Math.sin(elapsedTime * 2 + a) * 0.5;
            bird.rotation.y = -a + Math.PI / 2;
        });

        // Gentle boat bobbing
        this.boats.forEach((boat) => {
            boat.position.y = boat.userData.initialY + Math.sin(elapsedTime * 2 + boat.userData.phase) * 0.08;
            boat.rotation.z = Math.sin(elapsedTime * 1.5 + boat.userData.phase) * 0.05;
        });
    }
}
