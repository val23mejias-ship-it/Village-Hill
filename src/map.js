// src/map.js — Mapa completo con geometría procedural (sin modelos GLB)
import * as THREE from 'three';

// ── Materiales globales ──────────────────────────────────────────
const matWall1  = new THREE.MeshLambertMaterial({ color: 0x1a1614 });
const matWall2  = new THREE.MeshLambertMaterial({ color: 0x161214 });
const matWall3  = new THREE.MeshLambertMaterial({ color: 0x121418 });
const matRoof1  = new THREE.MeshLambertMaterial({ color: 0x0e0a08 });
const matRoof2  = new THREE.MeshLambertMaterial({ color: 0x100c0a });
const matTree   = new THREE.MeshLambertMaterial({ color: 0x0a1a08 });
const matTrunk  = new THREE.MeshLambertMaterial({ color: 0x1a100a });
const matRock   = new THREE.MeshLambertMaterial({ color: 0x1a1a1c });
const matGround = new THREE.MeshLambertMaterial({ color: 0x0c0c0e });
const matStreet = new THREE.MeshLambertMaterial({ color: 0x111116 });
const matFence  = new THREE.MeshLambertMaterial({ color: 0x1c1410 });
const matWindow = new THREE.MeshLambertMaterial({ 
  color: 0xffcc44, 
  emissive: 0xffcc44, 
  emissiveIntensity: 0.4 
});

// ── Helpers de sombras ───────────────────────────────────────────
function shadows(mesh, cast = true, receive = true) {
  mesh.castShadow = cast;
  mesh.receiveShadow = receive;
  return mesh;
}

// ── Casa procedural ──────────────────────────────────────────────
function buildHouse(type = 0) {
  const g = new THREE.Group();

  const w = type === 0 ? 5 : type === 1 ? 4.5 : 6;
  const h = type === 0 ? 4 : type === 1 ? 5   : 3.5;
  const d = type === 0 ? 6 : type === 1 ? 5   : 7;

  const wallMats = [matWall1, matWall2, matWall3];
  const roofMats = [matRoof1, matRoof2, matRoof1];

  // Cuerpo principal
  const body = shadows(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMats[type]));
  body.position.y = h / 2;
  g.add(body);

  // Techo tipo pirámide / prisma
  if (type === 1) {
    // techo puntiagudo
    const roof = shadows(new THREE.Mesh(new THREE.ConeGeometry(w * 0.78, 2, 4), roofMats[type]));
    roof.position.y = h + 1;
    roof.rotation.y = Math.PI / 4;
    g.add(roof);
  } else {
    // techo inclinado (prisma)
    const roofGeo = new THREE.CylinderGeometry(0, w * 0.7, 2.2, 4, 1);
    const roof = shadows(new THREE.Mesh(roofGeo, roofMats[type]));
    roof.position.y = h + 1.1;
    roof.rotation.y = Math.PI / 4;
    g.add(roof);
  }

  // Ventanas con emisión
  const winGeo = new THREE.PlaneGeometry(0.7, 0.7);
  const winPositions = [
    { x: -w / 2 - 0.01, y: h * 0.6, z:  0.8, ry: -Math.PI / 2 },
    { x: -w / 2 - 0.01, y: h * 0.6, z: -0.8, ry: -Math.PI / 2 },
    { x:  w / 2 + 0.01, y: h * 0.6, z:  0.8, ry:  Math.PI / 2 },
    { x:  w / 2 + 0.01, y: h * 0.6, z: -0.8, ry:  Math.PI / 2 },
  ];
  winPositions.forEach(({ x, y, z, ry }) => {
    const win = new THREE.Mesh(winGeo, matWindow);
    win.position.set(x, y, z);
    win.rotation.y = ry;
    g.add(win);
  });

  // Puerta
  const door = shadows(new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.8, 0.1), matFence));
  door.position.set(0, 0.9, d / 2 + 0.05);
  g.add(door);

  return g;
}

// ── Árbol procedural ─────────────────────────────────────────────
function buildTree(scale = 1) {
  const g = new THREE.Group();

  const trunkH = 1.5 + Math.random() * 0.5;
  const trunk  = shadows(new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, trunkH, 6), matTrunk));
  trunk.position.y = trunkH / 2;
  g.add(trunk);

  // 3 capas de follaje
  [1.8, 2.6, 3.2].forEach((y, i) => {
    const r   = 1.2 - i * 0.25;
    const fol = shadows(new THREE.Mesh(new THREE.ConeGeometry(r, 1.4, 7), matTree));
    fol.position.y = trunkH + y - 1;
    g.add(fol);
  });

  g.scale.setScalar(scale);
  return g;
}

