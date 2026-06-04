// src/gate.js — Portón de escape al final de la calle
import * as THREE from 'three';
import { showWin } from './main.js';
 
const GATE_Z        = -68;
const TRIGGER_DIST  = 3;
let   gateOpen      = false;
let   gateRef       = null;
let   playerRef     = null;
 
const matMetal  = new THREE.MeshStandardMaterial({ color: 0x1a1a1e, roughness: 0.5, metalness: 0.8 });
const matFrame  = new THREE.MeshStandardMaterial({ color: 0x111114, roughness: 0.6, metalness: 0.7 });
const matLocked = new THREE.MeshStandardMaterial({
  color: 0x8a0000, emissive: 0x8a0000, emissiveIntensity: 0.6,
  roughness: 0.3, metalness: 0.5,
});
 
function buildGateMesh() {
  const group = new THREE.Group();
 
  // ── Marco ──
  const frameTop  = new THREE.Mesh(new THREE.BoxGeometry(8, 0.3, 0.3), matFrame);
  frameTop.position.set(0, 4.15, 0);
  group.add(frameTop);
 
  [-3.85, 3.85].forEach(x => {
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.4, 4.3, 0.4), matFrame);
    pillar.position.set(x, 2.15, 0);
    pillar.castShadow = true;
    group.add(pillar);
  });
 
  // ── Hoja izquierda ──
  const leftDoor = new THREE.Group();
  leftDoor.name = 'leftDoor';
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
  horzL2.position.y = 0.8;
  leftDoor.add(horzL2);
 
  // Pivote en borde derecho (x = -0.3)
  leftDoor.position.x = -0.3;
  group.add(leftDoor);
 
  // ── Hoja derecha ──
  const rightDoor = leftDoor.clone();
  rightDoor.name = 'rightDoor';
  rightDoor.scale.x = -1;
  rightDoor.position.x = 0.3;
  group.add(rightDoor);
 
  // ── Candado ──
  const lockGroup = new THREE.Group();
  lockGroup.name = 'lock';
  const lockBody = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.3, 0.2), matLocked);
  lockGroup.add(lockBody);
  const lockArch = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.04, 8, 12, Math.PI), matMetal);
  lockArch.position.y = 0.2;
  lockGroup.add(lockArch);
  lockGroup.position.set(0, 1.8, 0.15);
  group.add(lockGroup);
 
  // ── Luz de bloqueo ──
  const lockLight = new THREE.PointLight(0xff0000, 1.5, 5, 2);
  lockLight.name = 'lockLight';
  lockLight.position.set(0, 2, 0.5);
  group.add(lockLight);
 
  // Sombras
  group.traverse(obj => {
    if (obj.isMesh) { obj.castShadow = true; obj.receiveShadow = true; }
  });
 
  group.position.set(0, 0, GATE_Z);
  return group;
}
 
export function createGate(scene, state) {
  const gate = buildGateMesh();
  scene.add(gate);
  gateRef = gate;
  return gate;
}
 
// Llamado desde main cuando se recogen los 3 objetos
export function updateGate(gate, unlock) {
  if (!unlock || gateOpen) return;
  gateOpen = true;
 
  // Cambiar candado a verde
  const lock  = gate.getObjectByName('lock');
  const light = gate.getObjectByName('lockLight');
  if (lock)  lock.traverse(m => { if (m.isMesh) m.material = new THREE.MeshStandardMaterial({ color: 0x00cc44, emissive: 0x00cc44, emissiveIntensity: 0.7 }); });
  if (light) { light.color.set(0x00ff44); light.intensity = 2; }
 
  // Animar apertura de puertas
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
 
  // Registrar para detección de cruce
  gateOpen = true;
}
 
// Llamado cada frame desde main para detectar cruce
let _tmp = new THREE.Vector3();
export function checkGateCross(playerBody) {
  if (!gateOpen || !gateRef) return;
  _tmp.set(playerBody.position.x, 0, playerBody.position.z);
  const dist = _tmp.distanceTo(new THREE.Vector3(0, 0, GATE_Z));
  if (dist < TRIGGER_DIST) {
    showWin();
  }
}
 