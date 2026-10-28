import * as THREE from 'three';

/**
 * Paradise Gods - Tropical Ocean
 * High-performance GPU-displaced shader ocean with vibrant tropical Maldives/Bora-Bora palette:
 * luminous shallow turquoise lagoons, vibrant azure mid-waters, gentle wave crest foam, and sun specular glint.
 * Completely eliminates CPU vertex manipulation (0 CPU cycles per frame).
 */
export class Ocean {
    constructor(scene, size = 1200) {
        this.scene = scene;
        this.size = size;

        // Plane geometry with optimized vertex density for crisp low-poly / stylized waves
        this.geometry = new THREE.PlaneGeometry(size, size, 80, 80);
        this.geometry.rotateX(-Math.PI / 2);

        // Maximum 16 islands tracked for shallow coastal lagoon effects
        const maxIslands = 16;
        const islandPositions = [];
        const islandRadii = new Float32Array(maxIslands);
        for (let i = 0; i < maxIslands; i++) {
            islandPositions.push(new THREE.Vector2(9999, 9999));
            islandRadii[i] = 10;
        }

        this.uniforms = {
            uTime: { value: 0 },
            uDeepColor: { value: new THREE.Color(0x0284c7) },      // Radiant tropical blue
            uMidColor: { value: new THREE.Color(0x0ea5e9) },       // Vibrant azure sea
            uShallowColor: { value: new THREE.Color(0x2dd4bf) },   // Luminous turquoise lagoon
            uFoamColor: { value: new THREE.Color(0xffffff) },      // Sparkling white foam
            uSunPosition: { value: new THREE.Vector3(65, 85, 55) },
            uCameraPos: { value: new THREE.Vector3(0, 52, 78) },
            uIslands: { value: islandPositions },
            uIslandRadii: { value: islandRadii },
            uIslandCount: { value: 0 },
        };

        const vertexShader = `
            uniform float uTime;
            varying vec3 vWorldPosition;
            varying float vWaveHeight;
            varying vec3 vNormal;
            varying vec2 vUv;

            void main() {
                vUv = uv;
                vec3 pos = position;

                // Multi-octave harmonic GPU waves
                float w1 = sin(pos.x * 0.065 + uTime * 1.25) * cos(pos.z * 0.05 + uTime * 0.95) * 0.22;
                float w2 = sin((pos.x + pos.z) * 0.11 + uTime * 1.6) * 0.09;
                float w3 = cos(pos.x * 0.14 - uTime * 0.75) * sin(pos.z * 0.13 + uTime * 0.85) * 0.05;
                float totalWave = w1 + w2 + w3;

                pos.y += totalWave;
                vWaveHeight = totalWave;

                // Analytical wave normal
                float dWx = (0.065 * cos(pos.x * 0.065 + uTime * 1.25) * cos(pos.z * 0.05 + uTime * 0.95) * 0.22 +
                             0.11 * cos((pos.x + pos.z) * 0.11 + uTime * 1.6) * 0.09);
                float dWz = (-0.05 * sin(pos.x * 0.065 + uTime * 1.25) * sin(pos.z * 0.05 + uTime * 0.95) * 0.22 +
                             0.11 * cos((pos.x + pos.z) * 0.11 + uTime * 1.6) * 0.09);
                vNormal = normalize(vec3(-dWx, 1.0, -dWz));

                vec4 worldPos = modelMatrix * vec4(pos, 1.0);
                vWorldPosition = worldPos.xyz;
                gl_Position = projectionMatrix * viewMatrix * worldPos;
            }
        `;

        const fragmentShader = `
            uniform float uTime;
            uniform vec3 uDeepColor;
            uniform vec3 uMidColor;
            uniform vec3 uShallowColor;
            uniform vec3 uFoamColor;
            uniform vec3 uSunPosition;
            uniform vec3 uCameraPos;
            uniform vec2 uIslands[16];
            uniform float uIslandRadii[16];
            uniform int uIslandCount;

            varying vec3 vWorldPosition;
            varying float vWaveHeight;
            varying vec3 vNormal;
            varying vec2 vUv;

            void main() {
                // 1. Distance to nearest island coast
                float minShoreDist = 999.0;
                for (int i = 0; i < 16; i++) {
                    if (i >= uIslandCount) break;
                    float d = distance(vWorldPosition.xz, uIslands[i]) - uIslandRadii[i];
                    minShoreDist = min(minShoreDist, d);
                }

                // Smooth lagoon transition: bright turquoise near shore
                float shoreFactor = 1.0 - smoothstep(0.0, 6.0, minShoreDist);

                // 2. Base vibrant tropical color gradient
                vec3 waterColor = mix(uDeepColor, uMidColor, smoothstep(-0.25, 0.25, vWaveHeight));
                waterColor = mix(waterColor, uShallowColor, shoreFactor * 0.65);

                // 3. Gentle wave crest foam (no artificial hard shore rings)
                float crestFoam = smoothstep(0.18, 0.32, vWaveHeight) * 0.55;
                waterColor = mix(waterColor, uFoamColor, crestFoam);

                // 4. Sun specular glint
                vec3 lightDir = normalize(uSunPosition - vWorldPosition);
                vec3 viewDir = normalize(uCameraPos - vWorldPosition);
                vec3 halfDir = normalize(lightDir + viewDir);
                float spec = pow(max(dot(vNormal, halfDir), 0.0), 32.0) * 0.6;
                waterColor += vec3(1.0, 0.98, 0.9) * spec;

                // 5. Fresnel view angle calculation
                float fresnel = pow(1.0 - max(dot(viewDir, vNormal), 0.0), 3.0);
                float alpha = clamp(0.88 + fresnel * 0.10, 0.0, 0.98);

                gl_FragColor = vec4(waterColor, alpha);
            }
        `;

        this.material = new THREE.ShaderMaterial({
            vertexShader,
            fragmentShader,
            uniforms: this.uniforms,
            transparent: true,
            side: THREE.DoubleSide,
            depthWrite: false,
        });

        this.mesh = new THREE.Mesh(this.geometry, this.material);
        this.mesh.position.y = 0;
        this.mesh.name = 'ocean';
        this.scene.add(this.mesh);

        // Deep ocean sea bed under the water
        this.bedGeo = new THREE.PlaneGeometry(size, size, 1, 1);
        this.bedGeo.rotateX(-Math.PI / 2);
        this.bedMat = new THREE.MeshBasicMaterial({ color: 0x0369a1 });
        this.bedMesh = new THREE.Mesh(this.bedGeo, this.bedMat);
        this.bedMesh.position.y = -4.0;
        this.scene.add(this.bedMesh);
    }

    setIslandPositions(islands) {
        if (!islands || !Array.isArray(islands)) return;
        const count = Math.min(islands.length, 16);
        this.uniforms.uIslandCount.value = count;
        for (let i = 0; i < count; i++) {
            const isl = islands[i];
            this.uniforms.uIslands.value[i].set(isl.worldX, isl.worldZ);
            this.uniforms.uIslandRadii.value[i] = isl.radius;
        }
    }

    setCameraPosition(camPos) {
        if (camPos) {
            this.uniforms.uCameraPos.value.copy(camPos);
        }
    }

    update(elapsedTime) {
        this.uniforms.uTime.value = elapsedTime;
    }

    dispose() {
        if (this.geometry) this.geometry.dispose();
        if (this.material) this.material.dispose();
        if (this.bedGeo) this.bedGeo.dispose();
        if (this.bedMat) this.bedMat.dispose();

        if (this.mesh) this.scene.remove(this.mesh);
        if (this.bedMesh) this.scene.remove(this.bedMesh);
    }
}
