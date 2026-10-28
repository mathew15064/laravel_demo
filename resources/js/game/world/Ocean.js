import * as THREE from 'three';

/**
 * Paradise Gods - Tropical Ocean
 * Low-poly stylized turquoise ocean with subtle vertex oscillation.
 */
export class Ocean {
    constructor(scene, size = 300) {
        this.scene = scene;
        this.size = size;

        // Plane geometry with segments for low-poly water waves
        this.geometry = new THREE.PlaneGeometry(size, size, 48, 48);
        this.geometry.rotateX(-Math.PI / 2);

        // Store original vertex coordinates
        const pos = this.geometry.attributes.position;
        this.originalY = new Float32Array(pos.count);
        for (let i = 0; i < pos.count; i++) {
            this.originalY[i] = pos.getY(i);
        }

        // Low-poly water material
        this.material = new THREE.MeshStandardMaterial({
            color: 0x0ea5e9, // vibrant turquoise / azure
            roughness: 0.2,
            metalness: 0.1,
            flatShading: true,
            transparent: true,
            opacity: 0.88,
        });

        this.mesh = new THREE.Mesh(this.geometry, this.material);
        this.mesh.position.y = 0;
        this.mesh.receiveShadow = true;
        this.mesh.name = 'ocean';
        this.scene.add(this.mesh);

        this.lastWaveUpdate = 0;

        // Deep ocean sea bed under the water
        const bedGeo = new THREE.PlaneGeometry(size, size, 1, 1);
        bedGeo.rotateX(-Math.PI / 2);
        const bedMat = new THREE.MeshBasicMaterial({ color: 0x034769 });
        const bedMesh = new THREE.Mesh(bedGeo, bedMat);
        bedMesh.position.y = -3.5;
        this.scene.add(bedMesh);
    }

    update(elapsedTime) {
        // Throttle wave vertex updates to ~30 FPS for high CPU efficiency
        const now = performance.now();
        if (now - this.lastWaveUpdate < 32) return;
        this.lastWaveUpdate = now;

        const pos = this.geometry.attributes.position;
        const array = pos.array;
        const count = pos.count;

        for (let i = 0; i < count; i++) {
            const idx = i * 3;
            const u = array[idx];
            const w = array[idx + 2];
            const wave = Math.sin(u * 0.08 + elapsedTime * 1.5) * 0.18 +
                         Math.cos(w * 0.08 + elapsedTime * 1.2) * 0.15;
            array[idx + 1] = this.originalY[i] + wave;
        }
        pos.needsUpdate = true;
        // computeVertexNormals omitted because flatShading uses GPU screen-space derivatives
    }

    dispose() {
        this.geometry.dispose();
        this.material.dispose();
        this.scene.remove(this.mesh);
    }
}
