import * as THREE from 'three';

/**
 * Paradise Gods - Stylized Citizen Entity
 * Human-like low-poly model with persistent skin tone, clothing, walking AI, and drowning animations.
 */
export class Citizen {
    constructor(scene, data) {
        this.scene = scene;
        this.data = data;
        this.id = data.id;
        this.name = data.name;
        this.status = data.status || 'alive'; // 'alive', 'drowning', 'dead'
        this.skinTone = data.skin_tone || '#E8C2A4';
        this.clothingColor = data.clothing_color || '#3b82f6';
        this.islandId = data.island_id;
        this.islandName = data.island_name;
        this.creatorName = data.creator_name || 'Thần';
        this.heldByGodId = data.held_by_god_id || null;
        this.heldByName = data.held_by_god_name || null;
        this.heldByColor = data.held_by_god_color || '#8b5cf6';

        this.group = new THREE.Group();
        const initialX = data.position?.x ?? 0;
        const initialZ = data.position?.z ?? 0;
        this.group.position.set(initialX, 2.0, initialZ);
        this.targetPosition = new THREE.Vector3().copy(this.group.position);
        this.group.userData = { isCitizen: true, citizenId: this.id, citizenInstance: this };

        // Animation state
        this.state = this.status === 'drowning' ? 'drowning' : (this.status === 'held' ? 'held' : 'idle');
        this.walkTarget = null;
        this.walkSpeed = 1.6;
        this.walkTimer = Math.random() * 3.0;
        this.currentIsland = null;

        // Throw physics
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.isThrown = false;
        this.isDragged = false;

        // Drowning countdown timer
        this.drowningTimeLeft = 3000;
        this.drowningTimerId = null;

        this.buildMesh();
        this.buildLabel();
        this.buildAura();
        this.scene.add(this.group);
    }

    buildAura() {
        const auraGeo = new THREE.RingGeometry(0.8, 1.2, 24);
        const auraMat = new THREE.MeshBasicMaterial({
            color: 0x8b5cf6,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0,
        });
        this.auraMesh = new THREE.Mesh(auraGeo, auraMat);
        this.auraMesh.rotation.x = -Math.PI / 2;
        this.auraMesh.position.y = 0.1;
        this.group.add(this.auraMesh);
    }

    setHoldingGod(godId, godName = null, godColor = '#8b5cf6') {
        this.heldByGodId = godId;
        this.heldByName = godName;
        this.heldByColor = godColor;
        this.status = 'held';
        if (this.auraMesh) {
            const colorInt = parseInt(godColor.replace('#', '0x'), 16) || 0x8b5cf6;
            this.auraMesh.material.color.setHex(colorInt);
            this.auraMesh.material.opacity = 0.6;
        }
    }

    clearHoldingGod() {
        this.heldByGodId = null;
        this.heldByName = null;
        if (this.auraMesh) {
            this.auraMesh.material.opacity = 0;
        }
    }

    setTargetPosition(pos) {
        if (pos) {
            this.targetPosition.set(pos.x, pos.y ?? this.group.position.y, pos.z);
        }
    }

