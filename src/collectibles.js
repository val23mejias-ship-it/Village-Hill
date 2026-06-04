// src/collectibles.js — Objetos coleccionables
import * as THREE from 'three';
 
const PICKUP_DIST = 2.2;
const INTERACT_DIST = 3.5;
 
// Posiciones de los 3 objetos en el mapa
const ITEM_DEFS = [
  { x:  3.5, z: -14, label: 'Llave oxidada',  color: 0xc8860a },
  { x: -3.5, z: -32, label: 'Página arrugada', color: 0xe8e0c8 },
  { x:  2.5, z: -50, label: 'Amuleto roto',    color: 0x6a3a8a },
];
 
let collectibles = [];
let nearestIdx = -1;
const hint = document.getElementById('interact-hint');
 
// ── Geometrías de cada objeto ────────────────────────────────────
function buildItemMesh(def) {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    color: def.color,
    roughness: 0.4,
    metalness: 0.6,
    emissive: def.color,
    emissiveIntensity: 0.3,
  });
 
  let geo;
  switch (def.label) {
    case 'Llave oxidada':
      // Cuerpo de llave
      geo = new THREE.TorusGeometry(0.18, 0.05, 8, 16);
      const ring = new THREE.Mesh(geo, mat);
      ring.castShadow = true;
      group.add(ring);
      const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.4, 0.06), mat);
      shaft.position.y = -0.3;
      shaft.castShadow = true;
      group.add(shaft);
      const tooth1 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.06, 0.06), mat);
      tooth1.position.set(0.06, -0.42, 0);
      group.add(tooth1);
      const tooth2 = tooth1.clone();
      tooth2.position.y = -0.33;
      group.add(tooth2);
      break;
 
    case 'Página arrugada':
      geo = new THREE.PlaneGeometry(0.3, 0.4, 3, 3);
      // Distorsionar vértices para efecto arrugado
      const pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        pos.setZ(i, (Math.random() - 0.5) * 0.04);
      }
      geo.computeVertexNormals();
      const mat2 = new THREE.MeshStandardMaterial({
        color: def.color, roughness: 0.95, metalness: 0,
        emissive: def.color, emissiveIntensity: 0.1,
        side: THREE.DoubleSide,
      });
      const page = new THREE.Mesh(geo, mat2);
      page.castShadow = true;
      group.add(page);
      break;
 
    default: // Amuleto roto
      geo = new THREE.OctahedronGeometry(0.18, 0);
      const gem = new THREE.Mesh(geo, mat);
      gem.castShadow = true;
      group.add(gem);
      // Cadena (arco de puntos)
      const chainMat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.5, metalness: 0.8 });
      for (let i = 0; i < 8; i++) {
        const a = (i / 7) * Math.PI;
        const chainBead = new THREE.Mesh(new THREE.SphereGeometry(0.025, 5, 5), chainMat);
        chainBead.position.set(Math.cos(a) * 0.22, Math.sin(a) * 0.22 + 0.1, 0);
        group.add(chainBead);
      }
  }
 
  // Luz de relleno
  const glow = new THREE.PointLight(def.color, 1.5, 3, 2);
  glow.position.set(0, 0.3, 0);
  group.add(glow);
 
  return group;
}
 
// ── Crear todos los collectibles ─────────────────────────────────
export function createCollectibles(scene, state, onCollect) {
  collectibles = ITEM_DEFS.map((def, i) => {
    const mesh = buildItemMesh(def);
    mesh.position.set(def.x, 0.6, def.z);
    scene.add(mesh);
 
    // Plataforma base
    const baseMat = new THREE.MeshStandardMaterial({
      color: def.color, emissive: def.color, emissiveIntensity: 0.08,
      roughness: 1,
    });
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 0.06, 12), baseMat);
    base.position.set(def.x, 0.03, def.z);
    scene.add(base);
 
    return {
      mesh,
      base,
      def,
      index: i,
      collected: false,
      t: Math.random() * Math.PI * 2,
    };
  });
 
  // Tecla E para recoger
  window.addEventListener('keydown', e => {
    if (e.code === 'KeyE' && nearestIdx >= 0) {
      const item = collectibles[nearestIdx];
      if (!item.collected) {
        collectItem(item, scene, onCollect);
      }
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
 
  // Efecto de recogida — partículas sencillas
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
 
export function updateCollectibles(items, player, camera) {
  const pPos = player.body.position;
  nearestIdx = -1;
  let minDist = Infinity;
 
  items.forEach(item => {
    if (item.collected) return;
 
    // Animación flotante + rotación
    item.t += 0.016;
    item.mesh.position.y = 0.6 + Math.sin(item.t * 1.8) * 0.12;
    item.mesh.rotation.y += 0.02;
 
    // Distancia al jugador
    _tmp.copy(item.mesh.position);
    _tmp.y = pPos.y;
    const dist = pPos.distanceTo(_tmp);
 
    if (dist < INTERACT_DIST && dist < minDist) {
      minDist = dist;
      nearestIdx = item.index;
    }
  });
 
  // Mostrar/ocultar hint
  if (nearestIdx >= 0 && minDist < INTERACT_DIST) {
    hint.textContent = `[ E ] Recoger — ${collectibles[nearestIdx].def.label}`;
    hint.classList.add('visible');
  } else {
    hint.classList.remove('visible');
  }
}
 