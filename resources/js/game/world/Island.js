import * as THREE from 'three';

// Shared geometries and materials across all islands to minimize draw calls and GPU allocations
const SHARED_TRUNK_GEO = new THREE.CylinderGeometry(0.12, 0.22, 2.8, 6);
const SHARED_LEAF_GEO = new THREE.ConeGeometry(0.7, 1.8, 4);
const SHARED_HOUSE_WALL_GEO = new THREE.BoxGeometry(1.6, 1.2, 1.4);
const SHARED_HOUSE_ROOF_GEO = new THREE.ConeGeometry(1.4, 1.0, 4);
const SHARED_ROCK_GEO = new THREE.DodecahedronGeometry(0.8, 0);
const SHARED_DOCK_GEO = new THREE.BoxGeometry(1.8, 0.18, 4.2);

const SHARED_TRUNK_MAT = new THREE.MeshLambertMaterial({ color: 0x854d0e, flatShading: true });
const SHARED_LEAF_MAT = new THREE.MeshLambertMaterial({ color: 0x15803d, flatShading: true });
const SHARED_HOUSE_WALL_MAT = new THREE.MeshLambertMaterial({ color: 0xfef08a, flatShading: true });
const SHARED_HOUSE_ROOF_MAT = new THREE.MeshLambertMaterial({ color: 0xe11d48, flatShading: true });
const SHARED_ROCK_MAT = new THREE.MeshLambertMaterial({ color: 0x64748b, flatShading: true });
const SHARED_DOCK_MAT = new THREE.MeshLambertMaterial({ color: 0x78350f, flatShading: true });
const SHARED_SAND_MAT = new THREE.MeshLambertMaterial({ color: 0xf5d09b, flatShading: true });

const _dummy = new THREE.Object3D();

/**
 * Paradise Gods - Procedural Island
 * Creates stylized low-poly island with sand, grass terrain, palm trees, houses, docks,
 * governing God banner/aura, and labels.
 */
export class Island {
    constructor(scene, islandData) {
        this.scene = scene;
        this.data = islandData;
        this.id = islandData.id;
        this.name = islandData.name;
        this.worldX = islandData.world_x;
        this.worldZ = islandData.world_z;
        this.radius = islandData.radius;
        this.type = islandData.type || 'tropical';
        this.seed = islandData.seed || 1;

        this.group = new THREE.Group();
        this.group.position.set(this.worldX, 0, this.worldZ);
        this.group.userData = { isIsland: true, islandId: this.id, islandInstance: this };

        this.buildTerrain();
        this.buildDecorations();
        this.buildLabel();
        this.buildHighlightRing();

        this.scene.add(this.group);
    }

    buildTerrain() {
        // 1. Sand Beach Base
        const sandGeo = new THREE.CylinderGeometry(this.radius, this.radius * 1.25, 2.2, 18);
        const sandMesh = new THREE.Mesh(sandGeo, SHARED_SAND_MAT);
        sandMesh.position.y = 0.4;
        sandMesh.receiveShadow = true;
        sandMesh.userData = { isIsland: true, islandId: this.id };
        this.group.add(sandMesh);

        // 2. Lush Green Grass Plateau
        const grassRadius = this.radius * 0.82;
        const grassHeight = 1.4;
        const grassGeo = new THREE.CylinderGeometry(grassRadius * 0.95, grassRadius, grassHeight, 18);
        const grassColor = this.type === 'forest' ? 0x22c55e : (this.type === 'capital' ? 0x16a34a : 0x4ade80);
        const grassMat = new THREE.MeshLambertMaterial({
            color: grassColor,
            flatShading: true,
        });
        const grassMesh = new THREE.Mesh(grassGeo, grassMat);
        grassMesh.position.y = 1.5;
        grassMesh.castShadow = true;
        grassMesh.receiveShadow = true;
        grassMesh.userData = { isIsland: true, islandId: this.id };
        this.group.add(grassMesh);

        // 3. Central Hill / Elevated ridge
        const hillRadius = grassRadius * 0.55;
        const hillGeo = new THREE.ConeGeometry(hillRadius, 1.8, 12);
        const hillMesh = new THREE.Mesh(hillGeo, grassMat);
        hillMesh.position.set(0.5, 2.6, -0.5);
        this.group.add(hillMesh);
    }

