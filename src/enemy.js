// src/enemy.js — Enemigo perturbador + UI sin solapamiento
import * as THREE from 'three';

const SPEED_PATROL  = 1.8;
const SPEED_CHASE   = 5.5;
const SPEED_SPOTTED = 3.2;
const NOISE_RADIUS  = 14;
const SIGHT_RADIUS  = 20;
const SIGHT_ANGLE   = 0.18;
const CATCH_DIST    = 1.4;
const FLEE_TIME     = 6;
const CALM_TIME     = 4;
const SPAWN_Z       = -60;

const STATE = {
  PATROL:  'patrol',
  CHASE:   'chase',
  SPOTTED: 'spotted',
  SEARCH:  'search',
  CALM:    'calm',
};

let enemyMesh  = null;
let enemyState = STATE.PATROL;
let fleeTimer  = 0;
let calmTimer  = 0;
let noiseLevel = 0;
let onCaught   = null;
let lastPlayerPos = new THREE.Vector3();

// Animación de las extremidades
let limbTime = 0;

const waypoints = [
  new THREE.Vector3(  2, 0,  -15),
  new THREE.Vector3( -2, 0,  -35),
  new THREE.Vector3(-22, 0,  -30),  // calle lateral izquierda
  new THREE.Vector3(-22, 0,  -55),
  new THREE.Vector3( -2, 0,  -65),
  new THREE.Vector3(  1, 0,  -85),
  new THREE.Vector3( 22, 0,  -70),  // calle lateral derecha
  new THREE.Vector3( 22, 0,  -40),
  new THREE.Vector3(  2, 0,  -50),
  new THREE.Vector3( -1, 0, -100),
  new THREE.Vector3(  2, 0,  -20),
];
let waypointIdx = 0;

