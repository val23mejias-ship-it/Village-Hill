// src/map.js — Mapa con modelos GLB reales
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
 
const loader = new GLTFLoader();
 
// Modelos base (se cargan una vez)
let casa1Base, casa2Base, casa3Base, arbol1Base, arbol2Base;
 
// ── Materiales para geometría procedural (suelo, calle, vallas) ──
const matGround = new THREE.MeshStandardMaterial({ color: 0x0c0c0e, roughness: 1 });
const matStreet = new THREE.MeshStandardMaterial({ color: 0x111116, roughness: 0.9 });
const matFence  = new THREE.MeshStandardMaterial({ color: 0x1c1410, roughness: 1 });
 
// ── Carga de modelos ─────────────────────────────────────────────
function loadModel(path) {
  return new Promise((resolve, reject) => {
    loader.load(
      path,
      gltf => resolve(gltf.scene),
      undefined,
      err  => {
        console.warn(`No se pudo cargar ${path}:`, err);
        resolve(null); // no rompe el juego si falta un modelo
      }
    );
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
 
// ── Helpers ──────────────────────────────────────────────────────
function enableShadows(obj) {
  obj.traverse(m => {
    if (m.isMesh) {
      m.castShadow    = true;
      m.receiveShadow = true;
    }
  });
}
 
function placeModel(base, x, y, z, rotY = 0, scale = 1) {
  if (!base) return null;
  const clone = base.clone();
  clone.position.set(x, y, z);
  clone.rotation.y = rotY;
  clone.scale.setScalar(scale);
  enableShadows(clone);
  return clone;
}
 
// ── Poste de luz (sigue siendo procedural) ───────────────────────
function buildLampPost(x, z) {
  const group = new THREE.Group();
 
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.08, 5, 6), matFence
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
 
  const light = new THREE.PointLight(0xffcc66, 2.5, 14, 2);
  light.position.set(0.8, 4.9, 0);
  light.castShadow = true;
  light.shadow.mapSize.set(256, 256);
  group.add(light);
 
  group.position.set(x, 0, z);
  return group;
}
 
// ── Valla procedural ────────────────────────────────────────────
function buildFenceRow(x1, z1, x2, z2) {
  const group = new THREE.Group();
  const dx  = x2 - x1, dz = z2 - z1;
  const len = Math.sqrt(dx * dx + dz * dz);
  const angle = Math.atan2(dx, dz);
  const posts = Math.floor(len / 1.2);
 
  for (let i = 0; i <= posts; i++) {
    const t    = i / posts;
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.1, 0.08), matFence);
    post.position.set(x1 + dx * t, 0.55, z1 + dz * t);
    post.castShadow = true;
    group.add(post);
  }
 
  const rail = new THREE.Mesh(new THREE.BoxGeometry(len, 0.06, 0.06), matFence);
  rail.position.set((x1 + x2) / 2, 0.9, (z1 + z2) / 2);
  rail.rotation.y = angle;
  group.add(rail);
 
  return group;
}
 
// ── Suelo y calle ────────────────────────────────────────────────
function buildGround(scene) {
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), matGround);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
}
 
function buildStreet(scene) {
  const street = new THREE.Mesh(new THREE.PlaneGeometry(7, 120), matStreet);
  street.rotation.x = -Math.PI / 2;
  street.position.set(0, 0.01, -25);
  street.receiveShadow = true;
  scene.add(street);
 
  const lineMat = new THREE.MeshStandardMaterial({ color: 0x333330, roughness: 1 });
  for (let i = 0; i < 20; i++) {
    const line = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 1.8), lineMat);
    line.rotation.x = -Math.PI / 2;
    line.position.set(0, 0.015, -5 + i * -5.5);
    scene.add(line);
  }
}
 
