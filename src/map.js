// src/map.js — Construcción del mapa con geometría procedural
// (No requiere archivos .glb externos; casas y árboles son geometría Three.js)
import * as THREE from 'three';
 
// ── Materiales compartidos ───────────────────────────────────────
const matWall    = new THREE.MeshStandardMaterial({ color: 0x2a2520, roughness: 0.95, metalness: 0 });
const matRoof    = new THREE.MeshStandardMaterial({ color: 0x1a1512, roughness: 0.9 });
const matGround  = new THREE.MeshStandardMaterial({ color: 0x0c0c0e, roughness: 1 });
const matStreet  = new THREE.MeshStandardMaterial({ color: 0x111116, roughness: 0.9 });
const matWindow  = new THREE.MeshStandardMaterial({ color: 0x1a2a1a, roughness: 0.2, metalness: 0.1,
                                                     emissive: 0x0a1a08, emissiveIntensity: 0.4 });
const matDoor    = new THREE.MeshStandardMaterial({ color: 0x150f0a, roughness: 0.95 });
const matBark    = new THREE.MeshStandardMaterial({ color: 0x1a1208, roughness: 1 });
const matLeaves  = new THREE.MeshStandardMaterial({ color: 0x0a1a08, roughness: 1, side: THREE.DoubleSide });
const matFence   = new THREE.MeshStandardMaterial({ color: 0x1c1410, roughness: 1 });
 
// ── Helpers ──────────────────────────────────────────────────────
function box(w, h, d, mat) {
  return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
}
 
// ── Casa procedural ──────────────────────────────────────────────
function buildHouse(x, z, rotY = 0) {
  const group = new THREE.Group();
 
  // Cuerpo
  const body = box(5, 3.5, 5, matWall);
  body.position.set(0, 1.75, 0);
  body.castShadow = body.receiveShadow = true;
  group.add(body);
 
  // Techo (pirámide con ConeGeometry)
  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(4, 2.2, 4),
    matRoof
  );
  roof.rotation.y = Math.PI / 4;
  roof.position.set(0, 3.5 + 1.1, 0);
  roof.castShadow = true;
  group.add(roof);
 
  // Ventanas
  const winGeo = new THREE.BoxGeometry(0.8, 0.7, 0.05);
  [[1.2, 2, 2.53], [-1.2, 2, 2.53],
   [1.2, 2, -2.53], [-1.2, 2, -2.53]].forEach(([wx, wy, wz]) => {
    const win = new THREE.Mesh(winGeo, matWindow);
    win.position.set(wx, wy, wz);
    group.add(win);
  });
 
  // Puerta
  const door = box(0.9, 1.8, 0.05, matDoor);
  door.position.set(0, 0.9, 2.53);
  group.add(door);
 
  // Marco de puerta
  const frameV = box(0.1, 1.9, 0.08, matFence);
  [-0.5, 0.5].forEach(dx => {
    const f = frameV.clone();
    f.position.set(dx, 0.95, 2.53);
    group.add(f);
  });
 
  group.position.set(x, 0, z);
  group.rotation.y = rotY;
  return group;
}
 
// ── Árbol procedural ────────────────────────────────────────────
function buildTree(x, z, scale = 1) {
  const group = new THREE.Group();
  const h = (3 + Math.random() * 3) * scale;
 
  // Tronco
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15 * scale, 0.25 * scale, h, 7),
    matBark
  );
  trunk.position.y = h / 2;
  trunk.castShadow = true;
  group.add(trunk);
 
  // Copa (3 niveles)
  for (let i = 0; i < 3; i++) {
    const r  = (2.2 - i * 0.5) * scale;
    const hy = (1.8 - i * 0.4) * scale;
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(r, hy, 7),
      matLeaves
    );
    cone.position.y = h + i * (hy * 0.55);
    cone.castShadow = true;
    group.add(cone);
  }
 
  group.position.set(x, 0, z);
  group.rotation.y = Math.random() * Math.PI * 2;
  return group;
}
 
// ── Poste de luz ────────────────────────────────────────────────
function buildLampPost(x, z) {
  const group = new THREE.Group();
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.08, 5, 6),
    matFence
  );
  pole.position.y = 2.5;
  pole.castShadow = true;
  group.add(pole);
 
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.06, 0.06), matFence);
  arm.position.set(0.4, 5, 0);
  group.add(arm);
 
  const bulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 8, 8),
    new THREE.MeshStandardMaterial({ emissive: 0xffdd88, emissiveIntensity: 2, color: 0x000000 })
  );
  bulb.position.set(0.8, 5, 0);
  group.add(bulb);
 
  // Luz puntual
  const light = new THREE.PointLight(0xffcc66, 2.5, 14, 2);
  light.position.set(0.8, 4.9, 0);
  light.castShadow = true;
  light.shadow.mapSize.set(256, 256);
  group.add(light);
 
  group.position.set(x, 0, z);
  return group;
}
 