// ── Geometría mejorada ───────────────────────────────────────────
function buildEnemyMesh() {
  const group = new THREE.Group();

  const mat = new THREE.MeshStandardMaterial({
    color: 0x020204,
    roughness: 0.95,
    metalness: 0.1,
    transparent: true,
    opacity: 0.92,
  });

  const matSkin = new THREE.MeshStandardMaterial({
    color: 0x0a0608,
    roughness: 1,
    metalness: 0,
    transparent: true,
    opacity: 0.88,
  });

  const matGlow = new THREE.MeshStandardMaterial({
    color: 0xff0000,
    emissive: 0xff0000,
    emissiveIntensity: 3,
    transparent: true,
    opacity: 0.9,
  });

  const matVein = new THREE.MeshStandardMaterial({
    color: 0x1a0005,
    emissive: 0x3a0008,
    emissiveIntensity: 0.5,
    transparent: true,
    opacity: 0.7,
  });

  // ── Torso muy elongado y delgado ─────────────────────────────
  const torso = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.18, 2.2, 6, 10), mat
  );
  torso.name = 'torso';
  torso.position.y = 1.8;
  torso.scale.set(1, 1, 0.5);
  group.add(torso);

  // ── Cuello largo y torcido ───────────────────────────────────
  const neck = new THREE.Mesh(
    new THREE.CylinderGeometry(0.07, 0.12, 0.7, 6), matSkin
  );
  neck.position.set(0.08, 3.1, 0);
  neck.rotation.z = 0.2;
  group.add(neck);

  // ── Cabeza pequeña y alargada (inquietante) ──────────────────
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.28, 7, 6), matSkin
  );
  head.name = 'head';
  head.scale.set(0.7, 1.3, 0.6);
  head.position.set(0.1, 3.65, 0);
  group.add(head);

  // Deformaciones en la cabeza
  const bump1 = new THREE.Mesh(new THREE.SphereGeometry(0.1, 5, 4), matSkin);
  bump1.position.set(-0.15, 3.85, 0.05);
  bump1.scale.set(1, 0.6, 0.8);
  group.add(bump1);

  const bump2 = new THREE.Mesh(new THREE.SphereGeometry(0.08, 5, 4), matSkin);
  bump2.position.set(0.18, 3.55, -0.1);
  group.add(bump2);

  // ── Ojos — 4 puntos asimétricos ─────────────────────────────
  [
    [-0.1,  3.72,  0.22],
    [ 0.08, 3.68,  0.24],
    [-0.18, 3.62,  0.18],
    [ 0.2,  3.78,  0.2 ],
  ].forEach(([x, y, z]) => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.03, 5, 5), matGlow);
    eye.position.set(x, y, z);
    group.add(eye);
  });

  // ── Boca — hendidura oscura ──────────────────────────────────
  const mouth = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.03, 0.05),
    new THREE.MeshStandardMaterial({ color: 0x000000 })
  );
  mouth.position.set(0.05, 3.48, 0.24);
  mouth.rotation.z = 0.15;
  group.add(mouth);

  // ── Brazo izquierdo — muy largo, huesudo ────────────────────
  const leftArm = new THREE.Group();
  leftArm.name = 'leftArm';

  const lUpperArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 1.0, 3, 6), matSkin);
  lUpperArm.position.set(0, -0.5, 0);
  leftArm.add(lUpperArm);

  const lElbow = new THREE.Mesh(new THREE.SphereGeometry(0.07, 5, 4), matSkin);
  lElbow.position.set(0, -1.05, 0);
  leftArm.add(lElbow);

  const lForearm = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 1.1, 3, 6), matSkin);
  lForearm.position.set(0.05, -1.7, 0.1);
  lForearm.rotation.z = -0.15;
  leftArm.add(lForearm);

  // Dedos izquierda — 4 dedos largos
  for (let f = 0; f < 4; f++) {
    const finger = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.022, 0.55 + f * 0.05, 2, 4), matSkin
    );
    finger.position.set(-0.08 + f * 0.06, -2.35 - f * 0.02, 0.1 + f * 0.03);
    finger.rotation.x = 0.3 + f * 0.1;
    finger.rotation.z = -0.1 + f * 0.05;
    leftArm.add(finger);
  }

  leftArm.position.set(-0.28, 2.9, 0);
  leftArm.rotation.z = 0.5;
  leftArm.rotation.x = 0.4;
  group.add(leftArm);

  // ── Brazo derecho — más corto, distorsionado ─────────────────
  const rightArm = new THREE.Group();
  rightArm.name = 'rightArm';

  const rUpperArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.85, 3, 6), matSkin);
  rUpperArm.position.set(0, -0.42, 0);
  rightArm.add(rUpperArm);

  const rElbow = new THREE.Mesh(new THREE.SphereGeometry(0.075, 5, 4), matSkin);
  rElbow.position.set(-0.05, -0.9, 0.05);
  rightArm.add(rElbow);

  const rForearm = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.9, 3, 6), matSkin);
  rForearm.position.set(-0.08, -1.48, 0.15);
  rForearm.rotation.z = 0.2;
  rightArm.add(rForearm);

  for (let f = 0; f < 4; f++) {
    const finger = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.024, 0.45 + f * 0.04, 2, 4), matSkin
    );
    finger.position.set(0.06 - f * 0.055, -1.98 - f * 0.02, 0.12);
    finger.rotation.x = 0.4;
    finger.rotation.z = 0.1 - f * 0.06;
    rightArm.add(finger);
  }

  rightArm.position.set(0.28, 2.85, 0);
  rightArm.rotation.z = -0.35;
  rightArm.rotation.x = 0.6;
  group.add(rightArm);

  // ── Venas en el torso ────────────────────────────────────────
  for (let v = 0; v < 5; v++) {
    const vein = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.012, 0.4 + Math.random() * 0.4, 2, 4), matVein
    );
    vein.position.set(
      (Math.random() - 0.5) * 0.3,
      1.2 + Math.random() * 1.4,
      0.18
    );
    vein.rotation.z = (Math.random() - 0.5) * 1.2;
    vein.rotation.x = (Math.random() - 0.5) * 0.5;
    group.add(vein);
  }

  // ── Piernas — muy largas y huesudas ─────────────────────────
  [-0.15, 0.15].forEach((dx, i) => {
    const legGroup = new THREE.Group();
    legGroup.name = i === 0 ? 'leftLeg' : 'rightLeg';

    const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.85, 3, 6), matSkin);
    thigh.position.y = -0.42;
    legGroup.add(thigh);

    const knee = new THREE.Mesh(new THREE.SphereGeometry(0.09, 5, 4), matSkin);
    knee.position.set(0, -0.9, 0.06);
    legGroup.add(knee);

    const shin = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.9, 3, 6), matSkin);
    shin.position.set(0.02, -1.5, 0.05);
    shin.rotation.x = -0.1;
    legGroup.add(shin);

    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 0.25), matSkin);
    foot.position.set(0, -1.98, 0.1);
    legGroup.add(foot);

    legGroup.position.set(dx, 0.85, 0);
    group.add(legGroup);
  });

  // ── Niebla/aura oscura a los pies ───────────────────────────
  const aura = new THREE.Mesh(
    new THREE.CircleGeometry(0.8, 14),
    new THREE.MeshBasicMaterial({
      color: 0x000000, transparent: true, opacity: 0.5
    })
  );
  aura.rotation.x = -Math.PI / 2;
  aura.position.y = 0.01;
  group.add(aura);

  // Partículas de sombra flotantes (esferas pequeñas oscuras)
  for (let p = 0; p < 6; p++) {
    const particle = new THREE.Mesh(
      new THREE.SphereGeometry(0.04 + Math.random() * 0.05, 4, 4),
      new THREE.MeshBasicMaterial({ color: 0x110005, transparent: true, opacity: 0.6 })
    );
    particle.name = `particle_${p}`;
    particle.position.set(
      (Math.random() - 0.5) * 0.8,
      0.1 + Math.random() * 1.5,
      (Math.random() - 0.5) * 0.8
    );
    group.add(particle);
  }

  return group;
}

