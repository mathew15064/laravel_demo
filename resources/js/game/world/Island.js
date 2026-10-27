import * as THREE from 'three';

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
        this.buildGovernanceBanner();
        this.buildLabel();
        this.buildHighlightRing();

        this.scene.add(this.group);
    }

    buildTerrain() {
        // 1. Sand Beach Base
        const sandGeo = new THREE.CylinderGeometry(this.radius, this.radius * 1.25, 2.2, 18);
        const sandMat = new THREE.MeshStandardMaterial({
            color: 0xf5d09b,
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

        // 3. Central Hill / Elevated ridge
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

        const trunkGeo = new THREE.CylinderGeometry(0.12, 0.22, 2.8, 6);
        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x854d0e, roughness: 0.9, flatShading: true });
        const trunk = new THREE.Mesh(trunkGeo, trunkMat);
        trunk.position.y = 1.4;
        trunk.rotation.z = (Math.random() - 0.5) * 0.25;
        trunk.rotation.x = (Math.random() - 0.5) * 0.25;
        trunk.castShadow = true;
        palmGroup.add(trunk);

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

        const wallGeo = new THREE.BoxGeometry(1.6, 1.2, 1.4);
        const wallMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.8, flatShading: true });
        const walls = new THREE.Mesh(wallGeo, wallMat);
        walls.position.y = 0.6;
        walls.castShadow = true;
        houseGroup.add(walls);

        const roofGeo = new THREE.ConeGeometry(1.4, 1.0, 4);
        const roofMat = new THREE.MeshStandardMaterial({ color: 0xe11d48, roughness: 0.7, flatShading: true });
        const roof = new THREE.Mesh(roofGeo, roofMat);
        roof.position.y = 1.6;
        roof.rotation.y = Math.PI / 4;
        roof.castShadow = true;
        houseGroup.add(roof);

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
        const angle = 0.3;
        const dockX = Math.cos(angle) * (this.radius * 0.9);
        const dockZ = Math.sin(angle) * (this.radius * 0.9);
        dockGroup.position.set(dockX, 0.45, dockZ);
        dockGroup.rotation.y = -angle;

        const plankGeo = new THREE.BoxGeometry(1.8, 0.18, 4.2);
        const plankMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.9 });
        const planks = new THREE.Mesh(plankGeo, plankMat);
        planks.position.z = 1.5;
        planks.castShadow = true;
        dockGroup.add(planks);

        this.group.add(dockGroup);
    }

    createLighthouse() {
        const lightGroup = new THREE.Group();
        lightGroup.position.set(0, 2.5, 0);

        const towerGeo = new THREE.CylinderGeometry(0.7, 1.1, 5.5, 12);
        const towerMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.6 });
        const tower = new THREE.Mesh(towerGeo, towerMat);
        tower.position.y = 2.75;
        tower.castShadow = true;
        lightGroup.add(tower);

        const lanternGeo = new THREE.CylinderGeometry(0.8, 0.8, 0.9, 8);
        const lanternMat = new THREE.MeshStandardMaterial({
            color: 0xfef08a,
            emissive: 0xfef08a,
            emissiveIntensity: 0.9,
        });
        const lantern = new THREE.Mesh(lanternGeo, lanternMat);
        lantern.position.y = 5.6;
        lightGroup.add(lantern);

        this.group.add(lightGroup);
    }

    buildGovernanceBanner() {
        if (this.bannerGroup) {
            this.group.remove(this.bannerGroup);
        }

        const govGod = this.data.governing_god;
        const colorHex = govGod?.god_color || '#8b5cf6';
        const colorInt = parseInt(colorHex.replace('#', '0x'), 16);

        if (!this.data.governed_by_god_id) return;

        this.bannerGroup = new THREE.Group();
        this.bannerGroup.position.set(0.5, 3.2, -0.5);

        // Flagpole
        const poleGeo = new THREE.CylinderGeometry(0.06, 0.08, 4.2, 8);
        const poleMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.8, roughness: 0.3 });
        const pole = new THREE.Mesh(poleGeo, poleMat);
        pole.position.y = 2.1;
        this.bannerGroup.add(pole);

        // Flag banner cloth
        const flagGeo = new THREE.BoxGeometry(1.6, 0.9, 0.05);
        const flagMat = new THREE.MeshStandardMaterial({
            color: colorInt,
            emissive: colorInt,
            emissiveIntensity: 0.3,
            roughness: 0.6,
        });
        const flag = new THREE.Mesh(flagGeo, flagMat);
        flag.position.set(0.85, 3.6, 0);
        this.bannerGroup.add(flag);

        this.group.add(this.bannerGroup);
    }

    buildLabel() {
        const canvas = document.createElement('canvas');
        canvas.width = 280;
        canvas.height = 96;
        const ctx = canvas.getContext('2d');

        const govGod = this.data.governing_god;
        const borderColor = govGod?.god_color || '#38bdf8';

        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(6, 6, 268, 84, 14);
        } else {
            ctx.rect(6, 6, 268, 84);
        }
        ctx.fill();
        ctx.stroke();

        ctx.font = 'bold 22px system-ui, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText(this.name, 140, 34);

        if (this.data.banner_name) {
            ctx.font = 'italic 12px system-ui, sans-serif';
            ctx.fillStyle = borderColor;
            ctx.fillText(this.data.banner_name, 140, 54);

            ctx.font = '13px monospace, sans-serif';
            ctx.fillStyle = '#38bdf8';
            ctx.fillText(`Dân số: ${this.data.population ?? 0}`, 140, 76);
        } else {
            ctx.font = '14px monospace, sans-serif';
            ctx.fillStyle = '#38bdf8';
            ctx.fillText(`Dân số: ${this.data.population ?? 0}`, 140, 64);
        }

        this.labelTexture = new THREE.CanvasTexture(canvas);
        const spriteMat = new THREE.SpriteMaterial({
            map: this.labelTexture,
            transparent: true,
            depthTest: false,
        });
        this.labelSprite = new THREE.Sprite(spriteMat);
        this.labelSprite.scale.set(4.6, 1.5, 1);
        this.labelSprite.position.set(0, 6.2, 0);
        this.group.add(this.labelSprite);
    }

    updateLabel(newName = null, newPopulation = null, newGovernance = null) {
        if (newName !== null) this.name = newName;
        if (newPopulation !== null) this.data.population = newPopulation;
        if (newGovernance !== null) {
            this.data.governed_by_god_id = newGovernance.governed_by_god_id;
            this.data.governing_god = newGovernance.governing_god;
            this.data.banner_name = newGovernance.banner_name;
            this.buildGovernanceBanner();
        }

        const canvas = document.createElement('canvas');
        canvas.width = 280;
        canvas.height = 96;
        const ctx = canvas.getContext('2d');

        const govGod = this.data.governing_god;
        const borderColor = govGod?.god_color || '#38bdf8';

        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(6, 6, 268, 84, 14);
        } else {
            ctx.rect(6, 6, 268, 84);
        }
        ctx.fill();
        ctx.stroke();

        ctx.font = 'bold 22px system-ui, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText(this.name, 140, 34);

        if (this.data.banner_name) {
            ctx.font = 'italic 12px system-ui, sans-serif';
            ctx.fillStyle = borderColor;
            ctx.fillText(this.data.banner_name, 140, 54);

            ctx.font = '13px monospace, sans-serif';
            ctx.fillStyle = '#38bdf8';
            ctx.fillText(`Dân số: ${this.data.population ?? 0}`, 140, 76);
        } else {
            ctx.font = '14px monospace, sans-serif';
            ctx.fillStyle = '#38bdf8';
            ctx.fillText(`Dân số: ${this.data.population ?? 0}`, 140, 64);
        }

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
