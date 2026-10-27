import * as THREE from 'three';

/**
 * DeployLab Infrastructure 3D Request Flow Visualization
 * Visualizes: Browser -> DNS -> Apache -> PHP-FPM -> Laravel App -> Data (MySQL/Redis)
 */
export function initHeroScene(container) {
    if (!container) return null;

    // Check WebGL availability gracefully
    try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (!gl) {
            console.warn('[DeployLab] WebGL not supported, falling back to CSS visualization.');
            container.classList.add('webgl-unavailable');
            return null;
        }
    } catch {
        container.classList.add('webgl-unavailable');
        return null;
    }

    // Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x060913, 0.04);

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || 560;

    const camera = new THREE.PerspectiveCamera(46, width / height, 0.1, 100);

    const renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);

    const domElement = renderer.domElement;
    domElement.setAttribute('aria-hidden', 'true');
    domElement.style.width = '100%';
    domElement.style.height = '100%';
    domElement.style.display = 'block';
    container.appendChild(domElement);

    // Color Palette
    const colors = {
        cyan: 0x06b6d4,
        blue: 0x3b82f6,
        indigo: 0x6366f1,
        purple: 0xa855f7,
        emerald: 0x10b981,
        amber: 0xf59e0b,
        white: 0xffffff,
    };

    // Infrastructure Node Definitions
    const layerNodes = [
        {
            id: 'browser',
            name: '01 CLIENT',
            sub: 'Browser / TLS',
            pos: new THREE.Vector3(-5.4, 1.6, 1.8),
            color: colors.cyan,
            glowCol: 'rgba(34, 211, 238, 0.85)',
            hexStr: '#22d3ee',
        },
        {
            id: 'dns',
            name: '02 DNS / NET',
            sub: 'Resolver / 443',
            pos: new THREE.Vector3(-3.2, 0.3, 0.7),
            color: colors.blue,
            glowCol: 'rgba(59, 130, 246, 0.85)',
            hexStr: '#60a5fa',
        },
        {
            id: 'apache',
            name: '03 APACHE',
            sub: 'Reverse Proxy',
            pos: new THREE.Vector3(-1.0, -0.6, -0.3),
            color: colors.indigo,
            glowCol: 'rgba(99, 102, 241, 0.85)',
            hexStr: '#818cf8',
        },
        {
            id: 'php',
            name: '04 PHP-FPM',
            sub: 'Runtime 8.4',
            pos: new THREE.Vector3(1.2, 0.2, -1.0),
            color: colors.purple,
            glowCol: 'rgba(168, 85, 247, 0.85)',
            hexStr: '#c084fc',
        },
        {
            id: 'app',
            name: '05 LARAVEL',
            sub: 'Application',
            pos: new THREE.Vector3(3.4, 1.3, -1.7),
            color: colors.emerald,
            glowCol: 'rgba(16, 185, 129, 0.85)',
            hexStr: '#34d399',
        },
        {
            id: 'data',
            name: '06 DATA TIER',
            sub: 'MySQL & Redis',
            pos: new THREE.Vector3(5.6, -0.2, -2.4),
            color: colors.amber,
            glowCol: 'rgba(245, 158, 11, 0.85)',
            hexStr: '#fbbf24',
        },
    ];

    // Helper: Create soft radial glow canvas texture
    function createGlowTexture(colorHexStr) {
        const c = document.createElement('canvas');
        c.width = 128;
        c.height = 128;
        const ctx = c.getContext('2d');
        const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
        grad.addColorStop(0, colorHexStr);
        grad.addColorStop(0.35, colorHexStr);
        grad.addColorStop(0.7, 'rgba(6, 182, 212, 0.18)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 128, 128);
        return new THREE.CanvasTexture(c);
    }

    // Helper: Create floating text billboard sprite
    function createTextSprite(text, subtext, colorHexStr) {
        const c = document.createElement('canvas');
        c.width = 280;
        c.height = 110;
        const ctx = c.getContext('2d');

        // Dark rounded pill backing with glowing border
        ctx.fillStyle = 'rgba(7, 12, 24, 0.92)';
        ctx.strokeStyle = colorHexStr;
        ctx.lineWidth = 3;
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(8, 8, 264, 94, 14);
        } else {
            ctx.rect(8, 8, 264, 94);
        }
        ctx.fill();
        ctx.stroke();

        // Main text
        ctx.font = 'bold 24px system-ui, -apple-system, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText(text, 140, 46);

        // Subtext
        ctx.font = 'bold 15px monospace, system-ui, sans-serif';
        ctx.fillStyle = colorHexStr;
        ctx.fillText(subtext, 140, 78);

        const tex = new THREE.CanvasTexture(c);
        const mat = new THREE.SpriteMaterial({
            map: tex,
            transparent: true,
            depthTest: false,
        });
        const sprite = new THREE.Sprite(mat);
        sprite.scale.set(3.0, 1.18, 1);
        return sprite;
    }

    // Node objects and interactive meshes
    const nodeMeshes = [];
    const mainGroup = new THREE.Group();
    scene.add(mainGroup);

    layerNodes.forEach((node, i) => {
        const nodeGroup = new THREE.Group();
        nodeGroup.position.copy(node.pos);

        // Core central geometric poly (increased size from 0.38 to 0.50)
        const coreGeo = new THREE.OctahedronGeometry(0.50, 0);
        const coreMat = new THREE.MeshStandardMaterial({
            color: node.color,
            emissive: node.color,
            emissiveIntensity: 0.9,
            metalness: 0.4,
            roughness: 0.15,
        });
        const coreMesh = new THREE.Mesh(coreGeo, coreMat);
        coreMesh.userData = { nodeId: node.id, index: i, name: node.name };
        nodeGroup.add(coreMesh);

        // Wireframe outer cage
        const wireGeo = new THREE.IcosahedronGeometry(0.74, 1);
        const wireMat = new THREE.MeshBasicMaterial({
            color: node.color,
            wireframe: true,
            transparent: true,
            opacity: 0.55,
        });
        const wireMesh = new THREE.Mesh(wireGeo, wireMat);
        nodeGroup.add(wireMesh);

        // Inner rotating orbit ring
        const ringGeo1 = new THREE.TorusGeometry(0.96, 0.025, 8, 36);
        const ringMat1 = new THREE.MeshBasicMaterial({
            color: node.color,
            transparent: true,
            opacity: 0.75,
        });
        const ring1 = new THREE.Mesh(ringGeo1, ringMat1);
        ring1.rotation.x = Math.PI / 3;
        ring1.rotation.y = Math.PI / 4;
        nodeGroup.add(ring1);

        // Outer slower orbit ring
        const ringGeo2 = new THREE.TorusGeometry(1.18, 0.02, 8, 36);
        const ringMat2 = new THREE.MeshBasicMaterial({
            color: 0x38bdf8,
            transparent: true,
            opacity: 0.4,
        });
        const ring2 = new THREE.Mesh(ringGeo2, ringMat2);
        ring2.rotation.x = -Math.PI / 4;
        ring2.rotation.z = Math.PI / 6;
        nodeGroup.add(ring2);

        // Soft Radial Aura Billboard
        const glowTex = createGlowTexture(node.glowCol);
        const auraMat = new THREE.SpriteMaterial({
            map: glowTex,
            blending: THREE.AdditiveBlending,
            transparent: true,
            opacity: 0.9,
            depthWrite: false,
        });
        const auraSprite = new THREE.Sprite(auraMat);
        auraSprite.scale.set(3.8, 3.8, 1);
        nodeGroup.add(auraSprite);

        // Floating 3D Text Label
        const labelSprite = createTextSprite(node.name, node.sub, node.hexStr);
        labelSprite.position.set(0, 1.45, 0);
        nodeGroup.add(labelSprite);

        // Vertical grounding light pillar / anchor
        const stemHeight = 2.6;
        const stemGeo = new THREE.CylinderGeometry(0.018, 0.018, stemHeight, 6);
        const stemMat = new THREE.MeshBasicMaterial({
            color: node.color,
            transparent: true,
            opacity: 0.25,
        });
        const stemMesh = new THREE.Mesh(stemGeo, stemMat);
        stemMesh.position.set(0, -stemHeight / 2 - 0.5, 0);
        nodeGroup.add(stemMesh);

        // Ground anchor pulse ring
        const groundRingGeo = new THREE.RingGeometry(0.24, 0.42, 24);
        const groundRingMat = new THREE.MeshBasicMaterial({
            color: node.color,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.35,
        });
        const groundRing = new THREE.Mesh(groundRingGeo, groundRingMat);
        groundRing.rotation.x = Math.PI / 2;
        groundRing.position.set(0, -stemHeight - 0.5, 0);
        nodeGroup.add(groundRing);

        // Local PointLight for dynamic node glow
        const nodeLight = new THREE.PointLight(node.color, 1.8, 6);
        nodeGroup.add(nodeLight);

        mainGroup.add(nodeGroup);

        nodeMeshes.push({
            group: nodeGroup,
            core: coreMesh,
            wire: wireMesh,
            ring1: ring1,
            ring2: ring2,
            aura: auraSprite,
            light: nodeLight,
            groundRing: groundRing,
            basePos: node.pos.clone(),
            config: node,
        });
    });

    // Connecting 3D Pipeline Spline
    const pathPoints = layerNodes.map((n) => n.pos);
    const curve = new THREE.CatmullRomCurve3(pathPoints, false, 'catmullrom', 0.25);

    // Render smooth glowing pipeline tube
    const tubeGeo = new THREE.TubeGeometry(curve, 160, 0.045, 8, false);
    const tubeMat = new THREE.MeshStandardMaterial({
        color: 0x0ea5e9,
        emissive: 0x0284c7,
        emissiveIntensity: 0.85,
        transparent: true,
        opacity: 0.85,
        roughness: 0.2,
    });
    const tubeMesh = new THREE.Mesh(tubeGeo, tubeMat);
    mainGroup.add(tubeMesh);

    // Glowing outer halo tube
    const tubeGlowGeo = new THREE.TubeGeometry(curve, 160, 0.11, 6, false);
    const tubeGlowMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        wireframe: true,
        transparent: true,
        opacity: 0.25,
    });
    const tubeGlowMesh = new THREE.Mesh(tubeGlowGeo, tubeGlowMat);
    mainGroup.add(tubeGlowMesh);

    // Request Packets Traveling along the spline
    const packetGlowTex = createGlowTexture('rgba(56, 189, 248, 0.9)');
    const packetCount = 6;
    const packetMeshes = [];
    for (let p = 0; p < packetCount; p++) {
        const pGroup = new THREE.Group();

        // Bright packet sphere
        const pGeo = new THREE.SphereGeometry(0.14, 12, 12);
        const pMat = new THREE.MeshBasicMaterial({
            color: 0xffffff,
        });
        const pMesh = new THREE.Mesh(pGeo, pMat);
        pGroup.add(pMesh);

        // Radiant packet halo
        const pHaloMat = new THREE.SpriteMaterial({
            map: packetGlowTex,
            blending: THREE.AdditiveBlending,
            transparent: true,
            opacity: 0.95,
        });
        const pHalo = new THREE.Sprite(pHaloMat);
        pHalo.scale.set(1.6, 1.6, 1);
        pGroup.add(pHalo);

        // Small pointlight on lead packet
        if (p === 0 || p === 3) {
            const pLight = new THREE.PointLight(0x38bdf8, 3.0, 5);
            pGroup.add(pLight);
        }

        mainGroup.add(pGroup);
        packetMeshes.push({
            group: pGroup,
            offset: p / packetCount,
            speed: 0.085,
        });
    }

    // Stream of micro particles along conduit
    const streamCount = 90;
    const streamGeo = new THREE.BufferGeometry();
    const streamPositions = new Float32Array(streamCount * 3);
    const streamProgress = new Float32Array(streamCount);

    for (let i = 0; i < streamCount; i++) {
        streamProgress[i] = Math.random();
        const pt = curve.getPoint(streamProgress[i]);
        streamPositions[i * 3] = pt.x + (Math.random() - 0.5) * 0.12;
        streamPositions[i * 3 + 1] = pt.y + (Math.random() - 0.5) * 0.12;
        streamPositions[i * 3 + 2] = pt.z + (Math.random() - 0.5) * 0.12;
    }
    streamGeo.setAttribute('position', new THREE.BufferAttribute(streamPositions, 3));

    const streamMat = new THREE.PointsMaterial({
        color: 0x38bdf8,
        size: 0.09,
        transparent: true,
        opacity: 0.75,
        blending: THREE.AdditiveBlending,
    });
    const streamPoints = new THREE.Points(streamGeo, streamMat);
    mainGroup.add(streamPoints);

    // Ambient floating atmospheric particles
    const ambientCount = 200;
    const ambientGeo = new THREE.BufferGeometry();
    const ambientPos = new Float32Array(ambientCount * 3);
    for (let i = 0; i < ambientCount; i++) {
        ambientPos[i * 3] = (Math.random() - 0.5) * 26;
        ambientPos[i * 3 + 1] = (Math.random() - 0.5) * 15;
        ambientPos[i * 3 + 2] = (Math.random() - 0.5) * 16 - 2;
    }
    ambientGeo.setAttribute('position', new THREE.BufferAttribute(ambientPos, 3));

    const ambientMat = new THREE.PointsMaterial({
        color: 0x64748b,
        size: 0.05,
        transparent: true,
        opacity: 0.45,
    });
    const ambientPoints = new THREE.Points(ambientGeo, ambientMat);
    scene.add(ambientPoints);

    // 3D Architectural Reference Grid Plane at base
    const gridHelper = new THREE.GridHelper(32, 32, 0x1e293b, 0x0f172a);
    gridHelper.position.set(0, -3.2, 0);
    scene.add(gridHelper);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x0f172a, 2.0);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0x38bdf8, 2.0);
    dirLight1.position.set(8, 12, 10);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x10b981, 1.2);
    dirLight2.position.set(-10, -6, 5);
    scene.add(dirLight2);

    // Mouse Parallax & Interaction Tracking
    const mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
    let prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleMotionPreference = (e) => {
        prefersReducedMotion = e.matches;
    };
    mediaQuery.addEventListener('change', handleMotionPreference);

    function onPointerMove(e) {
        if (prefersReducedMotion) return;
        const rect = container.getBoundingClientRect();
        const clientX = e.clientX - rect.left;
        const clientY = e.clientY - rect.top;
        mouse.targetX = (clientX / rect.width) * 2 - 1;
        mouse.targetY = -(clientY / rect.height) * 2 + 1;
    }

    container.addEventListener('pointermove', onPointerMove, { passive: true });

    // Responsive camera position adjust
    function adjustCameraForViewport() {
        const w = container.clientWidth || window.innerWidth;
        const h = container.clientHeight || 560;
        camera.aspect = w / h;

        if (w >= 1280) {
            // Desktop: nodes positioned slightly right, brought closer for cinematic impact
            mainGroup.scale.set(1.0, 1.0, 1.0);
            mainGroup.position.set(1.1, 0.1, 0);
            camera.position.set(0.8, 1.4, 12.0);
        } else if (w >= 768) {
            // Tablet: centered, slightly closer
            mainGroup.scale.set(0.88, 0.88, 0.88);
            mainGroup.position.set(0.1, -0.1, 0);
            camera.position.set(0, 1.3, 13.5);
        } else {
            // Mobile: scale and frame so all 6 nodes fit completely within narrow 375px width
            mainGroup.scale.set(0.66, 0.66, 0.66);
            mainGroup.position.set(0, -0.2, 0);
            camera.position.set(0, 1.1, 16.5);
        }
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
    }

    adjustCameraForViewport();

    // ResizeObserver
    const resizeObserver = new ResizeObserver(() => {
        adjustCameraForViewport();
    });
    resizeObserver.observe(container);

    // Animation Loop
    let animationFrameId = null;
    let clock = new THREE.Clock();
    let isDisposed = false;

    function animate() {
        if (isDisposed) return;
        animationFrameId = requestAnimationFrame(animate);

        const delta = Math.min(clock.getDelta(), 0.1);
        const elapsedTime = clock.getElapsedTime();

        // Parallax smooth interpolation
        if (!prefersReducedMotion) {
            mouse.x += (mouse.targetX - mouse.x) * 0.04;
            mouse.y += (mouse.targetY - mouse.y) * 0.04;
            mainGroup.rotation.y = mouse.x * 0.14 + Math.sin(elapsedTime * 0.18) * 0.035;
            mainGroup.rotation.x = -mouse.y * 0.08 + Math.cos(elapsedTime * 0.22) * 0.025;
        } else {
            mainGroup.rotation.set(0, 0, 0);
        }

        // Animate individual nodes
        const motionFactor = prefersReducedMotion ? 0.15 : 1.0;
        nodeMeshes.forEach((item, idx) => {
            item.core.rotation.y += 0.85 * delta * motionFactor;
            item.core.rotation.x += 0.55 * delta * motionFactor;
            item.wire.rotation.y -= 0.45 * delta * motionFactor;
            item.wire.rotation.z += 0.35 * delta * motionFactor;

            item.ring1.rotation.z += 1.3 * delta * motionFactor;
            item.ring2.rotation.z -= 0.75 * delta * motionFactor;

            const floatOffset = Math.sin(elapsedTime * 1.5 + idx * 0.9) * 0.09 * motionFactor;
            item.group.position.y = item.basePos.y + floatOffset;

            const auraScale = 3.8 + Math.sin(elapsedTime * 2.2 + idx) * 0.3 * motionFactor;
            item.aura.scale.set(auraScale, auraScale, 1);
        });

        // Animate Request Packets along spline
        packetMeshes.forEach((packet) => {
            if (!prefersReducedMotion) {
                packet.offset = (packet.offset + packet.speed * delta) % 1;
            }
            const pt = curve.getPoint(packet.offset);
            packet.group.position.copy(pt);
        });

        // Animate stream points
        const positions = streamPoints.geometry.attributes.position.array;
        for (let i = 0; i < streamCount; i++) {
            if (!prefersReducedMotion) {
                streamProgress[i] = (streamProgress[i] + 0.14 * delta) % 1;
            }
            const pt = curve.getPoint(streamProgress[i]);
            positions[i * 3] = pt.x;
            positions[i * 3 + 1] = pt.y;
            positions[i * 3 + 2] = pt.z;
        }
        streamPoints.geometry.attributes.position.needsUpdate = true;

        // Slow ambient particle drift
        if (!prefersReducedMotion) {
            ambientPoints.rotation.y = elapsedTime * 0.015;
            ambientPoints.rotation.x = Math.sin(elapsedTime * 0.02) * 0.02;
        }

        renderer.render(scene, camera);
    }

    animate();

    // Teardown / cleanup function
    return {
        destroy() {
            isDisposed = true;
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
            resizeObserver.disconnect();
            mediaQuery.removeEventListener('change', handleMotionPreference);
            container.removeEventListener('pointermove', onPointerMove);

            scene.traverse((obj) => {
                if (obj.geometry) obj.geometry.dispose();
                if (obj.material) {
                    if (Array.isArray(obj.material)) {
                        obj.material.forEach((m) => m.dispose());
                    } else {
                        obj.material.dispose();
                    }
                }
            });

            renderer.dispose();
            if (domElement && domElement.parentNode === container) {
                container.removeChild(domElement);
            }
        },
    };
}