// ── Mapa principal ───────────────────────────────────────────────
export async function buildMap(scene) {
  await loadModels();
 
  buildGround(scene);
  buildStreet(scene);
 
  // Casas — alternando los 3 modelos
  // Ajusta scale según el tamaño real de tus modelos
  // (si se ven enormes baja a 0.01, si se ven diminutas sube a 2)
  const HOUSE_SCALE = 1;
 
  const casaBases = [casa1Base, casa2Base, casa3Base].filter(Boolean);
  const fallback  = casaBases[0]; // si solo cargó 1 modelo, usa ese
 
  const housePositions = [
    // izquierda (frente hacia la calle = rotación -PI/2)
    { x: -9,  z:   3, r: -Math.PI / 2 },
    { x: -9,  z:  -10, r: -Math.PI / 2 },
    { x: -9,  z:  -23, r: -Math.PI / 2 },
    { x: -9,  z:  -36, r: -Math.PI / 2 },
    { x: -9,  z:  -49, r: -Math.PI / 2 },
    // derecha (frente hacia la calle = rotación PI/2)
    { x:  9,  z:   3, r:  Math.PI / 2 },
    { x:  9,  z:  -10, r:  Math.PI / 2 },
    { x:  9,  z:  -23, r:  Math.PI / 2 },
    { x:  9,  z:  -36, r:  Math.PI / 2 },
    { x:  9,  z:  -49, r:  Math.PI / 2 },
  ];
 
  housePositions.forEach(({ x, z, r }, i) => {
    const base = casaBases.length > 0 ? casaBases[i % casaBases.length] : null;
    if (!base) return;
    const casa = placeModel(base, x, 0, z, r, HOUSE_SCALE);
    if (casa) scene.add(casa);
  });
 
  // Postes de luz
  [-15, -30, -45].forEach(z => {
    scene.add(buildLampPost(-4, z));
    scene.add(buildLampPost( 4, z));
  });
 
  // Vallas
  scene.add(buildFenceRow(-3.5,  15, -3.5, -65));
  scene.add(buildFenceRow( 3.5,  15,  3.5, -65));
 
  // Árboles — alternando arbol1 y arbol2
  // Ajusta TREE_SCALE según tus modelos
  const TREE_SCALE = 1;
  const treeBases  = [arbol1Base, arbol2Base].filter(Boolean);
 
  if (treeBases.length > 0) {
    const forestPositions = [];
 
    for (let z = 20; z > -85; z -= 3.5) {
      forestPositions.push({ x: -14 - Math.random() * 8,  z });
      forestPositions.push({ x: -18 - Math.random() * 6,  z: z + 1.5 });
      forestPositions.push({ x:  14 + Math.random() * 8,  z });
      forestPositions.push({ x:  18 + Math.random() * 6,  z: z + 1.5 });
    }
    for (let x = -22; x < 22; x += 3) {
      forestPositions.push({ x,         z: -82 - Math.random() * 5 });
      forestPositions.push({ x: x + 1.5, z: -88 - Math.random() * 4 });
    }
    for (let x = -22; x < -4; x += 3.5)
      forestPositions.push({ x, z: 18 + Math.random() * 4 });
    for (let x = 4; x < 22; x += 3.5)
      forestPositions.push({ x, z: 18 + Math.random() * 4 });
 
    forestPositions.forEach(({ x, z }, i) => {
      const base  = treeBases[i % treeBases.length];
      const rotY  = Math.random() * Math.PI * 2;
      const scale = TREE_SCALE * (0.8 + Math.random() * 0.5);
      const arbol = placeModel(base, x, 0, z, rotY, scale);
      if (arbol) scene.add(arbol);
    });
  }
 
  // Rocas decorativas (procedural, no necesita modelo)
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1c, roughness: 0.9 });
  [[6, 2], [-5, -15], [7, -28], [-6, -42], [5, -55]].forEach(([x, z]) => {
    const rock = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.3 + Math.random() * 0.4, 0), rockMat
    );
    rock.position.set(x + (Math.random() - 0.5), 0.2, z + (Math.random() - 0.5));
    rock.rotation.set(Math.random(), Math.random(), Math.random());
    rock.castShadow = rock.receiveShadow = true;
    scene.add(rock);
  });
}