import * as THREE from 'three';

/**
 * Paradise Gods - Procedural Island
 * Creates stylized low-poly island with sand, grass terrain, palm trees, houses, docks, and labels.
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
        // 1. Sand Beach Base (tapered cylinder / cone)
        const sandGeo = new THREE.CylinderGeometry(this.radius, this.radius * 1.25, 2.2, 18);
        const sandMat = new THREE.MeshStandardMaterial({
            color: 0xf5d09b, // Warm tropical golden sand
            roughness: 0.85,
            flatShading: true,
        });
        const sandMesh = new THREE.Mesh(sandGeo, sandMat);
        sandMesh.position.y = 0.4;
        sandMesh.castShadow = true;
        sandMesh.receiveShadow = true;
        sandMesh.userData = { isIsland: true, islandId: this.id };
        this.group.add(sandMesh);

        // 2. Lush Green Grass Plateau
        const grassRadius = this.radius * 0.82;
        const grassHeight = 1.4;
        const grassGeo = new THREE.CylinderGeometry(grassRadius * 0.95, grassRadius, grassHeight, 18);
        const grassColor = this.type === 'forest' ? 0x22c55e : (this.type === 'capital' ? 0x16a34a : 0x4ade80);
        const grassMat = new THREE.MeshStandardMaterial({
            color: grassColor,
            roughness: 0.75,
            flatShading: true,
        });
        const grassMesh = new THREE.Mesh(grassGeo, grassMat);
        grassMesh.position.y = 1.5;
        grassMesh.castShadow = true;
        grassMesh.receiveShadow = true;
        grassMesh.userData = { isIsland: true, islandId: this.id };
        this.group.add(grassMesh);

        // 3. Central Hill / Elevated ridge for depth
        const hillRadius = grassRadius * 0.55;
        const hillGeo = new THREE.ConeGeometry(hillRadius, 1.8, 12);
        const hillMesh = new THREE.Mesh(hillGeo, grassMat);
        hillMesh.position.set(0.5, 2.6, -0.5);
        hillMesh.castShadow = true;
        this.group.add(hillMesh);
    }

    buildDecorations() {
        const rand = (min, max) => min + Math.random() * (max - min);

        // Palm Trees (3 to 6 per island)
        const palmCount = Math.floor(rand(3, 6));
        for (let i = 0; i < palmCount; i++) {
            const angle = (i / palmCount) * Math.PI * 2 + rand(-0.3, 0.3);
            const dist = rand(this.radius * 0.35, this.radius * 0.75);
            this.createPalmTree(Math.cos(angle) * dist, 2.0, Math.sin(angle) * dist);
        }

        // Low-Poly Houses / Cottages
        const houseCount = this.type === 'capital' ? 4 : (this.type === 'harbor' ? 3 : 2);
        for (let i = 0; i < houseCount; i++) {
            const angle = (i / houseCount) * Math.PI * 2 + 0.8;
            const dist = rand(this.radius * 0.25, this.radius * 0.6);
            this.createHouse(Math.cos(angle) * dist, 2.1, Math.sin(angle) * dist, angle + Math.PI / 2);
        }

        // Low-Poly Rocks
        for (let i = 0; i < 4; i++) {
            const angle = rand(0, Math.PI * 2);
            const dist = rand(this.radius * 0.7, this.radius * 0.95);
            this.createRock(Math.cos(angle) * dist, 0.9, Math.sin(angle) * dist);
        }

        // Wooden Dock extending toward water
        this.createDock();

        // Lighthouse if lighthouse type
        if (this.type === 'lighthouse') {
            this.createLighthouse();
        }
    }

    createPalmTree(x, y, z) {
        const palmGroup = new THREE.Group();
        palmGroup.position.set(x, y, z);

        // Trunk: slight lean
        const trunkGeo = new THREE.CylinderGeometry(0.12, 0.22, 2.8, 6);
        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x854d0e, roughness: 0.9, flatShading: true });
        const trunk = new THREE.Mesh(trunkGeo, trunkMat);
        trunk.position.y = 1.4;
        trunk.rotation.z = (Math.random() - 0.5) * 0.25;
        trunk.rotation.x = (Math.random() - 0.5) * 0.25;
        trunk.castShadow = true;
        palmGroup.add(trunk);

        // Fronds: 5 leaf cones
        const leafMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.6, flatShading: true });
        for (let i = 0; i < 5; i++) {
            const leafGeo = new THREE.ConeGeometry(0.7, 1.8, 4);
            const leaf = new THREE.Mesh(leafGeo, leafMat);
            const leafAngle = (i / 5) * Math.PI * 2;
            leaf.position.set(Math.cos(leafAngle) * 0.6, 2.8, Math.sin(leafAngle) * 0.6);
            leaf.rotation.x = Math.sin(leafAngle) * 1.1;
            leaf.rotation.z = -Math.cos(leafAngle) * 1.1;
            leaf.castShadow = true;
            palmGroup.add(leaf);
        }

        this.group.add(palmGroup);
    }

    createHouse(x, y, z, rotY) {
        const houseGroup = new THREE.Group();
        houseGroup.position.set(x, y, z);
        houseGroup.rotation.y = rotY;

        // Base walls (plaster/timber)
        const wallGeo = new THREE.BoxGeometry(1.6, 1.2, 1.4);
        const wallMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.8, flatShading: true });
        const walls = new THREE.Mesh(wallGeo, wallMat);
        walls.position.y = 0.6;
        walls.castShadow = true;
        houseGroup.add(walls);

        // Roof (terracotta orange / tile)
        const roofGeo = new THREE.ConeGeometry(1.4, 1.0, 4);
        const roofMat = new THREE.MeshStandardMaterial({ color: 0xe11d48, roughness: 0.7, flatShading: true });
        const roof = new THREE.Mesh(roofGeo, roofMat);
        roof.position.y = 1.6;
        roof.rotation.y = Math.PI / 4;
        roof.castShadow = true;
        houseGroup.add(roof);

        // Small door
        const doorGeo = new THREE.BoxGeometry(0.4, 0.6, 0.05);
        const doorMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.9 });
        const door = new THREE.Mesh(doorGeo, doorMat);
        door.position.set(0, 0.35, 0.72);
        houseGroup.add(door);

        this.group.add(houseGroup);
    }

    createRock(x, y, z) {
        const rockGeo = new THREE.DodecahedronGeometry(0.65 + Math.random() * 0.4, 0);
        const rockMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.9, flatShading: true });
        const rock = new THREE.Mesh(rockGeo, rockMat);
        rock.position.set(x, y, z);
        rock.rotation.set(Math.random(), Math.random(), Math.random());
        rock.castShadow = true;
        this.group.add(rock);
    }

    createDock() {
        const dockGroup = new THREE.Group();
        const angle = -Math.PI / 3;
        const startDist = this.radius * 0.85;
        dockGroup.position.set(Math.cos(angle) * startDist, 0.4, Math.sin(angle) * startDist);
        dockGroup.rotation.y = -angle;

        // Wooden walkway planks
        const dockGeo = new THREE.BoxGeometry(1.4, 0.15, 3.8);
        const dockMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.9, flatShading: true });
        const dock = new THREE.Mesh(dockGeo, dockMat);
        dock.position.z = 1.8;
        dock.castShadow = true;
        dockGroup.add(dock);

        // Pilings
        const pilGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.4, 5);
        for (const pz of [0.8, 2.2, 3.5]) {
            for (const px of [-0.6, 0.6]) {
                const pil = new THREE.Mesh(pilGeo, dockMat);
                pil.position.set(px, -0.6, pz);
                dockGroup.add(pil);
            }
        }

        this.group.add(dockGroup);
    }

    createLighthouse() {
        const lightGroup = new THREE.Group();
        lightGroup.position.set(0, 2.2, 0);

        // Tower
        const towerGeo = new THREE.CylinderGeometry(0.7, 1.2, 5.0, 8);
        const towerMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.6, flatShading: true });
        const tower = new THREE.Mesh(towerGeo, towerMat);
        tower.position.y = 2.5;
        tower.castShadow = true;
        lightGroup.add(tower);

        // Red stripe bands
        const bandGeo = new THREE.CylinderGeometry(0.85, 0.95, 0.8, 8);
        const bandMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.7, flatShading: true });
        const band = new THREE.Mesh(bandGeo, bandMat);
        band.position.y = 2.8;
        lightGroup.add(band);

        // Glass lantern
        const lanternGeo = new THREE.CylinderGeometry(0.65, 0.65, 0.9, 8);
        const lanternMat = new THREE.MeshStandardMaterial({
            color: 0xfef08a,
            emissive: 0xfef08a,
            emissiveIntensity: 0.8,
            transparent: true,
            opacity: 0.9,
        });
        const lantern = new THREE.Mesh(lanternGeo, lanternMat);
        lantern.position.y = 5.4;
        lightGroup.add(lantern);

        // Lighthouse point light
        const light = new THREE.PointLight(0xfef08a, 2.0, 15);
        light.position.y = 5.5;
        lightGroup.add(light);

        this.group.add(lightGroup);
    }

    buildLabel() {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 80;
        const ctx = canvas.getContext('2d');

        // Dark pill background
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 3;
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(6, 6, 244, 68, 12);
        } else {
            ctx.rect(6, 6, 244, 68);
        }
        ctx.fill();
        ctx.stroke();

        // Island Name
        ctx.font = 'bold 22px system-ui, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText(this.name, 128, 36);

        // Population
        ctx.font = '14px monospace, sans-serif';
        ctx.fillStyle = '#38bdf8';
        ctx.fillText(`Dân số: ${this.data.population ?? 0}`, 128, 60);

        this.labelTexture = new THREE.CanvasTexture(canvas);
        const spriteMat = new THREE.SpriteMaterial({
            map: this.labelTexture,
            transparent: true,
            depthTest: false,
        });
        this.labelSprite = new THREE.Sprite(spriteMat);
        this.labelSprite.scale.set(4.2, 1.3, 1);
        this.labelSprite.position.set(0, 5.2, 0);
        this.group.add(this.labelSprite);
    }

    updateLabel(newName = null, newPopulation = null) {
        if (newName !== null) this.name = newName;
        if (newPopulation !== null) this.data.population = newPopulation;

        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 80;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 3;
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(6, 6, 244, 68, 12);
        } else {
            ctx.rect(6, 6, 244, 68);
        }
        ctx.fill();
        ctx.stroke();

        ctx.font = 'bold 22px system-ui, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText(this.name, 128, 36);

        ctx.font = '14px monospace, sans-serif';
        ctx.fillStyle = '#38bdf8';
        ctx.fillText(`Dân số: ${this.data.population ?? 0}`, 128, 60);

        this.labelTexture.image = canvas;
        this.labelTexture.needsUpdate = true;
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