// ── Poste de luz ─────────────────────────────────────────────────
function buildLampPost(x, z) {
  const g    = new THREE.Group();
  const pole = shadows(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 5, 6), matFence));
  pole.position.y = 2.5;
  g.add(pole);

  const arm = shadows(new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.06, 0.06), matFence));
  arm.position.set(0.4, 5, 0);
  g.add(arm);

  const bulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 8, 8),
    new THREE.MeshStandardMaterial({ emissive: 0xffdd88, emissiveIntensity: 2, color: 0x000000 })
  );
  bulb.position.set(0.8, 5, 0);
  g.add(bulb);

  const light = new THREE.PointLight(0xffcc66, 2.5, 14, 2);
  light.position.set(0.8, 4.9, 0);
  light.castShadow = false;
  light.shadow.mapSize.set(256, 256);
  g.add(light);

  g.position.set(x, 0, z);
  return g;
}

// ── Valla ────────────────────────────────────────────────────────
function buildFenceRow(x1, z1, x2, z2) {
  const g  = new THREE.Group();
  const dx = x2 - x1, dz = z2 - z1;
  const len = Math.sqrt(dx * dx + dz * dz);
  const posts = Math.floor(len / 1.2);
  for (let i = 0; i <= posts; i++) {
    const t    = i / posts;
    const post = shadows(new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.1, 0.08), matFence));
    post.position.set(x1 + dx * t, 0.55, z1 + dz * t);
    g.add(post);
  }
  const rail = shadows(new THREE.Mesh(new THREE.BoxGeometry(len, 0.06, 0.06), matFence));
  rail.position.set((x1 + x2) / 2, 0.9, (z1 + z2) / 2);
  rail.rotation.y = Math.atan2(dx, dz);
  g.add(rail);
  return g;
}

// ── Calle ────────────────────────────────────────────────────────
function addStreet(scene, cx, cz, w, h) {
  const s = shadows(new THREE.Mesh(new THREE.PlaneGeometry(w, h), matStreet), false, true);
  s.rotation.x = -Math.PI / 2;
  s.position.set(cx, 0.01, cz);
  scene.add(s);
}

function addDashes(scene, startZ, steps, x = 0) {
  const mat = new THREE.MeshStandardMaterial({ color: 0x333330, roughness: 1 });
  for (let i = 0; i < steps; i++) {
    const line = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 1.8), mat);
    line.rotation.x = -Math.PI / 2;
    line.position.set(x, 0.015, startZ - i * 5.5);
    scene.add(line);
  }
}

// ── Construcción del mapa ────────────────────────────────────────
export async function buildMap(scene) {

  // Suelo
  const ground = shadows(new THREE.Mesh(new THREE.PlaneGeometry(350, 350), matGround), false, true);
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  // Calles
  addStreet(scene, 0,   -55, 9, 170);  addDashes(scene, 8, 28);
  addStreet(scene, -25, -55, 8, 170);  addDashes(scene, 8, 28, -25);
  addStreet(scene, 25,  -55, 8, 170);  addDashes(scene, 8, 28, 25);
  [-20, -50, -80, -108].forEach(z => addStreet(scene, 0, z, 62, 8));

  // Casas
  let typeIdx = 0;
  const house = (x, z, rotY = 0) => {
    const h = buildHouse(typeIdx++ % 3);
    h.position.set(x, 0, z);
    h.rotation.y = rotY;
    scene.add(h);
  };

  for (let z = -8; z >= -108; z -= 12) {
    house(-13, z, -Math.PI / 2);
    house( 13, z,  Math.PI / 2);
    house(-37, z, -Math.PI / 2);
    house(-15, z,  Math.PI / 2);
    house( 15, z, -Math.PI / 2);
    house( 37, z,  Math.PI / 2);
  }
  [-18, -48, -78, -106].forEach(z => {
    house(-13, z, 0);         house( 13, z, Math.PI);
    house(-37, z, 0);         house( 37, z, Math.PI);
  });

  // Postes de luz
  [-20, -60, -100].forEach(z => {
    scene.add(buildLampPost(0, z));
  });

  // Vallas
  scene.add(buildFenceRow(-4,  14, -4,  -125));
  scene.add(buildFenceRow( 4,  14,  4,  -125));

  // Árboles
const treePos = [];
for (let z = 20; z > -130; z -= 8) {
    treePos.push({ x: -46, z });
    treePos.push({ x:  46, z });
}
for (let x = -46; x < 46; x += 8) {
    treePos.push({ x, z: -125 });
}

treePos.forEach(({ x, z }) => {
    const t = buildTree(0.8 + Math.random() * 0.5);
    t.position.set(x, 0, z);
    t.rotation.y = Math.random() * Math.PI * 2;
    scene.add(t);
});

  // Rocas
  [
    [6,-5],[-5,-18],[7,-33],[-6,-47],[5,-62],[3,-80],[-4,-90],[8,-100],
    [20,-15],[-20,-28],[20,-55],[-20,-70],[20,-95],[-20,-110],
    [-28,-38],[28,-52],[-28,-75],[28,-88],
  ].forEach(([x, z]) => {
    const r = shadows(new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.3 + Math.random() * 0.4, 0), matRock));
    r.position.set(x + (Math.random() - 0.5), 0.2, z + (Math.random() - 0.5));
    r.rotation.set(Math.random(), Math.random(), Math.random());
    scene.add(r);
  });
}