// ── Crear enemigo ────────────────────────────────────────────────
export function createEnemy(scene, caughtCallback) {
  onCaught  = caughtCallback;
  enemyMesh = buildEnemyMesh();
  enemyMesh.position.set(3, 0, SPAWN_Z);
  scene.add(enemyMesh);

  // Luz rojiza que emana del enemigo
  const redLight = new THREE.PointLight(0x550000, 2, 7, 2);
  redLight.position.set(0, 2.5, 0);
  enemyMesh.add(redLight);

  // Luz pulsante secundaria
  const pulseLight = new THREE.PointLight(0x220000, 1, 4, 2);
  pulseLight.name = 'pulseLight';
  pulseLight.position.set(0, 1, 0);
  enemyMesh.add(pulseLight);

  return enemyMesh;
}

export function addNoise(amount) {
  noiseLevel = Math.min(noiseLevel + amount, 1);
}

// ── Update ───────────────────────────────────────────────────────
const _toPlayer = new THREE.Vector3();
const _toEnemy  = new THREE.Vector3();
const _camDir   = new THREE.Vector3();

export function updateEnemy(delta, playerBody, camera, onGameOver) {
  if (!enemyMesh) return;

  limbTime += delta;
  const playerPos = playerBody.position;

  _toPlayer.copy(playerPos).sub(enemyMesh.position);
  _toPlayer.y = 0;
  const dist = _toPlayer.length();

  // Detección linterna
  camera.getWorldDirection(_camDir);
  _toEnemy.copy(enemyMesh.position).sub(playerPos).normalize();
  const inSight = dist < SIGHT_RADIUS && _camDir.dot(_toEnemy) > SIGHT_ANGLE;

  // Detección ruido
  const inNoiseRange = noiseLevel > 0.2 && dist < NOISE_RADIUS;

  // ── Estados ──────────────────────────────────────────────────
  switch (enemyState) {
    case STATE.PATROL:
      patrol(delta);
      if (inSight) { enemyState = STATE.SPOTTED; fleeTimer = FLEE_TIME; }
      else if (inNoiseRange) { enemyState = STATE.CHASE; lastPlayerPos.copy(playerPos); }
      hideFleeUI();
      break;

    case STATE.CHASE:
      moveToward(playerPos, SPEED_CHASE, delta);
      if (inSight) { enemyState = STATE.SPOTTED; fleeTimer = FLEE_TIME; }
      if (!inNoiseRange && dist > NOISE_RADIUS) {
        enemyState = STATE.SEARCH; calmTimer = CALM_TIME; lastPlayerPos.copy(playerPos);
      }
      if (dist < CATCH_DIST) { onGameOver(); return; }
      hideFleeUI();
      break;

    case STATE.SPOTTED:
      fleeTimer -= delta;
      moveToward(playerPos, SPEED_SPOTTED, delta);
      if (!inSight) {
        enemyState = STATE.SEARCH; calmTimer = CALM_TIME; lastPlayerPos.copy(playerPos);
        hideFleeUI();
      } else if (fleeTimer <= 0) {
        onGameOver(); return;
      } else {
        updateFleeUI(fleeTimer);
      }
      if (dist < CATCH_DIST) { onGameOver(); return; }
      break;

    case STATE.SEARCH:
      moveToward(lastPlayerPos, SPEED_CHASE * 0.7, delta);
      calmTimer -= delta;
      if (inSight) { enemyState = STATE.SPOTTED; fleeTimer = FLEE_TIME; }
      else if (inNoiseRange) { enemyState = STATE.CHASE; lastPlayerPos.copy(playerPos); }
      else if (calmTimer <= 0) { enemyState = STATE.CALM; calmTimer = 2; }
      if (dist < CATCH_DIST) { onGameOver(); return; }
      hideFleeUI();
      break;

    case STATE.CALM:
      calmTimer -= delta;
      if (inSight) { enemyState = STATE.SPOTTED; fleeTimer = FLEE_TIME; }
      else if (inNoiseRange) { enemyState = STATE.CHASE; }
      else if (calmTimer <= 0) { enemyState = STATE.PATROL; }
      hideFleeUI();
      break;
  }

  noiseLevel = Math.max(0, noiseLevel - delta * 0.3);

  // ── Animaciones perturbadoras ────────────────────────────────
  animateEnemy(delta, dist);
}

