// src/enemy.js — Enemigo que patrulla y solo atrapa por proximidad
import * as THREE from 'three';

const SPEED_PATROL = 2.2;
const CATCH_DIST   = 1.8;   // distancia para atrapar — solo si estás MUY cerca
const SPAWN_Z      = -55;

let enemyMesh  = null;
let limbTime   = 0;
let waypointIdx = 0;

// Waypoints que cubren todo el mapa incluyendo zonas de objetos
const waypoints = [
  new THREE.Vector3(  2, 0,  -15),
  new THREE.Vector3(-22, 0,  -25),
  new THREE.Vector3( -2, 0,  -40),  // cerca objeto 1
  new THREE.Vector3( 22, 0,  -35),
  new THREE.Vector3(  1, 0,  -60),  // cerca objeto 2
  new THREE.Vector3(-22, 0,  -65),
  new THREE.Vector3(  2, 0,  -85),  // cerca objeto 3
  new THREE.Vector3( 22, 0,  -75),
  new THREE.Vector3( -1, 0, -100),
  new THREE.Vector3(  2, 0,  -50),
  new THREE.Vector3(-12, 0,  -20),
  new THREE.Vector3( 12, 0,  -90),
];

// ── Geometría ─────────────────────────────────────────────────────
function buildEnemyMesh() {
  const group = new THREE.Group();

  const mat = new THREE.MeshStandardMaterial({
    color: 0x020204, roughness: 0.95, metalness: 0.1,
    transparent: true, opacity: 0.92,
  });
  const matSkin = new THREE.MeshStandardMaterial({
    color: 0x0a0608, roughness: 1, metalness: 0,
    transparent: true, opacity: 0.88,
  });
  const matGlow = new THREE.MeshStandardMaterial({
    color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 3,
    transparent: true, opacity: 0.9,
  });
  const matVein = new THREE.MeshStandardMaterial({
    color: 0x1a0005, emissive: 0x3a0008, emissiveIntensity: 0.5,
    transparent: true, opacity: 0.7,
  });

  // Torso elongado
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 2.2, 6, 10), mat);
  torso.name = 'torso';
  torso.position.y = 1.8;
  torso.scale.set(1, 1, 0.5);
  group.add(torso);

  // Cuello torcido
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.12, 0.7, 6), matSkin);
  neck.position.set(0.08, 3.1, 0);
  neck.rotation.z = 0.2;
  group.add(neck);

  // Cabeza pequeña alargada
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 7, 6), matSkin);
  head.name = 'head';
  head.scale.set(0.7, 1.3, 0.6);
  head.position.set(0.1, 3.65, 0);
  group.add(head);

  // Deformaciones
  const bump1 = new THREE.Mesh(new THREE.SphereGeometry(0.1, 5, 4), matSkin);
  bump1.position.set(-0.15, 3.85, 0.05);
  bump1.scale.set(1, 0.6, 0.8);
  group.add(bump1);
  const bump2 = new THREE.Mesh(new THREE.SphereGeometry(0.08, 5, 4), matSkin);
  bump2.position.set(0.18, 3.55, -0.1);
  group.add(bump2);

  // 4 ojos asimétricos
  [[-0.1, 3.72, 0.22], [0.08, 3.68, 0.24], [-0.18, 3.62, 0.18], [0.2, 3.78, 0.2]].forEach(([x,y,z]) => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.03, 5, 5), matGlow);
    eye.position.set(x, y, z);
    group.add(eye);
  });

  // Boca hendidura
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.03, 0.05),
    new THREE.MeshStandardMaterial({ color: 0x000000 }));
  mouth.position.set(0.05, 3.48, 0.24);
  mouth.rotation.z = 0.15;
  group.add(mouth);

  // Brazo izquierdo largo
  const leftArm = new THREE.Group();
  leftArm.name = 'leftArm';
  const lUpper = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 1.0, 3, 6), matSkin);
  lUpper.position.y = -0.5; leftArm.add(lUpper);
  const lElbow = new THREE.Mesh(new THREE.SphereGeometry(0.07, 5, 4), matSkin);
  lElbow.position.set(0, -1.05, 0); leftArm.add(lElbow);
  const lFore = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 1.1, 3, 6), matSkin);
  lFore.position.set(0.05, -1.7, 0.1); lFore.rotation.z = -0.15; leftArm.add(lFore);
  for (let f = 0; f < 4; f++) {
    const finger = new THREE.Mesh(new THREE.CapsuleGeometry(0.022, 0.55 + f * 0.05, 2, 4), matSkin);
    finger.position.set(-0.08 + f * 0.06, -2.35 - f * 0.02, 0.1 + f * 0.03);
    finger.rotation.x = 0.3 + f * 0.1; finger.rotation.z = -0.1 + f * 0.05;
    leftArm.add(finger);
  }
  leftArm.position.set(-0.28, 2.9, 0);
  leftArm.rotation.z = 0.5; leftArm.rotation.x = 0.4;
  group.add(leftArm);

  // Brazo derecho
  const rightArm = new THREE.Group();
  rightArm.name = 'rightArm';
  const rUpper = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.85, 3, 6), matSkin);
  rUpper.position.y = -0.42; rightArm.add(rUpper);
  const rElbow = new THREE.Mesh(new THREE.SphereGeometry(0.075, 5, 4), matSkin);
  rElbow.position.set(-0.05, -0.9, 0.05); rightArm.add(rElbow);
  const rFore = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.9, 3, 6), matSkin);
  rFore.position.set(-0.08, -1.48, 0.15); rFore.rotation.z = 0.2; rightArm.add(rFore);
  for (let f = 0; f < 4; f++) {
    const finger = new THREE.Mesh(new THREE.CapsuleGeometry(0.024, 0.45 + f * 0.04, 2, 4), matSkin);
    finger.position.set(0.06 - f * 0.055, -1.98 - f * 0.02, 0.12);
    finger.rotation.x = 0.4; finger.rotation.z = 0.1 - f * 0.06;
    rightArm.add(finger);
  }
  rightArm.position.set(0.28, 2.85, 0);
  rightArm.rotation.z = -0.35; rightArm.rotation.x = 0.6;
  group.add(rightArm);

  // Venas en torso
  for (let v = 0; v < 5; v++) {
    const vein = new THREE.Mesh(new THREE.CapsuleGeometry(0.012, 0.4 + Math.random() * 0.4, 2, 4), matVein);
    vein.position.set((Math.random() - 0.5) * 0.3, 1.2 + Math.random() * 1.4, 0.18);
    vein.rotation.z = (Math.random() - 0.5) * 1.2;
    group.add(vein);
  }

  // Piernas largas
  [-0.15, 0.15].forEach((dx, i) => {
    const lg = new THREE.Group();
    lg.name = i === 0 ? 'leftLeg' : 'rightLeg';
    const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.85, 3, 6), matSkin);
    thigh.position.y = -0.42; lg.add(thigh);
    const knee = new THREE.Mesh(new THREE.SphereGeometry(0.09, 5, 4), matSkin);
    knee.position.set(0, -0.9, 0.06); lg.add(knee);
    const shin = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.9, 3, 6), matSkin);
    shin.position.set(0.02, -1.5, 0.05); shin.rotation.x = -0.1; lg.add(shin);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 0.25), matSkin);
    foot.position.set(0, -1.98, 0.1); lg.add(foot);
    lg.position.set(dx, 0.85, 0);
    group.add(lg);
  });

  // Aura oscura
  const aura = new THREE.Mesh(new THREE.CircleGeometry(0.9, 14),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.5 }));
  aura.rotation.x = -Math.PI / 2; aura.position.y = 0.01;
  group.add(aura);

  // Partículas flotantes
  for (let p = 0; p < 6; p++) {
    const particle = new THREE.Mesh(new THREE.SphereGeometry(0.04 + Math.random() * 0.05, 4, 4),
      new THREE.MeshBasicMaterial({ color: 0x110005, transparent: true, opacity: 0.6 }));
    particle.name = `particle_${p}`;
    particle.position.set((Math.random() - 0.5) * 0.8, 0.1 + Math.random() * 1.5, (Math.random() - 0.5) * 0.8);
    group.add(particle);
  }

  return group;
}

