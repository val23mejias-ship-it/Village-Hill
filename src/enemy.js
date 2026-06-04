// src/enemy.js — Enemigo con patrulla, caza por ruido y vista con linterna
import * as THREE from 'three';

const SPEED_PATROL  = 1.8;
const SPEED_CHASE   = 5.5;
const SPEED_SPOTTED = 3.2;
const NOISE_RADIUS  = 14;
const SIGHT_RADIUS  = 20;
const SIGHT_ANGLE   = 0.18;  // cos del cono de linterna (~80°)
const CATCH_DIST    = 1.4;
const FLEE_TIME     = 6;     // segundos para huir cuando te ve
const CALM_TIME     = 4;     // segundos buscando antes de volver a patrullar
const SPAWN_Z       = -60;

const STATE = {
  PATROL:  'patrol',
  CHASE:   'chase',
  SPOTTED: 'spotted',
  SEARCH:  'search',   // busca un momento después de perderte de vista
  CALM:    'calm',     // enfriamiento antes de volver a patrullar
};

let enemyMesh  = null;
let enemyState = STATE.PATROL;
let fleeTimer  = 0;   // cuenta regresiva cuando te ve
let calmTimer  = 0;   // cuenta antes de volver a patrullar
let noiseLevel = 0;
let onCaught   = null;
let lastPlayerPos = new THREE.Vector3();

const waypoints = [
  new THREE.Vector3( 2, 0, -20),
  new THREE.Vector3(-2, 0, -40),
  new THREE.Vector3( 1, 0, -55),
  new THREE.Vector3(-1, 0, -35),
  new THREE.Vector3( 2, 0, -15),
];
let waypointIdx = 0;

// ── Geometría ────────────────────────────────────────────────────
function buildEnemyMesh() {
  const group = new THREE.Group();

  const mat = new THREE.MeshStandardMaterial({
    color: 0x050508, roughness: 1, metalness: 0,
    transparent: true, opacity: 0.85, side: THREE.DoubleSide,
  });
  const matGlow = new THREE.MeshStandardMaterial({
    color: 0x330011, emissive: 0x220008, emissiveIntensity: 1,
    transparent: true, opacity: 0.6,
  });

  // Cuerpo elongado
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 1.6, 4, 8), mat);
  body.position.y = 1.4;
  body.scale.set(1, 1.3, 0.6);
  group.add(body);

  // Cabeza deforme
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.35, 6, 5), mat);
  head.scale.set(1.4, 0.8, 0.9);
  head.position.y = 2.9;
  group.add(head);

  // Brazos largos
  [-1, 1].forEach(side => {
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 1.4, 3, 6), mat);
    arm.position.set(side * 0.5, 1.6, 0);
    arm.rotation.z = side * 0.7;
    arm.rotation.x = 0.3;
    group.add(arm);
    for (let f = 0; f < 3; f++) {
      const finger = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 0.4, 2, 4), mat);
      finger.position.set(side * (1.1 + f * 0.06), 0.9 + f * 0.05, (f - 1) * 0.12);
      finger.rotation.z = side * 1.1;
      group.add(finger);
    }
  });

  // Piernas
  [-0.2, 0.2].forEach((dx, i) => {
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.7, 3, 6), mat);
    leg.position.set(dx, 0.45, 0);
    leg.rotation.x = i === 0 ? 0.15 : -0.15;
    group.add(leg);
  });

  // Ojos rojos
  [-0.12, 0.12].forEach(dx => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.05, 5, 5), matGlow);
    eye.position.set(dx, 2.95, 0.3);
    group.add(eye);
  });

  // Sombra en el suelo
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.6, 12),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.4 })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.01;
  group.add(shadow);

  group.castShadow = true;
  return group;
}

// ── Crear enemigo ────────────────────────────────────────────────
export function createEnemy(scene, caughtCallback) {
  onCaught  = caughtCallback;
  enemyMesh = buildEnemyMesh();
  enemyMesh.position.set(3, 0, SPAWN_Z);
  scene.add(enemyMesh);

  const light = new THREE.PointLight(0x330000, 1.5, 6, 2);
  light.position.set(0, 2, 0);
  enemyMesh.add(light);

  return enemyMesh;
}

// ── Ruido externo (player.js y collectibles) ─────────────────────
export function addNoise(amount) {
  noiseLevel = Math.min(noiseLevel + amount, 1);
}

// ── Update ───────────────────────────────────────────────────────
const _toPlayer   = new THREE.Vector3();
const _toEnemy    = new THREE.Vector3();
const _camDir     = new THREE.Vector3();