    buildDecorations() {
        const rand = (min, max) => min + Math.random() * (max - min);

        // 1. Instanced Palm Trees (Trunks & Leaves grouped in 2 draw calls)
        const palmCount = Math.floor(rand(3, 6));
        const trunkInstanced = new THREE.InstancedMesh(SHARED_TRUNK_GEO, SHARED_TRUNK_MAT, palmCount);
        trunkInstanced.castShadow = true;
        const leavesInstanced = new THREE.InstancedMesh(SHARED_LEAF_GEO, SHARED_LEAF_MAT, palmCount * 5);

        let leafIdx = 0;
        for (let i = 0; i < palmCount; i++) {
            const angle = (i / palmCount) * Math.PI * 2 + rand(-0.3, 0.3);
            const dist = rand(this.radius * 0.35, this.radius * 0.75);
            const px = Math.cos(angle) * dist;
            const pz = Math.sin(angle) * dist;
            const py = 2.0;

            const tiltZ = (Math.random() - 0.5) * 0.25;
            const tiltX = (Math.random() - 0.5) * 0.25;

            _dummy.position.set(px, py + 1.4, pz);
            _dummy.rotation.set(tiltX, 0, tiltZ);
            _dummy.scale.set(1, 1, 1);
            _dummy.updateMatrix();
            trunkInstanced.setMatrixAt(i, _dummy.matrix);

            // 5 palm fronds per tree
            for (let j = 0; j < 5; j++) {
                const leafAngle = (j / 5) * Math.PI * 2;
                _dummy.position.set(
                    px + Math.cos(leafAngle) * 0.6,
                    py + 2.8,
                    pz + Math.sin(leafAngle) * 0.6
                );
                _dummy.rotation.set(Math.sin(leafAngle) * 1.1, 0, -Math.cos(leafAngle) * 1.1);
                _dummy.scale.set(1, 1, 1);
                _dummy.updateMatrix();
                leavesInstanced.setMatrixAt(leafIdx++, _dummy.matrix);
            }
        }
        trunkInstanced.instanceMatrix.needsUpdate = true;
        leavesInstanced.instanceMatrix.needsUpdate = true;
        this.group.add(trunkInstanced);
        this.group.add(leavesInstanced);

        // 2. Instanced Houses (Walls & Roofs in 2 draw calls)
        const houseCount = this.type === 'capital' ? 4 : (this.type === 'harbor' ? 3 : 2);
        const wallsInstanced = new THREE.InstancedMesh(SHARED_HOUSE_WALL_GEO, SHARED_HOUSE_WALL_MAT, houseCount);
        wallsInstanced.castShadow = true;
        const roofInstanced = new THREE.InstancedMesh(SHARED_HOUSE_ROOF_GEO, SHARED_HOUSE_ROOF_MAT, houseCount);

        for (let i = 0; i < houseCount; i++) {
            const angle = (i / houseCount) * Math.PI * 2 + 0.8;
            const dist = rand(this.radius * 0.25, this.radius * 0.6);
            const hx = Math.cos(angle) * dist;
            const hz = Math.sin(angle) * dist;
            const hy = 2.1;
            const rotY = angle + Math.PI / 2;

            _dummy.position.set(hx, hy + 0.6, hz);
            _dummy.rotation.set(0, rotY, 0);
            _dummy.scale.set(1, 1, 1);
            _dummy.updateMatrix();
            wallsInstanced.setMatrixAt(i, _dummy.matrix);

            _dummy.position.set(hx, hy + 1.6, hz);
            _dummy.rotation.set(0, rotY + Math.PI / 4, 0);
            _dummy.scale.set(1, 1, 1);
            _dummy.updateMatrix();
            roofInstanced.setMatrixAt(i, _dummy.matrix);
        }
        wallsInstanced.instanceMatrix.needsUpdate = true;
        roofInstanced.instanceMatrix.needsUpdate = true;
        this.group.add(wallsInstanced);
        this.group.add(roofInstanced);

        // 3. Instanced Rocks (1 draw call)
        const rockInstanced = new THREE.InstancedMesh(SHARED_ROCK_GEO, SHARED_ROCK_MAT, 4);
        for (let i = 0; i < 4; i++) {
            const angle = rand(0, Math.PI * 2);
            const dist = rand(this.radius * 0.7, this.radius * 0.95);
            const s = 0.7 + Math.random() * 0.5;
            _dummy.position.set(Math.cos(angle) * dist, 0.9, Math.sin(angle) * dist);
            _dummy.rotation.set(Math.random(), Math.random(), Math.random());
            _dummy.scale.set(s, s, s);
            _dummy.updateMatrix();
            rockInstanced.setMatrixAt(i, _dummy.matrix);
        }
        rockInstanced.instanceMatrix.needsUpdate = true;
        this.group.add(rockInstanced);

        // 4. Wooden Dock extending toward water
        this.createDock();

        // Lighthouse if lighthouse type
        if (this.type === 'lighthouse') {
            this.createLighthouse();
        }
    }

