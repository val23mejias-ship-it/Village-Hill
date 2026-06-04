// src/collectibles.js — Objetos coleccionables con modelos GLB
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const loader = new GLTFLoader();
const INTERACT_DIST = 3.5;

// Definición de los 3 objetos — nombres de archivo y posiciones
const ITEM_DEFS = [
  { x:  3.5, z: -14, label: 'Objeto 1', model: 'models/objeto1.glb', color: 0xc8860a, scale: 0.3 },
  { x: -3.5, z: -32, label: 'Objeto 2', model: 'models/objeto2.glb', color: 0xe8e0c8, scale: 0.3 },
  { x:  2.5, z: -50, label: 'Objeto 3', model: 'models/objeto3.glb', color: 0x6a3a8a, scale: 0.3 },
];

let collectibles = [];
let nearestIdx   = -1;
const hint = document.getElementById('interact-hint');

// ── Carga un modelo GLB; si falla usa geometría de respaldo ──────
function loadItemMesh(def) {
  return new Promise(resolve => {
    loader.load(
      def.model,
      gltf => {
        const obj = gltf.scene;
        obj.scale.setScalar(def.scale);
        obj.traverse(m => { if (m.isMesh) m.castShadow = true; });
        resolve(obj);
      },
      undefined,
      () => {
        // Fallback: geometría procedural si no carga el GLB
        console.warn(`No se cargó ${def.model}, usando fallback.`);
        resolve(buildFallbackMesh(def));
      }
    );
  });
}

// Geometría simple de respaldo (por si falta el .glb)
function buildFallbackMesh(def) {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    color: def.color, roughness: 0.4, metalness: 0.6,
    emissive: def.color, emissiveIntensity: 0.3,
  });
  const mesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.2, 0), mat);
  mesh.castShadow = true;
  group.add(mesh);
  return group;
}

// ── Crear todos los coleccionables ───────────────────────────────
export async function createCollectibles(scene, state, onCollect) {

  const meshes = await Promise.all(ITEM_DEFS.map(def => loadItemMesh(def)));

  collectibles = ITEM_DEFS.map((def, i) => {
    const mesh = meshes[i];

    // Luz de brillo
    const glow = new THREE.PointLight(def.color, 1.5, 3, 2);
    glow.position.set(0, 0.5, 0);
    mesh.add(glow);

    mesh.position.set(def.x, 0.6, def.z);
    scene.add(mesh);

    // Plataforma base decorativa
    const baseMat = new THREE.MeshStandardMaterial({
      color: def.color, emissive: def.color, emissiveIntensity: 0.08, roughness: 1,
    });
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 0.06, 12), baseMat);
    base.position.set(def.x, 0.03, def.z);
    scene.add(base);

    return { mesh, base, def, index: i, collected: false, t: Math.random() * Math.PI * 2 };
  });

  // Tecla E para recoger
  window.addEventListener('keydown', e => {
    if (e.code === 'KeyE' && nearestIdx >= 0) {
      const item = collectibles[nearestIdx];
      if (!item.collected) collectItem(item, scene, onCollect);
    }
  });

  return collectibles;
}

function collectItem(item, scene, onCollect) {
  item.collected = true;
  scene.remove(item.mesh);
  scene.remove(item.base);
  nearestIdx = -1;
  hint.classList.remove('visible');
  onCollect(item.index);
  spawnPickupEffect(scene, item.mesh.position.clone(), item.def.color);
}

function spawnPickupEffect(scene, pos, color) {
  const matP = new THREE.MeshBasicMaterial({ color });
  const particles = [];
  for (let i = 0; i < 12; i++) {
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.04, 4, 4), matP);
    p.position.copy(pos);
    const vel = new THREE.Vector3(
      (Math.random() - 0.5) * 3,
      Math.random() * 4 + 1,
      (Math.random() - 0.5) * 3
    );
    scene.add(p);
    particles.push({ mesh: p, vel, life: 0.6 });
  }
  let last = performance.now();
  function tick() {
    const now = performance.now();
    const dt  = (now - last) / 1000;
    last = now;
    let alive = false;
    particles.forEach(p => {
      if (p.life > 0) {
        p.life -= dt;
        p.vel.y -= 8 * dt;
        p.mesh.position.addScaledVector(p.vel, dt);
        p.mesh.scale.setScalar(Math.max(0, p.life / 0.6));
        alive = true;
      } else {
        scene.remove(p.mesh);
      }
    });
    if (alive) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

// ── Update loop ──────────────────────────────────────────────────
const _tmp = new THREE.Vector3();

export function updateCollectibles(items, player) {
  const pPos = player.body.position;
  nearestIdx = -1;
  let minDist = Infinity;

  items.forEach(item => {
    if (item.collected) return;

    // Flotar y rotar
    item.t += 0.016;
    item.mesh.position.y = 0.6 + Math.sin(item.t * 1.8) * 0.12;
    item.mesh.rotation.y += 0.02;

    // Distancia al jugador
    _tmp.copy(item.mesh.position);
    _tmp.y = pPos.y;
    const dist = pPos.distanceTo(_tmp);

    if (dist < INTERACT_DIST && dist < minDist) {
      minDist  = dist;
      nearestIdx = item.index;
    }
  });

  if (nearestIdx >= 0) {
    hint.textContent = `[ E ] Recoger — ${collectibles[nearestIdx].def.label}`;
    hint.classList.add('visible');
  } else {
    hint.classList.remove('visible');
  }
}