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
  const mat = new THREE.MeshLambertMaterial({ color: 0x020204 });
  const matGlow = new THREE.MeshLambertMaterial({ 
    color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 2 
  });

  // Cuerpo
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.2, 0.25), mat);
  body.position.y = 1.4;
  group.add(body);

  // Cabeza
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.25), mat);
  head.position.y = 2.2;
  group.add(head);

  // Ojos
  [-0.07, 0.07].forEach(x => {
    const eye = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.05), matGlow);
    eye.position.set(x, 2.22, 0.13);
    group.add(eye);
  });

  // Piernas
  [-0.12, 0.12].forEach((x, i) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.8, 0.2), mat);
    leg.name = i === 0 ? 'leftLeg' : 'rightLeg';
    leg.position.set(x, 0.4, 0);
    group.add(leg);
  });

  // Brazos
  [-0.35, 0.35].forEach((x, i) => {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.9, 0.15), mat);
    arm.name = i === 0 ? 'leftArm' : 'rightArm';
    arm.position.set(x, 1.4, 0);
    group.add(arm);
  });

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