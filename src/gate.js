// src/gate.js — Portón de escape con modelo porton.glb
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { showWin } from './main.js';

const loader      = new GLTFLoader();
const GATE_Z      = -68;
const TRIGGER_DIST = 3.5;

let gateOpen = false;
let gateRef  = null;

// Materiales para portón procedural de respaldo
const matMetal  = new THREE.MeshStandardMaterial({ color: 0x1a1a1e, roughness: 0.5, metalness: 0.8 });
const matFrame  = new THREE.MeshStandardMaterial({ color: 0x111114, roughness: 0.6, metalness: 0.7 });
const matLocked = new THREE.MeshStandardMaterial({
  color: 0x8a0000, emissive: 0x8a0000, emissiveIntensity: 0.6,
  roughness: 0.3, metalness: 0.5,
});

// ── Portón procedural de respaldo ────────────────────────────────
function buildFallbackGate() {
  const group = new THREE.Group();

  // Marco
  const frameTop = new THREE.Mesh(new THREE.BoxGeometry(8, 0.3, 0.3), matFrame);
  frameTop.position.set(0, 4.15, 0);
  group.add(frameTop);

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
  leftDoor.add(Object.assign(horzL.clone(), { position: new THREE.Vector3(-1.7, 0.8, 0) }));
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
  const lockLight  = new THREE.PointLight(0xff0000, 1.5, 5, 2);
  lockLight.name   = 'lockLight';
  lockLight.position.set(0, 2, 0.5);
  group.add(lockLight);

  group.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return group;
}

// ── Crear portón ─────────────────────────────────────────────────
export function createGate(scene) {
  return new Promise(resolve => {
    loader.load(
      'models/porton.glb',
      gltf => {
        const model = gltf.scene;
        model.scale.setScalar(1); // ajusta si es necesario
        model.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });

        // Nombrar las hojas del modelo si existen (depende del modelo)
        // Si tu portón ya tiene animación, puedes activarla aquí.
        // Si no, se usará la apertura procedural buscando mitad izquierda/derecha.

        // Añadir candado y luz encima del modelo GLB
        const lockGroup = new THREE.Group();
        lockGroup.name  = 'lock';
        lockGroup.add(new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.3, 0.2), matLocked));
        const arch = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.04, 8, 12, Math.PI), matMetal);
        arch.position.y = 0.2;
        lockGroup.add(arch);
        lockGroup.position.set(0, 2.5, 0.2);
        model.add(lockGroup);

        const lockLight = new THREE.PointLight(0xff0000, 1.5, 6, 2);
        lockLight.name  = 'lockLight';
        lockLight.position.set(0, 3, 0.5);
        model.add(lockLight);

        model.position.set(0, 0, GATE_Z);
        scene.add(model);
        gateRef = model;
        resolve(model);
      },
      undefined,
      () => {
        console.warn('porton.glb no encontrado, usando portón procedural.');
        const fallback = buildFallbackGate();
        fallback.position.set(0, 0, GATE_Z);
        scene.add(fallback);
        gateRef = fallback;
        resolve(fallback);
      }
    );
  });
}

// ── Desbloquear portón ───────────────────────────────────────────
export function updateGate(gate, unlock) {
  if (!unlock || gateOpen) return;
  gateOpen = true;

  // Candado → verde
  const lock  = gate.getObjectByName('lock');
  const light = gate.getObjectByName('lockLight');
  if (lock)  lock.traverse(m => {
    if (m.isMesh) m.material = new THREE.MeshStandardMaterial({
      color: 0x00cc44, emissive: 0x00cc44, emissiveIntensity: 0.8
    });
  });
  if (light) { light.color.set(0x00ff44); light.intensity = 2.5; }

  // Animación de apertura — busca hojas nombradas o anima todo el modelo
  const leftDoor  = gate.getObjectByName('leftDoor')  || gate.getObjectByName('Left')  || null;
  const rightDoor = gate.getObjectByName('rightDoor') || gate.getObjectByName('Right') || null;

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