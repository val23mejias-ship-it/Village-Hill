// src/map.js — Mapa ampliado con calles laterales y más casas
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const loader = new GLTFLoader();
let casa1Base, casa2Base, casa3Base, arbol1Base, arbol2Base;

const matGround = new THREE.MeshStandardMaterial({ color: 0x0c0c0e, roughness: 1 });
const matStreet = new THREE.MeshStandardMaterial({ color: 0x111116, roughness: 0.9 });
const matFence  = new THREE.MeshStandardMaterial({ color: 0x1c1410, roughness: 1 });

function loadModel(path) {
  return new Promise(resolve => {
    loader.load(path, gltf => resolve(gltf.scene), undefined, () => {
      console.warn(`No se cargó: ${path}`); resolve(null);
    });
  });
}

export async function loadModels() {
  [casa1Base, casa2Base, casa3Base, arbol1Base, arbol2Base] = await Promise.all([
    loadModel('models/casa1.glb'),
    loadModel('models/casa2.glb'),
    loadModel('models/casa3.glb'),
    loadModel('models/arbol1.glb'),
    loadModel('models/arbol2.glb'),
  ]);
}

function enableShadows(obj) {
  obj.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
}

function placeModel(base, x, z, rotY = 0, scale = 1) {
  if (!base) return null;
  const clone = base.clone();
  clone.position.set(x, 0, z);
  clone.rotation.y = rotY;
  clone.scale.setScalar(scale);
  enableShadows(clone);
  return clone;
}

function buildLampPost(x, z) {
  const g    = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 5, 6), matFence);
  pole.position.y = 2.5; pole.castShadow = true; g.add(pole);
  const arm  = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.06, 0.06), matFence);
  arm.position.set(0.4, 5, 0); g.add(arm);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8),
    new THREE.MeshStandardMaterial({ emissive: 0xffdd88, emissiveIntensity: 2, color: 0x000000 }));
  bulb.position.set(0.8, 5, 0); g.add(bulb);
  const light = new THREE.PointLight(0xffcc66, 2.5, 14, 2);
  light.position.set(0.8, 4.9, 0); light.castShadow = true;
  light.shadow.mapSize.set(256, 256); g.add(light);
  g.position.set(x, 0, z);
  return g;
}

function buildFenceRow(x1, z1, x2, z2) {
  const g  = new THREE.Group();
  const dx = x2 - x1, dz = z2 - z1;
  const len = Math.sqrt(dx * dx + dz * dz);
  const posts = Math.floor(len / 1.2);
  for (let i = 0; i <= posts; i++) {
    const t = i / posts;
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.1, 0.08), matFence);
    post.position.set(x1 + dx * t, 0.55, z1 + dz * t);
    post.castShadow = true; g.add(post);
  }
  const rail = new THREE.Mesh(new THREE.BoxGeometry(len, 0.06, 0.06), matFence);
  rail.position.set((x1 + x2) / 2, 0.9, (z1 + z2) / 2);
  rail.rotation.y = Math.atan2(dx, dz); g.add(rail);
  return g;
}