// ── Crear enemigo ─────────────────────────────────────────────────
export function createEnemy(scene, caughtCallback) {
  enemyMesh = buildEnemyMesh();
  enemyMesh.position.set(3, 0, SPAWN_Z);
  scene.add(enemyMesh);

  const redLight = new THREE.PointLight(0x550000, 2, 7, 2);
  redLight.position.set(0, 2.5, 0);
  enemyMesh.add(redLight);

  const pulseLight = new THREE.PointLight(0x220000, 1, 4, 2);
  pulseLight.name = 'pulseLight';
  pulseLight.position.set(0, 1, 0);
  enemyMesh.add(pulseLight);

  return { mesh: enemyMesh, onCaught: caughtCallback };
}

// ── Update ────────────────────────────────────────────────────────
const _toPlayer = new THREE.Vector3();

export function updateEnemy(delta, enemyRef, playerBody, onGameOver) {
  if (!enemyMesh) return;

  limbTime += delta;
  const playerPos = playerBody.position;

  // Patrullar waypoints
  patrol(delta);

  // Distancia al jugador
  _toPlayer.copy(playerPos).sub(enemyMesh.position);
  _toPlayer.y = 0;
  const dist = _toPlayer.length();

  // Solo atrapa si está MUY cerca
  if (dist < CATCH_DIST) {
    onGameOver();
    return;
  }

  // Animación
  animateEnemy(dist);

  // Rotar hacia el jugador suavemente
  const angle = Math.atan2(
    playerPos.x - enemyMesh.position.x,
    playerPos.z - enemyMesh.position.z
  );
  enemyMesh.rotation.y += (angle - enemyMesh.rotation.y) * 0.05;
}