// ── Valla / cerca ───────────────────────────────────────────────
function buildFenceRow(x1, z1, x2, z2) {
  const group = new THREE.Group();
  const dx = x2 - x1, dz = z2 - z1;
  const len = Math.sqrt(dx * dx + dz * dz);
  const angle = Math.atan2(dx, dz);
  const posts = Math.floor(len / 1.2);
 
  for (let i = 0; i <= posts; i++) {
    const t = i / posts;
    const post = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 1.1, 0.08),
      matFence
    );
    post.position.set(x1 + dx * t, 0.55, z1 + dz * t);
    post.castShadow = true;
    group.add(post);
  }
 
  // Travesaño superior
  const rail = new THREE.Mesh(new THREE.BoxGeometry(len, 0.06, 0.06), matFence);
  rail.position.set((x1 + x2) / 2, 0.9, (z1 + z2) / 2);
  rail.rotation.y = angle;
  group.add(rail);
 
  return group;
}
 
// ── Suelo ───────────────────────────────────────────────────────
function buildGround(scene) {
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 200),
    matGround
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
}
 
// ── Calle central ───────────────────────────────────────────────
function buildStreet(scene) {
  const street = new THREE.Mesh(
    new THREE.PlaneGeometry(7, 120),
    matStreet
  );
  street.rotation.x = -Math.PI / 2;
  street.position.y = 0.01;
  street.position.z = -25;
  street.receiveShadow = true;
  scene.add(street);
 
  // Línea central discontinua
  const lineMat = new THREE.MeshStandardMaterial({ color: 0x333330, roughness: 1 });
  for (let i = 0; i < 20; i++) {
    const line = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 1.8), lineMat);
    line.rotation.x = -Math.PI / 2;
    line.position.set(0, 0.015, -5 + i * -5.5);
    scene.add(line);
  }
}
 
// ── Exportar ─────────────────────────────────────────────────────
export function buildMap(scene) {
  buildGround(scene);
  buildStreet(scene);
 
  // ── Casas ── (lado izquierdo z negativo = más adentro)
  const housePositions = [
    // izquierda
    { x: -8,  z:  5,  r: Math.PI * 0.5 },
    { x: -8,  z: -8,  r: Math.PI * 0.5 },
    { x: -8,  z: -22, r: Math.PI * 0.5 },
    { x: -8,  z: -36, r: Math.PI * 0.5 },
    { x: -8,  z: -50, r: Math.PI * 0.5 },
    // derecha
    { x:  8,  z:  5,  r: -Math.PI * 0.5 },
    { x:  8,  z: -8,  r: -Math.PI * 0.5 },
    { x:  8,  z: -22, r: -Math.PI * 0.5 },
    { x:  8,  z: -36, r: -Math.PI * 0.5 },
    { x:  8,  z: -50, r: -Math.PI * 0.5 },
  ];
 
  housePositions.forEach(({ x, z, r }) => {
    scene.add(buildHouse(x, z, r));
  });
 
  // ── Postes de luz ──
  [-15, -30, -45].forEach(z => {
    scene.add(buildLampPost(-4, z));
    scene.add(buildLampPost( 4, z));
  });
 
  // ── Vallas ──
  scene.add(buildFenceRow(-3.5, 15, -3.5, -65));
  scene.add(buildFenceRow( 3.5, 15,  3.5, -65));
 
  // ── Bosque perimetral ──
  const forestPositions = [];
  // Izquierda
  for (let z = 20; z > -85; z -= 3.5) {
    forestPositions.push({ x: -14 - Math.random() * 8, z });
    forestPositions.push({ x: -18 - Math.random() * 6, z: z + 1.5 });
  }
  // Derecha
  for (let z = 20; z > -85; z -= 3.5) {
    forestPositions.push({ x: 14 + Math.random() * 8, z });
    forestPositions.push({ x: 18 + Math.random() * 6, z: z + 1.5 });
  }
  // Fondo
  for (let x = -22; x < 22; x += 3) {
    forestPositions.push({ x, z: -82 - Math.random() * 5 });
    forestPositions.push({ x: x + 1.5, z: -88 - Math.random() * 4 });
  }
  // Frente
  for (let x = -22; x < -4; x += 3.5) {
    forestPositions.push({ x, z: 18 + Math.random() * 4 });
  }
  for (let x = 4; x < 22; x += 3.5) {
    forestPositions.push({ x, z: 18 + Math.random() * 4 });
  }
 
  forestPositions.forEach(({ x, z }) => {
    const s = 0.7 + Math.random() * 0.8;
    scene.add(buildTree(x, z, s));
  });
 
  // ── Rocas decorativas ──
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1c, roughness: 0.9 });
  [[6, 2], [-5, -15], [7, -28], [-6, -42], [5, -55]].forEach(([x, z]) => {
    const r = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.3 + Math.random() * 0.4, 0),
      rockMat
    );
    r.position.set(x + (Math.random() - 0.5), 0.2, z + (Math.random() - 0.5));
    r.rotation.set(Math.random(), Math.random(), Math.random());
    r.castShadow = r.receiveShadow = true;
    scene.add(r);
  });
}
 