    createDock() {
        const dockGroup = new THREE.Group();
        const angle = 0.3;
        const dockX = Math.cos(angle) * (this.radius * 0.9);
        const dockZ = Math.sin(angle) * (this.radius * 0.9);
        dockGroup.position.set(dockX, 0.45, dockZ);
        dockGroup.rotation.y = -angle;

        const planks = new THREE.Mesh(SHARED_DOCK_GEO, SHARED_DOCK_MAT);
        planks.position.z = 1.5;
        dockGroup.add(planks);

        this.group.add(dockGroup);
    }

    createLighthouse() {
        const lightGroup = new THREE.Group();
        lightGroup.position.set(0, 2.5, 0);

        const towerGeo = new THREE.CylinderGeometry(0.7, 1.1, 5.5, 12);
        const towerMat = new THREE.MeshLambertMaterial({ color: 0xf8fafc });
        const tower = new THREE.Mesh(towerGeo, towerMat);
        tower.position.y = 2.75;
        lightGroup.add(tower);

        const lanternGeo = new THREE.CylinderGeometry(0.8, 0.8, 0.9, 8);
        const lanternMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
        const lantern = new THREE.Mesh(lanternGeo, lanternMat);
        lantern.position.y = 5.6;
        lightGroup.add(lantern);

        this.group.add(lightGroup);
    }

    buildGovernanceBanner() {
        // No flags or banners in cooperative shared world
    }

    buildLabel() {
        const canvas = document.createElement('canvas');
        canvas.width = 280;
        canvas.height = 84;
        const ctx = canvas.getContext('2d');

        const borderColor = '#38bdf8';

        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(6, 6, 268, 72, 14);
        } else {
            ctx.rect(6, 6, 268, 72);
        }
        ctx.fill();
        ctx.stroke();

        ctx.font = 'bold 22px system-ui, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText(this.name, 140, 36);

        ctx.font = '14px monospace, sans-serif';
        ctx.fillStyle = '#38bdf8';
        ctx.fillText(`Dân số: ${this.data.population ?? 0}`, 140, 60);

        this.labelTexture = new THREE.CanvasTexture(canvas);
        const spriteMat = new THREE.SpriteMaterial({
            map: this.labelTexture,
            transparent: true,
            depthTest: false,
        });
        this.labelSprite = new THREE.Sprite(spriteMat);
        this.labelSprite.scale.set(4.6, 1.4, 1);
        this.labelSprite.position.set(0, 6.2, 0);
        this.group.add(this.labelSprite);
    }

    updateLabel(newName = null, newPopulation = null) {
        if (newName !== null) this.name = newName;
        if (newPopulation !== null) this.data.population = newPopulation;

        const canvas = document.createElement('canvas');
        canvas.width = 280;
        canvas.height = 84;
        const ctx = canvas.getContext('2d');

        const borderColor = '#38bdf8';

        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(6, 6, 268, 72, 14);
        } else {
            ctx.rect(6, 6, 268, 72);
        }
        ctx.fill();
        ctx.stroke();

        ctx.font = 'bold 22px system-ui, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText(this.name, 140, 36);

        ctx.font = '14px monospace, sans-serif';
        ctx.fillStyle = '#38bdf8';
        ctx.fillText(`Dân số: ${this.data.population ?? 0}`, 140, 60);

        if (this.labelTexture) {
            this.labelTexture.image = canvas;
            this.labelTexture.needsUpdate = true;
        }
    }

    buildHighlightRing() {
        const ringGeo = new THREE.RingGeometry(this.radius * 0.95, this.radius * 1.05, 32);
        const ringMat = new THREE.MeshBasicMaterial({
            color: 0x38bdf8,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0,
        });
        this.highlightRing = new THREE.Mesh(ringGeo, ringMat);
        this.highlightRing.rotation.x = Math.PI / 2;
        this.highlightRing.position.y = 0.15;
        this.group.add(this.highlightRing);
    }

    setSelected(selected) {
        if (this.highlightRing) {
            this.highlightRing.material.opacity = selected ? 0.8 : 0;
        }
    }

    isInside(worldX, worldZ) {
        const dx = worldX - this.worldX;
        const dz = worldZ - this.worldZ;
        return (dx * dx + dz * dz) <= (this.radius * this.radius);
    }
}
