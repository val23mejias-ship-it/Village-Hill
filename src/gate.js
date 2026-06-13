// src/gate.js — Portón de escape 100% procedural
import * as THREE from 'three';
import { showWin } from './main.js';

const GATE_Z       = -68;
const TRIGGER_DIST = 3.5;

let gateOpen = false;
let gateRef  = null;

const matMetal  = new THREE.MeshStandardMaterial({ color: 0x1a1a1e, roughness: 0.5, metalness: 0.8 });
const matFrame  = new THREE.MeshStandardMaterial({ color: 0x111114, roughness: 0.6, metalness: 0.7 });
const matLocked = new THREE.MeshStandardMaterial({
  color: 0x8a0000, emissive: 0x8a0000, emissiveIntensity: 0.6,
  roughness: 0.3, metalness: 0.5,
});

// ── Portón procedural ────────────────────────────────────────────
function buildGate() {
  const group = new THREE.Group();

  // Marco superior
  const frameTop = new THREE.Mesh(new THREE.BoxGeometry(8, 0.3, 0.3), matFrame);
  frameTop.position.set(0, 4.15, 0);
  group.add(frameTop);

  // Pilares laterales
  [-3.85, 3.85].forEach(x => {
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.4, 4.3, 0.4), matFrame);
    pillar.position.set(x, 2.15, 0);
    pillar.castShadow = true;
    group.add(pillar);
  });

  // Hoja izquierda
  const leftDoor = new THREE.Group();
  leftDoor.name  = 'leftDoor';
  for (let i = 0; i < 6; i++) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.12, 3.8, 0.12), matMetal);
    bar.position.set(-3.5 + i * 0.6, 2, 0);
    bar.castShadow = true;
    leftDoor.add(bar);
  }
  const horzL = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.12, 0.12), matMetal);
  horzL.position.set(-1.7, 3.2, 0);
  leftDoor.add(horzL);
  const horzL2 = horzL.clone();
  horzL2.position.set(-1.7, 0.8, 0);
  leftDoor.add(horzL2);
  leftDoor.position.x = -0.3;
  group.add(leftDoor);

  // Hoja derecha (espejo)
  const rightDoor = leftDoor.clone();
  rightDoor.name    = 'rightDoor';
  rightDoor.scale.x = -1;
  rightDoor.position.x = 0.3;
  group.add(rightDoor);

  // Candado
  const lockGroup = new THREE.Group();
  lockGroup.name  = 'lock';
  lockGroup.add(new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.3, 0.2), matLocked));
  const arch = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.04, 8, 12, Math.PI), matMetal);
  arch.position.y = 0.2;
  lockGroup.add(arch);
  lockGroup.position.set(0, 1.8, 0.15);
  group.add(lockGroup);

  // Luz roja de bloqueo
  const lockLight = new THREE.PointLight(0xff0000, 1.5, 5, 2);
  lockLight.name  = 'lockLight';
  lockLight.position.set(0, 2, 0.5);
  group.add(lockLight);

  group.traverse(o => {
    if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; }
  });

  return group;
}

// ── Crear portón ─────────────────────────────────────────────────
export function createGate(scene) {
  return new Promise(resolve => {
    const gate = buildGate();
    gate.position.set(0, 0, GATE_Z);
    scene.add(gate);
    gateRef = gate;
    resolve(gate);
  });
}

// ── Desbloquear portón ───────────────────────────────────────────
export function updateGate(gate, unlock) {
  if (!unlock || gateOpen) return;
  gateOpen = true;

  // Candado → verde
  const lock  = gate.getObjectByName('lock');
  const light = gate.getObjectByName('lockLight');
  if (lock) lock.traverse(m => {
    if (m.isMesh) m.material = new THREE.MeshStandardMaterial({
      color: 0x00cc44, emissive: 0x00cc44, emissiveIntensity: 0.8,
    });
  });
  if (light) { light.color.set(0x00ff44); light.intensity = 2.5; }

  // Animación de apertura
  const leftDoor  = gate.getObjectByName('leftDoor');
  const rightDoor = gate.getObjectByName('rightDoor');
  let t = 0;
  function animateOpen() {
    t += 0.016;
    const angle = Math.min(t * 1.2, 1) * (Math.PI * 0.7);
    if (leftDoor)  leftDoor.rotation.y  =  angle;
    if (rightDoor) rightDoor.rotation.y = -angle;
    if (t < 1) requestAnimationFrame(animateOpen);
  }
  requestAnimationFrame(animateOpen);
}

// ── Detectar cruce del portón ────────────────────────────────────
const _tmp = new THREE.Vector3();
export function checkGateCross(playerBody) {
  if (!gateOpen || !gateRef) return;
  _tmp.set(playerBody.position.x, 0, playerBody.position.z);
  if (_tmp.distanceTo(new THREE.Vector3(0, 0, GATE_Z)) < TRIGGER_DIST) {
    showWin();
  }
}