function animateEnemy(delta, distToPlayer) {
  if (!enemyMesh) return;

  const t = limbTime;
  const isChasing = enemyState === STATE.CHASE || enemyState === STATE.SPOTTED;
  const speed = isChasing ? 3.5 : 1.2;

  // Oscilación vertical del cuerpo (más agresiva al cazar)
  const bobAmp = isChasing ? 0.18 : 0.06;
  enemyMesh.position.y = Math.sin(t * speed * 2) * bobAmp;

  // Inclinar cuerpo hacia adelante al cazar
  const tiltTarget = isChasing ? 0.3 : 0.05;
  enemyMesh.rotation.x += (tiltTarget - enemyMesh.rotation.x) * 0.05;

  // Brazos — movimiento asimétrico y perturbador
  const leftArm  = enemyMesh.getObjectByName('leftArm');
  const rightArm = enemyMesh.getObjectByName('rightArm');
  if (leftArm) {
    leftArm.rotation.x  = 0.4 + Math.sin(t * speed) * (isChasing ? 0.8 : 0.25);
    leftArm.rotation.z  = 0.5 + Math.sin(t * speed * 0.7 + 1) * 0.3;
    // Estirar brazos hacia el jugador cuando está cerca
    if (distToPlayer < 4) {
      leftArm.rotation.x += (4 - distToPlayer) * 0.15;
    }
  }
  if (rightArm) {
    rightArm.rotation.x = 0.6 + Math.sin(t * speed + Math.PI) * (isChasing ? 0.7 : 0.2);
    rightArm.rotation.z = -0.35 + Math.sin(t * speed * 0.9) * 0.25;
    if (distToPlayer < 4) {
      rightArm.rotation.x += (4 - distToPlayer) * 0.12;
    }
  }

  // Cabeza — giro nervioso
  const head = enemyMesh.getObjectByName('head');
  if (head) {
    head.rotation.y = Math.sin(t * 0.8) * (isChasing ? 0.6 : 0.2);
    head.rotation.z = Math.sin(t * 1.1 + 0.5) * 0.15;
  }

  // Piernas — movimiento de caminar raro
  const leftLeg  = enemyMesh.getObjectByName('leftLeg');
  const rightLeg = enemyMesh.getObjectByName('rightLeg');
  if (leftLeg)  leftLeg.rotation.x  =  Math.sin(t * speed) * (isChasing ? 0.5 : 0.2);
  if (rightLeg) rightLeg.rotation.x = -Math.sin(t * speed) * (isChasing ? 0.5 : 0.2);

  // Partículas flotantes
  for (let p = 0; p < 6; p++) {
    const particle = enemyMesh.getObjectByName(`particle_${p}`);
    if (particle) {
      particle.position.y += Math.sin(t * 2 + p) * 0.003;
      particle.position.x += Math.sin(t * 1.3 + p * 1.2) * 0.002;
    }
  }

  // Luz pulsante
  const pulseLight = enemyMesh.getObjectByName('pulseLight');
  if (pulseLight) {
    pulseLight.intensity = 0.8 + Math.sin(t * 4) * 0.5;
    if (isChasing) pulseLight.intensity *= 2;
  }

  // Rotar hacia el jugador
  const angle = Math.atan2(_toPlayer.x, _toPlayer.z);
  enemyMesh.rotation.y = angle;
}

