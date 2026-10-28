import * as THREE from 'three';

// ---------------------------------------------------------------------------
// Shared geometries & materials to minimize draw calls and GPU memory allocations
// ---------------------------------------------------------------------------
const _dummy = new THREE.Object3D();

// Shared Materials (rich stylized tropical palette)
const MAT_SAND = new THREE.MeshLambertMaterial({ color: 0xfde68a, flatShading: true, side: THREE.DoubleSide });
const MAT_WET_SAND = new THREE.MeshLambertMaterial({ color: 0xd97706, flatShading: true, side: THREE.DoubleSide });
const MAT_WOOD_TRUNK = new THREE.MeshLambertMaterial({ color: 0x78350f, flatShading: true });
const MAT_PALM_LEAF_1 = new THREE.MeshLambertMaterial({ color: 0x15803d, flatShading: true });
const MAT_PALM_LEAF_2 = new THREE.MeshLambertMaterial({ color: 0x16a34a, flatShading: true });
const MAT_CANOPY_TREE = new THREE.MeshLambertMaterial({ color: 0x10b981, flatShading: true });
const MAT_ROCK = new THREE.MeshLambertMaterial({ color: 0x64748b, flatShading: true });
const MAT_COASTAL_BOULDER = new THREE.MeshLambertMaterial({ color: 0x475569, flatShading: true });
const MAT_DOCK_WOOD = new THREE.MeshLambertMaterial({ color: 0x582408, flatShading: true });

// Architectural Materials
const MAT_HOUSE_WALL_1 = new THREE.MeshLambertMaterial({ color: 0xfef3c7, flatShading: true });
const MAT_HOUSE_WALL_2 = new THREE.MeshLambertMaterial({ color: 0xedd5a6, flatShading: true });
const MAT_HOUSE_ROOF_TERRA = new THREE.MeshLambertMaterial({ color: 0xe11d48, flatShading: true });
const MAT_HOUSE_ROOF_THATCH = new THREE.MeshLambertMaterial({ color: 0xd97706, flatShading: true });

// Temple Materials (Capital Island Landmark)
const MAT_TEMPLE_MARBLE = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3, metalness: 0.1, flatShading: true });
const MAT_TEMPLE_GOLD = new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.2, metalness: 0.8, flatShading: true });
const MAT_TEMPLE_BRAZIER = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });

// Shared Geometries
const GEO_TRUNK_SEG = new THREE.CylinderGeometry(0.12, 0.22, 2.8, 6);
const GEO_PALM_FROND = new THREE.ConeGeometry(0.65, 1.9, 4);
const GEO_CANOPY_SPHERE = new THREE.DodecahedronGeometry(1.4, 0);
const GEO_CANOPY_TRUNK = new THREE.CylinderGeometry(0.2, 0.3, 1.8, 6);
const GEO_ROCK = new THREE.DodecahedronGeometry(0.7, 0);
const GEO_HOUSE_WALL = new THREE.BoxGeometry(1.6, 1.2, 1.4);
const GEO_HOUSE_ROOF = new THREE.ConeGeometry(1.4, 1.0, 4);
const GEO_DOCK_PLANK = new THREE.BoxGeometry(1.8, 0.18, 4.2);
const GEO_DOCK_POST = new THREE.CylinderGeometry(0.08, 0.08, 1.2, 5);

/**
 * Organic silhouette modulation using sinusoidal harmonics
 */
function getOrganicRadius(baseRadius, angle, seed = 1, type = 'tropical') {
    const a = angle + seed * 1.618;
    let modulation = Math.sin(a * 3.0) * 0.12 + Math.cos(a * 5.0) * 0.07 + Math.sin(a * 2.0 + 1.2) * 0.09;
    if (type === 'crescent') {
        modulation += Math.sin(angle) * 0.26;
    } else if (type === 'harbor') {
        modulation += (angle > 0.8 && angle < 2.4 ? -0.22 : 0.12);
    } else if (type === 'capital') {
        modulation *= 0.6; // grand rounded perimeter
    } else if (type === 'mountain') {
        modulation += Math.cos(a * 4.0) * 0.14;
    }
    return baseRadius * (1.0 + modulation);
}