    buildMesh() {
        const skinColorHex = parseInt(this.skinTone.replace('#', '0x'), 16);
        const clothColorHex = parseInt(this.clothingColor.replace('#', '0x'), 16);

        const skinMat = new THREE.MeshStandardMaterial({ color: skinColorHex, roughness: 0.8, flatShading: true });
        const clothMat = new THREE.MeshStandardMaterial({ color: clothColorHex, roughness: 0.7, flatShading: true });
        const hairMat = new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.9, flatShading: true });
        const pantsMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8, flatShading: true });

        // Root container for body parts to facilitate limb animations
        this.bodyContainer = new THREE.Group();
        this.group.add(this.bodyContainer);

        // 1. Torso / Shirt
        const torsoGeo = new THREE.BoxGeometry(0.5, 0.65, 0.32);
        this.torso = new THREE.Mesh(torsoGeo, clothMat);
        this.torso.position.y = 0.8;
        this.torso.castShadow = true;
        this.bodyContainer.add(this.torso);

        // 2. Head
        const headGeo = new THREE.BoxGeometry(0.38, 0.4, 0.36);
        this.head = new THREE.Mesh(headGeo, skinMat);
        this.head.position.y = 1.35;
        this.head.castShadow = true;
        this.bodyContainer.add(this.head);

        // Hair / Cap
        const hairGeo = new THREE.BoxGeometry(0.4, 0.16, 0.38);
        const hair = new THREE.Mesh(hairGeo, hairMat);
        hair.position.y = 1.55;
        this.bodyContainer.add(hair);

        // 3. Left Arm
        const armGeo = new THREE.BoxGeometry(0.14, 0.5, 0.14);
        armGeo.translate(0, -0.22, 0); // pivot at shoulder
        this.leftArm = new THREE.Mesh(armGeo, skinMat);
        this.leftArm.position.set(-0.32, 1.05, 0);
        this.leftArm.castShadow = true;
        this.bodyContainer.add(this.leftArm);

        // 4. Right Arm
        this.rightArm = new THREE.Mesh(armGeo, skinMat);
        this.rightArm.position.set(0.32, 1.05, 0);
        this.rightArm.castShadow = true;
        this.bodyContainer.add(this.rightArm);

        // 5. Left Leg
        const legGeo = new THREE.BoxGeometry(0.18, 0.55, 0.18);
        legGeo.translate(0, -0.25, 0); // pivot at hip
        this.leftLeg = new THREE.Mesh(legGeo, pantsMat);
        this.leftLeg.position.set(-0.14, 0.5, 0);
        this.leftLeg.castShadow = true;
        this.bodyContainer.add(this.leftLeg);

        // 6. Right Leg
        this.rightLeg = new THREE.Mesh(legGeo, pantsMat);
        this.rightLeg.position.set(0.14, 0.5, 0);
        this.rightLeg.castShadow = true;
        this.bodyContainer.add(this.rightLeg);
    }

    buildLabel() {
        const canvas = document.createElement('canvas');
        canvas.width = 160;
        canvas.height = 50;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(4, 4, 152, 42, 8);
        } else {
            ctx.rect(4, 4, 152, 42);
        }
        ctx.fill();
        ctx.stroke();

        ctx.font = 'bold 18px system-ui, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText(this.name, 80, 28);

        this.labelTex = new THREE.CanvasTexture(canvas);
        const spriteMat = new THREE.SpriteMaterial({ map: this.labelTex, transparent: true, depthTest: false });
        this.labelSprite = new THREE.Sprite(spriteMat);
        this.labelSprite.scale.set(1.8, 0.6, 1);
        this.labelSprite.position.set(0, 2.05, 0);
        this.group.add(this.labelSprite);
    }

    updateLabel(newName) {
        if (newName) this.name = newName;
        const canvas = document.createElement('canvas');
        canvas.width = 160;
        canvas.height = 50;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(4, 4, 152, 42, 8);
        } else {
            ctx.rect(4, 4, 152, 42);
        }
        ctx.fill();
        ctx.stroke();

        ctx.font = 'bold 18px system-ui, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText(this.name, 80, 28);

        this.labelTex.image = canvas;
        this.labelTex.needsUpdate = true;
    }

    setIsland(island) {
        this.currentIsland = island;
        this.islandId = island?.id || null;
        this.islandName = island?.name || null;
    }

    update(delta, elapsedTime, islands) {
        if (this.status === 'dead') return;

        // 1. Being dragged by local God
        if (this.isDragged) {
            this.leftArm.rotation.x = -Math.PI * 0.7;
            this.rightArm.rotation.x = -Math.PI * 0.7;
            this.leftLeg.rotation.x = 0.3;
            this.rightLeg.rotation.x = -0.3;
            return;
        }

        // 1b. Being held remotely by another God (smooth network interpolation)
        if (this.status === 'held') {
            this.group.position.lerp(this.targetPosition, Math.min(delta * 14.0, 1.0));
            this.leftArm.rotation.x = -Math.PI * 0.7;
            this.rightArm.rotation.x = -Math.PI * 0.7;
            this.leftLeg.rotation.x = 0.3;
            this.rightLeg.rotation.x = -0.3;
            return;
        }

        // 2. Physics arc when thrown
        if (this.isThrown) {
            this.velocity.y -= 18.0 * delta; // gravity
            this.velocity.x *= (1 - 0.5 * delta); // drag
            this.velocity.z *= (1 - 0.5 * delta);

            this.group.position.x += this.velocity.x * delta;
            this.group.position.y += this.velocity.y * delta;
            this.group.position.z += this.velocity.z * delta;

            this.group.rotation.x += 4.0 * delta;
            this.group.rotation.z += 3.0 * delta;

            // Check ground / water impact
            if (this.group.position.y <= 2.0) {
                this.isThrown = false;
                this.group.rotation.set(0, this.group.rotation.y, 0);
                this.handleLanding(islands);
            }
            return;
        }

        // 3. Drowning behavior
        if (this.status === 'drowning') {
            // Bob up and down with head above water
            this.group.position.y = 0.3 + Math.sin(elapsedTime * 6.0) * 0.22;
            // Wave arms frantically
            this.leftArm.rotation.x = -Math.PI * 0.8 + Math.sin(elapsedTime * 12.0) * 0.6;
            this.rightArm.rotation.x = -Math.PI * 0.8 - Math.sin(elapsedTime * 12.0) * 0.6;
            this.leftLeg.rotation.x = Math.sin(elapsedTime * 8.0) * 0.4;
            this.rightLeg.rotation.x = -Math.sin(elapsedTime * 8.0) * 0.4;
            return;
        }

        // 4. Normal Walking / Idle on island
        this.updateAmbientWalking(delta, elapsedTime);
    }

    updateAmbientWalking(delta, elapsedTime) {
        if (!this.currentIsland) return;

        this.walkTimer -= delta;
        if (this.walkTimer <= 0) {
            if (this.state === 'idle') {
                // Pick destination on current island
                const angle = Math.random() * Math.PI * 2;
                const dist = Math.random() * (this.currentIsland.radius * 0.65);
                this.walkTarget = new THREE.Vector3(
                    this.currentIsland.worldX + Math.cos(angle) * dist,
                    2.0,
                    this.currentIsland.worldZ + Math.sin(angle) * dist
                );
                this.state = 'walk';
                this.walkTimer = 3.0 + Math.random() * 5.0;
            } else {
                this.state = 'idle';
                this.walkTimer = 2.0 + Math.random() * 4.0;
                // Reset limb rotations
                this.leftArm.rotation.x = 0;
                this.rightArm.rotation.x = 0;
                this.leftLeg.rotation.x = 0;
                this.rightLeg.rotation.x = 0;
            }
        }

        if (this.state === 'walk' && this.walkTarget) {
            const dir = new THREE.Vector3().subVectors(this.walkTarget, this.group.position);
            dir.y = 0;
            const dist = dir.length();

            if (dist < 0.25) {
                this.state = 'idle';
            } else {
                dir.normalize();
                this.group.position.addScaledVector(dir, this.walkSpeed * delta);
                this.group.rotation.y = Math.atan2(dir.x, dir.z);

                // Swing limbs
                const walkCycle = Math.sin(elapsedTime * 8.0);
                this.leftArm.rotation.x = walkCycle * 0.7;
                this.rightArm.rotation.x = -walkCycle * 0.7;
                this.leftLeg.rotation.x = -walkCycle * 0.7;
                this.rightLeg.rotation.x = walkCycle * 0.7;
            }
        } else {
            // Idle breathing
            this.leftArm.rotation.z = Math.sin(elapsedTime * 2.0) * 0.05;
            this.rightArm.rotation.z = -Math.sin(elapsedTime * 2.0) * 0.05;
        }
    }

    handleLanding(islands) {
        // Check if landed on any island
        let landedIsland = null;
        for (const island of islands) {
            if (island.isInside(this.group.position.x, this.group.position.z)) {
                landedIsland = island;
                break;
            }
        }

        if (landedIsland) {
            // Landed on an island!
            this.group.position.y = 2.0;
            this.status = 'alive';
            this.state = 'idle';
            this.walkTimer = 2.0;

            const isNewIsland = this.currentIsland && this.currentIsland.id !== landedIsland.id;
            const oldIsland = this.currentIsland;
            this.setIsland(landedIsland);

            if (this.onLandedIslandCallback) {
                this.onLandedIslandCallback(this, landedIsland, oldIsland, isNewIsland);
            }
        } else {
            // Landed in Ocean! Trigger drowning!
            this.group.position.y = 0.3;
            this.status = 'drowning';
            this.state = 'drowning';

            if (this.onFellInWaterCallback) {
                this.onFellInWaterCallback(this);
            }
        }
    }

    dispose() {
        this.scene.remove(this.group);
        this.group.traverse((obj) => {
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) {
                if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
                else obj.material.dispose();
            }
        });
    }
}