function addStreet(scene, cx, cz, w, h) {
  const s = new THREE.Mesh(new THREE.PlaneGeometry(w, h), matStreet);
  s.rotation.x = -Math.PI / 2;
  s.position.set(cx, 0.01, cz);
  s.receiveShadow = true;
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

export async function buildMap(scene) {
  await loadModels();

  // ── Suelo ──────────────────────────────────────────────────────
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(350, 350), matGround);
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true;
  scene.add(ground);

  // ── Calles ─────────────────────────────────────────────────────
  // Calle principal (eje Z)
  addStreet(scene, 0,  -55, 9, 170);
  addDashes(scene, 8, 28);

  // Calle lateral izquierda
  addStreet(scene, -25, -55, 8, 170);
  addDashes(scene, 8, 28, -25);

  // Calle lateral derecha
  addStreet(scene, 25, -55, 8, 170);
  addDashes(scene, 8, 28, 25);

  // Cruces horizontales que conectan las 3 calles
  [-20, -50, -80, -108].forEach(z => {
    addStreet(scene, 0, z, 62, 8); // conecta izq-centro-der
  });

  // ── Casas ──────────────────────────────────────────────────────
  const SCALE   = 1;
  const bases   = [casa1Base, casa2Base, casa3Base].filter(Boolean);
  if (!bases.length) return;

  let idx = 0;
  const house = (x, z, r) => {
    const m = placeModel(bases[idx++ % bases.length], x, z, r, SCALE);
    if (m) scene.add(m);
  };

  // Calle principal — ambos lados (cada ~12 unidades)
  for (let z = -8; z >= -108; z -= 12) {
    house(-13, z, -Math.PI / 2);
    house( 13, z,  Math.PI / 2);
  }

  // Calle lateral izquierda — ambos lados
  for (let z = -8; z >= -108; z -= 12) {
    house(-37, z, -Math.PI / 2);
    house(-15, z,  Math.PI / 2);
  }

  // Calle lateral derecha — ambos lados
  for (let z = -8; z >= -108; z -= 12) {
    house( 15, z, -Math.PI / 2);
    house( 37, z,  Math.PI / 2);
  }

  // Casas extra en los fondos de cruce
  [-18, -48, -78, -106].forEach(z => {
    house(-13, z,  0);
    house( 13, z,  Math.PI);
    house(-37, z,  0);
    house( 37, z,  Math.PI);
  });

  // ── Postes de luz ───────────────────────────────────────────────
  [-12, -30, -50, -70, -90, -110].forEach(z => {
    scene.add(buildLampPost(-4, z));
    scene.add(buildLampPost( 4, z));
    scene.add(buildLampPost(-21, z));
    scene.add(buildLampPost(-29, z));
    scene.add(buildLampPost( 21, z));
    scene.add(buildLampPost( 29, z));
  });

  // ── Vallas en calle principal ───────────────────────────────────
  scene.add(buildFenceRow(-4,  14, -4,  -125));
  scene.add(buildFenceRow( 4,  14,  4,  -125));

  // ── Árboles ────────────────────────────────────────────────────
  const TREE_SCALE = 1;
  const trees = [arbol1Base, arbol2Base].filter(Boolean);

  if (trees.length) {
    const pos = [];
    // Perimetro oeste lejano
    for (let z = 20; z > -130; z -= 3.5) {
      pos.push({ x: -46 - Math.random() * 8, z });
      pos.push({ x: -50 - Math.random() * 5, z: z + 1.5 });
    }
    // Perimetro este lejano
    for (let z = 20; z > -130; z -= 3.5) {
      pos.push({ x: 46 + Math.random() * 8, z });
      pos.push({ x: 50 + Math.random() * 5, z: z + 1.5 });
    }
    // Fondo
    for (let x = -50; x < 50; x += 3) {
      pos.push({ x, z: -125 - Math.random() * 5 });
    }
    // Frente
    for (let x = -50; x < -5; x += 3) pos.push({ x, z: 18 + Math.random() * 4 });
    for (let x =   5; x <  50; x += 3) pos.push({ x, z: 18 + Math.random() * 4 });

    // Entre calles (interior)
    for (let z = 0; z > -120; z -= 6) {
      pos.push({ x: -44 + Math.random() * 5, z });
      pos.push({ x:  44 - Math.random() * 5, z });
    }

    pos.forEach(({ x, z }, i) => {
      const m = placeModel(
        trees[i % trees.length], x, z,
        Math.random() * Math.PI * 2,
        TREE_SCALE * (0.8 + Math.random() * 0.5)
      );
      if (m) scene.add(m);
    });
  }

  // ── Rocas ──────────────────────────────────────────────────────
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1c, roughness: 0.9 });
  [
    [6,-5],[-5,-18],[7,-33],[-6,-47],[5,-62],[3,-80],[-4,-90],[8,-100],
    [20,-15],[-20,-28],[20,-55],[-20,-70],[20,-95],[-20,-110],
    [-28,-38],[28,-52],[-28,-75],[28,-88],
  ].forEach(([x, z]) => {
    const r = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.3 + Math.random() * 0.4, 0), rockMat);
    r.position.set(x + (Math.random() - 0.5), 0.2, z + (Math.random() - 0.5));
    r.rotation.set(Math.random(), Math.random(), Math.random());
    r.castShadow = r.receiveShadow = true;
    scene.add(r);
  });
}