// ── Helpers ──────────────────────────────────────────────────────
function moveToward(target, speed, delta) {
  const dir = new THREE.Vector3().copy(target).sub(enemyMesh.position);
  dir.y = 0;
  if (dir.length() > 0.5) {
    dir.normalize().multiplyScalar(speed * delta);
    enemyMesh.position.add(dir);
  }
}

function patrol(delta) {
  const wp  = waypoints[waypointIdx];
  const dir = new THREE.Vector3().copy(wp).sub(enemyMesh.position);
  dir.y = 0;
  if (dir.length() < 1) {
    waypointIdx = (waypointIdx + 1) % waypoints.length;
  } else {
    dir.normalize().multiplyScalar(SPEED_PATROL * delta);
    enemyMesh.position.add(dir);
  }
}

// ── UI — sin solapamiento ────────────────────────────────────────
let fleeUI = null;

function getFleeUI() {
  if (!fleeUI) {
    fleeUI = document.createElement('div');
    fleeUI.id = 'flee-ui';
    fleeUI.style.cssText = `
      position: fixed;
      bottom: 160px;
      left: 50%;
      transform: translateX(-50%);
      color: #ff0000;
      font-family: 'Courier New', monospace;
      font-size: 36px;
      font-weight: bold;
      letter-spacing: 4px;
      text-shadow: 0 0 20px #ff000099;
      pointer-events: none;
      z-index: 200;
      display: none;
      background: rgba(0,0,0,0.5);
      padding: 8px 24px;
      border: 1px solid #ff000055;
    `;
    document.body.appendChild(fleeUI);
  }
  return fleeUI;
}

function updateFleeUI(timeLeft) {
  const ui   = getFleeUI();
  ui.style.display = 'block';
  const secs = Math.ceil(Math.max(0, timeLeft));
  ui.textContent   = `¡HUYE!  ${secs}s`;
  ui.style.opacity = secs <= 2
    ? (Math.sin(Date.now() * 0.02) * 0.5 + 0.5).toString()
    : '1';
}

function hideFleeUI() {
  const ui = getFleeUI();
  if (ui) ui.style.display = 'none';
}