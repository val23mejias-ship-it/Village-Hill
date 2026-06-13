// src/collectibles.js — Objetos coleccionables 100% procedurales
import * as THREE from 'three';

const INTERACT_DIST = 3.5;

const ITEM_DEFS = [
  { x:  3.5, z: -14, label: 'Llave oxidada',    color: 0xc8860a },
  { x: -3.5, z: -32, label: 'Nota rasgada',     color: 0xe8e0c8 },
  { x:  2.5, z: -50, label: 'Amuleto maldito',  color: 0x6a3a8a },
];

let collectibles = [];
let nearestIdx   = -1;
const hint = document.getElementById('interact-hint');

// ── Geometría procedural por tipo ────────────────────────────────
function buildItemMesh(def, index) {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    color: def.color,
    roughness: 0.3,
    metalness: 0.7,
    emissive: def.color,
    emissiveIntensity: 0.4,
  });

  let mesh;
  if (index === 0) {
    // Llave — cilindro + esfera
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.4, 8), mat);
    const head = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.03, 8, 16), mat);
    head.position.y = 0.25;
    head.rotation.x = Math.PI / 2;
    body.castShadow = true;
    head.castShadow = true;
    group.add(body, head);
  } else if (index === 1) {
    // Nota — caja plana
    mesh = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.02, 0.4), mat);
    mesh.castShadow = true;
    group.add(mesh);
  } else {
    // Amuleto — octaedro
    mesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.18, 0), mat);
    mesh.castShadow = true;
    group.add(mesh);
  }

  // Anillo de brillo en la base
  const ringMat = new THREE.MeshStandardMaterial({
    color: def.color, emissive: def.color, emissiveIntensity: 0.6,
    transparent: true, opacity: 0.5,
  });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.02, 6, 20), ringMat);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = -0.3;
  group.add(ring);

  return group;
}

// ── Crear todos los coleccionables ───────────────────────────────
export async function createCollectibles(scene, state, onCollect) {

  collectibles = ITEM_DEFS.map((def, i) => {
    const mesh = buildItemMesh(def, i);

    // Luz de brillo
    const glow = new THREE.PointLight(def.color, 1.5, 3, 2);
    glow.position.set(0, 0.5, 0);
    mesh.add(glow);

    mesh.position.set(def.x, 0.6, def.z);
    scene.add(mesh);

    // Plataforma base
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

    item.t += 0.016;
    item.mesh.position.y = 0.6 + Math.sin(item.t * 1.8) * 0.12;
    item.mesh.rotation.y += 0.02;

    _tmp.copy(item.mesh.position);
    _tmp.y = pPos.y;
    const dist = pPos.distanceTo(_tmp);

    if (dist < INTERACT_DIST && dist < minDist) {
      minDist    = dist;
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