// ── Patrulla ──────────────────────────────────────────────────────
function patrol(delta) {
  const wp  = waypoints[waypointIdx];
  const dir = new THREE.Vector3().copy(wp).sub(enemyMesh.position);
  dir.y = 0;
  if (dir.length() < 1.2) {
    waypointIdx = (waypointIdx + 1) % waypoints.length;
  } else {
    dir.normalize().multiplyScalar(SPEED_PATROL * delta);
    enemyMesh.position.add(dir);
  }
}

// ── Animación ─────────────────────────────────────────────────────
function animateEnemy(distToPlayer) {
  const t = limbTime;

  // Bob vertical suave
  enemyMesh.position.y = Math.sin(t * 1.4) * 0.07;

  // Ligera inclinación orgánica
  enemyMesh.rotation.x = Math.sin(t * 0.6) * 0.04;
  enemyMesh.rotation.z = Math.sin(t * 0.4) * 0.03;

  // Brazos
  const leftArm  = enemyMesh.getObjectByName('leftArm');
  const rightArm = enemyMesh.getObjectByName('rightArm');
  if (leftArm) {
    leftArm.rotation.x = 0.4 + Math.sin(t * 1.2) * 0.25;
    leftArm.rotation.z = 0.5 + Math.sin(t * 0.7 + 1) * 0.2;
    // Se estira si está cerca
    if (distToPlayer < 3.5) leftArm.rotation.x += (3.5 - distToPlayer) * 0.2;
  }
  if (rightArm) {
    rightArm.rotation.x = 0.6 + Math.sin(t * 1.2 + Math.PI) * 0.2;
    rightArm.rotation.z = -0.35 + Math.sin(t * 0.9) * 0.18;
    if (distToPlayer < 3.5) rightArm.rotation.x += (3.5 - distToPlayer) * 0.18;
  }

  // Cabeza giro nervioso
  const head = enemyMesh.getObjectByName('head');
  if (head) {
    head.rotation.y = Math.sin(t * 0.8) * 0.4;
    head.rotation.z = Math.sin(t * 1.1 + 0.5) * 0.12;
  }

  // Piernas
  const ll = enemyMesh.getObjectByName('leftLeg');
  const rl = enemyMesh.getObjectByName('rightLeg');
  if (ll) ll.rotation.x =  Math.sin(t * 2.2) * 0.3;
  if (rl) rl.rotation.x = -Math.sin(t * 2.2) * 0.3;

  // Partículas
  for (let p = 0; p < 6; p++) {
    const part = enemyMesh.getObjectByName(`particle_${p}`);
    if (part) {
      part.position.y += Math.sin(t * 2 + p) * 0.003;
      part.position.x += Math.sin(t * 1.3 + p * 1.2) * 0.002;
    }
  }

  // Luz pulsante
  const pulse = enemyMesh.getObjectByName('pulseLight');
  if (pulse) pulse.intensity = 0.8 + Math.sin(t * 4) * 0.5;
}

// Exportar ruido vacío para no romper player.js si lo importa
export function addNoise() {}