/**
 * Paradise Gods - Procedural Island
 * Organic natural coastline, multi-layered terrain (wet sand, soft beach, lush grass plateau, rolling ridges),
 * diverse tropical vegetation (curving palms & broadleaf canopies), architecture variants, and unique landmarks.
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
        this.seed = islandData.seed || (this.id * 1.37);

        this.group = new THREE.Group();
        this.group.position.set(this.worldX, 0, this.worldZ);
        this.group.userData = { isIsland: true, islandId: this.id, islandInstance: this };

        this.disposables = [];

        this.buildTerrain();
        this.buildDecorations();
        this.buildLabel();
        this.buildHighlightRing();

        this.scene.add(this.group);
    }

    buildTerrain() {
        const segments = 32;
        const seed = this.seed;
        const type = this.type;
        const baseRadius = this.radius;

        // 1. Organic Sandy Beach Base & Shoreline
        // Creates a smooth organic coastline using custom vertex calculation
        const sandGeo = new THREE.BufferGeometry();
        const sandVertices = [];
        const sandIndices = [];

        // Center bottom & top vertices
        sandVertices.push(0, -1.0, 0); // index 0 (bottom center)
        sandVertices.push(0, 1.4, 0);  // index 1 (top center)

        // Radial vertices around perimeter
        for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            const r = getOrganicRadius(baseRadius, angle, seed, type);

            // Submerged wet sand outer toe
            const bx = Math.cos(angle) * (r * 1.35);
            const bz = Math.sin(angle) * (r * 1.35);
            sandVertices.push(bx, -1.2, bz); // index: 2 + i * 3 + 0

            // Shoreline at water level
            const wx = Math.cos(angle) * (r * 1.18);
            const wz = Math.sin(angle) * (r * 1.18);
            sandVertices.push(wx, 0.2, wz);  // index: 2 + i * 3 + 1

            // Beach upper shoulder
            const tx = Math.cos(angle) * (r * 0.95);
            const tz = Math.sin(angle) * (r * 0.95);
            sandVertices.push(tx, 1.35, tz);  // index: 2 + i * 3 + 2
        }

        for (let i = 0; i < segments; i++) {
            const curr = 2 + i * 3;
            const next = 2 + (i + 1) * 3;

            // Submerged toe to water skirt (CCW upward normal)
            sandIndices.push(curr + 0, next + 1, next + 0);
            sandIndices.push(curr + 0, curr + 1, next + 1);

            // Water skirt to beach shoulder (CCW upward normal)
            sandIndices.push(curr + 1, next + 2, next + 1);
            sandIndices.push(curr + 1, curr + 2, next + 2);

            // Beach shoulder to top center (CCW upward normal)
            sandIndices.push(curr + 2, 1, next + 2);
        }

        sandGeo.setIndex(sandIndices);
        sandGeo.setAttribute('position', new THREE.Float32BufferAttribute(sandVertices, 3));
        sandGeo.computeVertexNormals();

        const sandMesh = new THREE.Mesh(sandGeo, MAT_SAND);
        sandMesh.receiveShadow = true;
        sandMesh.userData = { isIsland: true, islandId: this.id };
        this.group.add(sandMesh);
        this.disposables.push(sandGeo);

        // 2. Lush Tropical Grass Plateau (Platform level at exactly y = 2.0 for citizen navigation)
        const grassGeo = new THREE.BufferGeometry();
        const grassVertices = [];
        const grassIndices = [];

        grassVertices.push(0, 1.35, 0); // bottom center
        grassVertices.push(0, 2.0, 0);  // top center

        for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            const r = getOrganicRadius(baseRadius * 0.70, angle, seed, type);

            const bx = Math.cos(angle) * (r * 0.98);
            const bz = Math.sin(angle) * (r * 0.98);
            grassVertices.push(bx, 1.35, bz); // lower grass bevel

            const tx = Math.cos(angle) * (r * 0.90);
            const tz = Math.sin(angle) * (r * 0.90);
            grassVertices.push(tx, 2.0, tz);  // upper grass plateau
        }

        for (let i = 0; i < segments; i++) {
            const curr = 2 + i * 2;
            const next = 2 + (i + 1) * 2;

            // Bevel wall (CCW outward normal)
            grassIndices.push(curr + 0, next + 1, next + 0);
            grassIndices.push(curr + 0, curr + 1, next + 1);

            // Top plateau cap (CCW upward normal)
            grassIndices.push(curr + 1, 1, next + 1);
        }

        grassGeo.setIndex(grassIndices);
        grassGeo.setAttribute('position', new THREE.Float32BufferAttribute(grassVertices, 3));
        grassGeo.computeVertexNormals();

        // Varied grass tones based on island character
        let grassColor = 0x10b981; // emerald
        if (this.type === 'capital') grassColor = 0x059669;
        else if (this.type === 'forest') grassColor = 0x047857;
        else if (this.type === 'palms') grassColor = 0x22c55e;
        else if (this.type === 'coral' || this.type === 'harbor') grassColor = 0x14b8a6;
        else if (this.type === 'mountain') grassColor = 0x15803d;

        const grassMat = new THREE.MeshLambertMaterial({ color: grassColor, flatShading: true, side: THREE.DoubleSide });
        this.disposables.push(grassGeo, grassMat);

        const grassMesh = new THREE.Mesh(grassGeo, grassMat);
        grassMesh.receiveShadow = true;
        grassMesh.castShadow = false; // Ground surface receives shadows; do not cast into shadow map to halve shadow draw calls
        grassMesh.userData = { isIsland: true, islandId: this.id };
        this.group.add(grassMesh);

        // 3. Gentle Rolling Central Mound / Ridge
        const hillRadius = baseRadius * 0.38;
        const hillHeight = this.type === 'mountain' ? 3.4 : (this.type === 'capital' ? 1.6 : 1.8);
        const hillGeo = new THREE.ConeGeometry(hillRadius, hillHeight, 14);
        this.disposables.push(hillGeo);
        const hillMesh = new THREE.Mesh(hillGeo, grassMat);
        hillMesh.position.set(Math.cos(seed) * 1.5, 2.0 + hillHeight * 0.5 - 0.2, Math.sin(seed) * 1.5);
        hillMesh.castShadow = false;
        hillMesh.receiveShadow = true;
        this.group.add(hillMesh);
    }

    buildDecorations() {
        const rand = (min, max) => min + Math.random() * (max - min);

        // -------------------------------------------------------------
        // 1. Palm Trees & Broadleaf Shade Trees
        // -------------------------------------------------------------
        const treeCount = Math.floor(rand(4, 7));
        const trunkInstanced = new THREE.InstancedMesh(GEO_TRUNK_SEG, MAT_WOOD_TRUNK, treeCount);
        trunkInstanced.castShadow = true;
        const leavesInstanced = new THREE.InstancedMesh(GEO_PALM_FROND, MAT_PALM_LEAF_1, treeCount * 6);

        let frondIdx = 0;
        for (let i = 0; i < treeCount; i++) {
            const angle = (i / treeCount) * Math.PI * 2 + rand(-0.35, 0.35);
            const dist = rand(this.radius * 0.38, this.radius * 0.72);
            const px = Math.cos(angle) * dist;
            const pz = Math.sin(angle) * dist;
            const py = 2.0;

            const leanAngle = angle + Math.PI * 0.5;
            const tilt = 0.12 + Math.random() * 0.15;
            const tiltX = Math.cos(leanAngle) * tilt;
            const tiltZ = Math.sin(leanAngle) * tilt;
            const scale = 0.85 + Math.random() * 0.35;

            _dummy.position.set(px, py + 1.4 * scale, pz);
            _dummy.rotation.set(tiltX, angle, tiltZ);
            _dummy.scale.set(scale, scale, scale);
            _dummy.updateMatrix();
            trunkInstanced.setMatrixAt(i, _dummy.matrix);

            // 6 curved palm fronds forming a lush tropical crown
            for (let j = 0; j < 6; j++) {
                const frondAngle = (j / 6) * Math.PI * 2;
                _dummy.position.set(
                    px + Math.cos(frondAngle) * (0.65 * scale),
                    py + 2.7 * scale,
                    pz + Math.sin(frondAngle) * (0.65 * scale)
                );
                _dummy.rotation.set(
                    Math.sin(frondAngle) * 1.15 + tiltX,
                    frondAngle,
                    -Math.cos(frondAngle) * 1.15 + tiltZ
                );
                _dummy.scale.set(scale, scale, scale);
                _dummy.updateMatrix();
                leavesInstanced.setMatrixAt(frondIdx++, _dummy.matrix);
            }
        }
        trunkInstanced.instanceMatrix.needsUpdate = true;
        leavesInstanced.instanceMatrix.needsUpdate = true;
        this.group.add(trunkInstanced);
        this.group.add(leavesInstanced);

        // -------------------------------------------------------------
        // 2. Village Houses (Variants: Terracotta & Thatch Stilt)
        // -------------------------------------------------------------
        const houseCount = this.type === 'capital' ? 4 : (this.type === 'harbor' ? 3 : 2);
        const wallsInstanced = new THREE.InstancedMesh(GEO_HOUSE_WALL, MAT_HOUSE_WALL_1, houseCount);
        wallsInstanced.castShadow = true;
        const roofInstanced = new THREE.InstancedMesh(GEO_HOUSE_ROOF, MAT_HOUSE_ROOF_TERRA, houseCount);
        roofInstanced.castShadow = true;

        for (let i = 0; i < houseCount; i++) {
            const angle = (i / houseCount) * Math.PI * 2 + 0.85;
            const dist = rand(this.radius * 0.28, this.radius * 0.58);
            const hx = Math.cos(angle) * dist;
            const hz = Math.sin(angle) * dist;
            const hy = 2.0;
            const rotY = angle + Math.PI / 2;

            _dummy.position.set(hx, hy + 0.6, hz);
            _dummy.rotation.set(0, rotY, 0);
            _dummy.scale.set(1, 1, 1);
            _dummy.updateMatrix();
            wallsInstanced.setMatrixAt(i, _dummy.matrix);

            _dummy.position.set(hx, hy + 1.6, hz);
            _dummy.rotation.set(0, rotY + Math.PI / 4, 0);
            _dummy.scale.set(1.05, 1.05, 1.05);
            _dummy.updateMatrix();
            roofInstanced.setMatrixAt(i, _dummy.matrix);
        }
        wallsInstanced.instanceMatrix.needsUpdate = true;
        roofInstanced.instanceMatrix.needsUpdate = true;
        this.group.add(wallsInstanced);
        this.group.add(roofInstanced);

        // -------------------------------------------------------------
        // 3. Coastal Granite Boulders & Mossy Rocks
        // -------------------------------------------------------------
        const rockCount = 5;
        const rockInstanced = new THREE.InstancedMesh(GEO_ROCK, MAT_ROCK, rockCount);
        for (let i = 0; i < rockCount; i++) {
            const angle = rand(0, Math.PI * 2);
            const dist = rand(this.radius * 0.72, this.radius * 1.05);
            const s = 0.65 + Math.random() * 0.6;
            _dummy.position.set(Math.cos(angle) * dist, 0.75, Math.sin(angle) * dist);
            _dummy.rotation.set(Math.random() * 2, Math.random() * 2, Math.random() * 2);
            _dummy.scale.set(s, s * 0.8, s);
            _dummy.updateMatrix();
            rockInstanced.setMatrixAt(i, _dummy.matrix);
        }
        rockInstanced.instanceMatrix.needsUpdate = true;
        this.group.add(rockInstanced);

        // -------------------------------------------------------------
        // 4. Wooden Dock Extension
        // -------------------------------------------------------------
        this.createDock();

        // -------------------------------------------------------------
        // 5. Unique Island Landmarks
        // -------------------------------------------------------------
        if (this.type === 'capital') {
            this.createSacredTempleLandmark();
        } else if (this.type === 'lighthouse') {
            this.createLighthouse();
        }
    }

    createSacredTempleLandmark() {
        // Majestic classical pantheon shrine at center of Capital Island
        const templeGroup = new THREE.Group();
        templeGroup.position.set(0, 2.0, 0);

        // 1. Tiered sandstone dais
        const dais1Geo = new THREE.BoxGeometry(5.2, 0.35, 5.2);
        const dais2Geo = new THREE.BoxGeometry(4.4, 0.35, 4.4);
        const dais1 = new THREE.Mesh(dais1Geo, MAT_TEMPLE_MARBLE);
        const dais2 = new THREE.Mesh(dais2Geo, MAT_TEMPLE_MARBLE);
        dais1.position.y = 0.17;
        dais2.position.y = 0.45;
        dais1.castShadow = true;
        dais2.castShadow = true;
        templeGroup.add(dais1, dais2);

        // 2. Classical fluted columns (4 corner pillars)
        const colGeo = new THREE.CylinderGeometry(0.2, 0.22, 2.4, 8);
        const colCapGeo = new THREE.BoxGeometry(0.55, 0.15, 0.55);
        const colCoords = [
            [-1.6, -1.6], [1.6, -1.6],
            [-1.6, 1.6], [1.6, 1.6]
        ];

        colCoords.forEach(([cx, cz]) => {
            const pillar = new THREE.Mesh(colGeo, MAT_TEMPLE_MARBLE);
            pillar.position.set(cx, 1.75, cz);
            pillar.castShadow = true;
            const cap = new THREE.Mesh(colCapGeo, MAT_TEMPLE_GOLD);
            cap.position.set(cx, 2.95, cz);
            templeGroup.add(pillar, cap);
        });

        // 3. Architrave & Temple Roof
        const roofSlabGeo = new THREE.BoxGeometry(4.2, 0.35, 4.2);
        const roofSlab = new THREE.Mesh(roofSlabGeo, MAT_TEMPLE_MARBLE);
        roofSlab.position.y = 3.15;
        roofSlab.castShadow = true;

        const pedimentGeo = new THREE.ConeGeometry(2.6, 1.1, 4);
        const pediment = new THREE.Mesh(pedimentGeo, MAT_TEMPLE_GOLD);
        pediment.rotation.y = Math.PI / 4;
        pediment.position.y = 3.85;
        pediment.castShadow = true;
        templeGroup.add(roofSlab, pediment);

        // 4. Central Glowing Divine Brazier (Emitting celestial blue glow)
        const brazierGeo = new THREE.CylinderGeometry(0.4, 0.25, 0.7, 6);
        const brazier = new THREE.Mesh(brazierGeo, MAT_TEMPLE_MARBLE);
        brazier.position.y = 0.95;

        const flameGeo = new THREE.OctahedronGeometry(0.3, 0);
        const flame = new THREE.Mesh(flameGeo, MAT_TEMPLE_BRAZIER);
        flame.position.y = 1.45;

        templeGroup.add(brazier, flame);
        this.group.add(templeGroup);
    }

    createDock() {
        const dockGroup = new THREE.Group();
        const angle = 0.28;
        const dockX = Math.cos(angle) * (this.radius * 0.92);
        const dockZ = Math.sin(angle) * (this.radius * 0.92);
        dockGroup.position.set(dockX, 0.45, dockZ);
        dockGroup.rotation.y = -angle;

        const planks = new THREE.Mesh(GEO_DOCK_PLANK, MAT_DOCK_WOOD);
        planks.position.z = 1.6;
        planks.castShadow = true;
        planks.receiveShadow = true;
        dockGroup.add(planks);

        // Mooring bollards
        const post1 = new THREE.Mesh(GEO_DOCK_POST, MAT_DOCK_WOOD);
        post1.position.set(-0.8, 0.3, 3.4);
        const post2 = new THREE.Mesh(GEO_DOCK_POST, MAT_DOCK_WOOD);
        post2.position.set(0.8, 0.3, 3.4);
        dockGroup.add(post1, post2);

        this.group.add(dockGroup);
    }

    createLighthouse() {
        const lightGroup = new THREE.Group();
        lightGroup.position.set(0, 2.0, 0);

        // Stone base
        const baseGeo = new THREE.CylinderGeometry(1.2, 1.5, 1.2, 12);
        const base = new THREE.Mesh(baseGeo, MAT_TEMPLE_MARBLE);
        base.position.y = 0.6;
        base.castShadow = true;
        lightGroup.add(base);

        // Main tapered tower
        const towerGeo = new THREE.CylinderGeometry(0.7, 1.1, 5.8, 12);
        const towerMat = new THREE.MeshLambertMaterial({ color: 0xf8fafc, flatShading: true });
        const tower = new THREE.Mesh(towerGeo, towerMat);
        tower.position.y = 4.1;
        tower.castShadow = true;
        lightGroup.add(tower);

        // Red maritime accent bands
        const bandGeo = new THREE.CylinderGeometry(0.86, 0.95, 0.8, 12);
        const bandMat = new THREE.MeshLambertMaterial({ color: 0xef4444, flatShading: true });
        const band = new THREE.Mesh(bandGeo, bandMat);
        band.position.y = 3.6;
        lightGroup.add(band);

        // Observation gallery deck
        const galleryGeo = new THREE.CylinderGeometry(1.2, 1.2, 0.2, 12);
        const gallery = new THREE.Mesh(galleryGeo, MAT_TEMPLE_MARBLE);
        gallery.position.y = 7.1;
        lightGroup.add(gallery);

        // Glowing lantern beacon
        const lanternGeo = new THREE.CylinderGeometry(0.65, 0.65, 1.0, 8);
        const lanternMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
        const lantern = new THREE.Mesh(lanternGeo, lanternMat);
        lantern.position.y = 7.7;
        lightGroup.add(lantern);

        // Roof cone
        const roofGeo = new THREE.ConeGeometry(0.8, 0.8, 8);
        const roof = new THREE.Mesh(roofGeo, MAT_TEMPLE_GOLD);
        roof.position.y = 8.5;
        lightGroup.add(roof);

        this.group.add(lightGroup);
    }

    buildLabel() {
        const canvas = document.createElement('canvas');
        canvas.width = 320;
        canvas.height = 96;
        const ctx = canvas.getContext('2d');

        // Draw elegant celestial glassmorphism pill
        ctx.fillStyle = 'rgba(8, 15, 32, 0.82)';
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 3.0;
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(8, 8, 304, 80, 20);
        } else {
            ctx.rect(8, 8, 304, 80);
        }
        ctx.fill();
        ctx.stroke();

        // Inner glowing border accent
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(11, 11, 298, 74, 18);
        }
        ctx.stroke();

        // Island Name
        ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0,0,0,0.6)';
        ctx.shadowBlur = 6;
        ctx.fillText(this.name, 160, 42);

        // Population Subtitle Badge
        ctx.font = '600 13px system-ui, sans-serif';
        ctx.fillStyle = '#34d399'; // emerald accent
        ctx.shadowBlur = 0;
        ctx.fillText(`👥 Dân số: ${this.data.population ?? 0}`, 160, 68);

        this.labelTexture = new THREE.CanvasTexture(canvas);
        const spriteMat = new THREE.SpriteMaterial({
            map: this.labelTexture,
            transparent: true,
            depthTest: false,
        });
        this.labelSprite = new THREE.Sprite(spriteMat);
        this.labelSprite.scale.set(5.2, 1.55, 1);
        this.labelSprite.position.set(0, 6.8, 0);
        this.group.add(this.labelSprite);

        this.disposables.push(this.labelTexture, spriteMat);
    }

    updateLabel(newName = null, newPopulation = null) {
        if (newName !== null) this.name = newName;
        if (newPopulation !== null) this.data.population = newPopulation;

        const canvas = document.createElement('canvas');
        canvas.width = 320;
        canvas.height = 96;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = 'rgba(8, 15, 32, 0.82)';
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 3.0;
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(8, 8, 304, 80, 20);
        } else {
            ctx.rect(8, 8, 304, 80);
        }
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(11, 11, 298, 74, 18);
        }
        ctx.stroke();

        ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0,0,0,0.6)';
        ctx.shadowBlur = 6;
        ctx.fillText(this.name, 160, 42);

        ctx.font = '600 13px system-ui, sans-serif';
        ctx.fillStyle = '#34d399';
        ctx.shadowBlur = 0;
        ctx.fillText(`👥 Dân số: ${this.data.population ?? 0}`, 160, 68);

        if (this.labelTexture) {
            this.labelTexture.image = canvas;
            this.labelTexture.needsUpdate = true;
        }
    }

    buildHighlightRing() {
        const ringGeo = new THREE.RingGeometry(this.radius * 0.95, this.radius * 1.08, 36);
        const ringMat = new THREE.MeshBasicMaterial({
            color: 0x38bdf8,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0,
        });
        this.highlightRing = new THREE.Mesh(ringGeo, ringMat);
        this.highlightRing.rotation.x = Math.PI / 2;
        this.highlightRing.position.y = 0.16;
        this.group.add(this.highlightRing);

        this.disposables.push(ringGeo, ringMat);
    }

    setSelected(selected) {
        if (this.highlightRing) {
            this.highlightRing.material.opacity = selected ? 0.85 : 0;
        }
    }

    isInside(worldX, worldZ) {
        const dx = worldX - this.worldX;
        const dz = worldZ - this.worldZ;
        // Accommodate natural organic coastline boundary
        return (dx * dx + dz * dz) <= (this.radius * this.radius * 1.15);
    }

    dispose() {
        this.disposables.forEach((item) => {
            if (item && typeof item.dispose === 'function') {
                item.dispose();
            }
        });
        this.disposables = [];
        this.scene.remove(this.group);
    }
}