export function updateEnemy(delta, playerBody, camera, onGameOver) {
  if (!enemyMesh) return;

  const playerPos = playerBody.position;

  // Distancia al jugador
  _toPlayer.copy(playerPos).sub(enemyMesh.position);
  _toPlayer.y = 0;
  const dist = _toPlayer.length();

  // ── Detección por linterna ───────────────────────────────────
  camera.getWorldDirection(_camDir);
  _toEnemy.copy(enemyMesh.position).sub(playerPos).normalize();
  const inSight = dist < SIGHT_RADIUS && _camDir.dot(_toEnemy) > SIGHT_ANGLE;

  // ── Detección por ruido ──────────────────────────────────────
  const inNoiseRange = noiseLevel > 0.2 && dist < NOISE_RADIUS;

  // ── Máquina de estados ───────────────────────────────────────
  switch (enemyState) {

    case STATE.PATROL:
      patrol(delta);
      if (inSight) {
        enemyState = STATE.SPOTTED;
        fleeTimer  = FLEE_TIME;
      } else if (inNoiseRange) {
        enemyState = STATE.CHASE;
        lastPlayerPos.copy(playerPos);
      }
      hideFleeUI();
      break;

    case STATE.CHASE:
      moveToward(playerPos, SPEED_CHASE, delta);
      if (inSight) {
        enemyState = STATE.SPOTTED;
        fleeTimer  = FLEE_TIME;
      }
      // Si el jugador se aleja y deja de hacer ruido → buscar
      if (!inNoiseRange && dist > NOISE_RADIUS) {
        enemyState = STATE.SEARCH;
        calmTimer  = CALM_TIME;
        lastPlayerPos.copy(playerPos);
      }
      if (dist < CATCH_DIST) { onGameOver(); return; }
      hideFleeUI();
      break;

    case STATE.SPOTTED:
      fleeTimer -= delta;
      moveToward(playerPos, SPEED_SPOTTED, delta);

      if (!inSight) {
        // Perdió la vista — busca un momento y luego se calma
        enemyState = STATE.SEARCH;
        calmTimer  = CALM_TIME;
        lastPlayerPos.copy(playerPos);
        hideFleeUI();
      } else if (fleeTimer <= 0) {
        // Se acabó el tiempo → game over
        onGameOver();
        return;
      } else {
        updateFleeUI(fleeTimer);
      }
      if (dist < CATCH_DIST) { onGameOver(); return; }
      break;

    case STATE.SEARCH:
      // Va al último lugar donde vio/escuchó al jugador
      moveToward(lastPlayerPos, SPEED_CHASE * 0.7, delta);
      calmTimer -= delta;
      if (inSight) {
        enemyState = STATE.SPOTTED;
        fleeTimer  = FLEE_TIME;
      } else if (inNoiseRange) {
        enemyState = STATE.CHASE;
        lastPlayerPos.copy(playerPos);
      } else if (calmTimer <= 0) {
        // Se rinde y vuelve a patrullar — se "olvida"
        enemyState = STATE.CALM;
        calmTimer  = 2; // pausa breve antes de patrullar
      }
      if (dist < CATCH_DIST) { onGameOver(); return; }
      hideFleeUI();
      break;

    case STATE.CALM:
      // Pequeña pausa, luego patrulla normal
      calmTimer -= delta;
      if (inSight) {
        enemyState = STATE.SPOTTED;
        fleeTimer  = FLEE_TIME;
      } else if (inNoiseRange) {
        enemyState = STATE.CHASE;
      } else if (calmTimer <= 0) {
        enemyState = STATE.PATROL;
      }
      hideFleeUI();
      break;
  }

  // Reducir ruido con el tiempo
  noiseLevel = Math.max(0, noiseLevel - delta * 0.3);

  // Animación flotante
  enemyMesh.position.y = Math.sin(Date.now() * 0.002) * 0.08;

  // Rotar hacia el jugador
  if (dist > 0.5) {
    const angle = Math.atan2(
      playerPos.x - enemyMesh.position.x,
      playerPos.z - enemyMesh.position.z
    );
    enemyMesh.rotation.y = angle;
  }
}

// ── Movimiento ───────────────────────────────────────────────────
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

// ── UI ───────────────────────────────────────────────────────────
let fleeUI = null;

function getFleeUI() {
  if (!fleeUI) {
    fleeUI = document.createElement('div');
    fleeUI.style.cssText = `
      position: fixed; top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      color: #ff0000;
      font-family: 'Courier New', monospace;
      font-size: 48px; font-weight: bold;
      letter-spacing: 4px;
      text-shadow: 0 0 20px #ff000088;
      pointer-events: none; z-index: 200; display: none;
    `;
    document.body.appendChild(fleeUI);
  }
  return fleeUI;
}

function updateFleeUI(timeLeft) {
  const ui   = getFleeUI();
  ui.style.display = 'block';
  const secs = Math.ceil(Math.max(0, timeLeft));
  ui.textContent   = `¡HUYE! ${secs}`;
  ui.style.opacity = secs <= 2
    ? (Math.sin(Date.now() * 0.02) * 0.5 + 0.5).toString()
    : '1';
}

function hideFleeUI() {
  const ui = getFleeUI();
  ui.style.display = 'none';
}