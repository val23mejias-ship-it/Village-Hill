// src/lighting.js — Iluminación nocturna mejorada (más visible)
import * as THREE from 'three';

export function setupLighting(scene) {

  // ── Ambiente más claro — como las 9 PM ──────────────────────
  const ambient = new THREE.AmbientLight(0x1a2035, 2.5);
  scene.add(ambient);

  // ── Luna más brillante ───────────────────────────────────────
  const moon = new THREE.DirectionalLight(0x6688cc, 1.2);
  moon.position.set(20, 40, 10);
  moon.castShadow = false;
  moon.shadow.mapSize.set(2048, 2048);
  moon.shadow.camera.near   = 1;
  moon.shadow.camera.far    = 150;
  moon.shadow.camera.left   = -50;
  moon.shadow.camera.right  =  50;
  moon.shadow.camera.top    =  50;
  moon.shadow.camera.bottom = -50;
  moon.shadow.bias = -0.001;
  scene.add(moon);

  // ── Relleno suave desde abajo ────────────────────────────────
  const hemi = new THREE.HemisphereLight(0x223355, 0x111122, 0.8);
  scene.add(hemi);

  // ── Luz del portón (roja) ────────────────────────────────────
  const gateLight = new THREE.PointLight(0x440000, 4, 25, 2);
  gateLight.position.set(0, 4, -68);
  scene.add(gateLight);



  // ── Postes de luz más brillantes ────────────────────────────
  // (los postes ya tienen su propia PointLight en map.js,
  //  esto añade un relleno general en la calle)
  const streetGlow = new THREE.PointLight(0xffcc66, 0.6, 40, 1);
  streetGlow.position.set(0, 5, -25);
  scene.add(streetGlow);
}

// ── Linterna del jugador ─────────────────────────────────────────
export function createFlashlight(camera) {
  // Luz principal de linterna
  const flashlight = new THREE.SpotLight(0xfff5dd, 8, 30, Math.PI * 0.13, 0.4, 1.5);
  flashlight.castShadow = true;
  flashlight.shadow.mapSize.set(512, 512);
  camera.add(flashlight);
  flashlight.position.set(0.2, -0.1, 0);

  // Target adelante de la cámara
  const target = new THREE.Object3D();
  target.position.set(0, 0, -1);
  camera.add(target);
  flashlight.target = target;

  // Luz de relleno suave (para iluminar lo cercano)
  const fill = new THREE.PointLight(0xfff5dd, 1.5, 4, 2);
  fill.position.set(0, 0, -0.5);
  camera.add(fill);

  return flashlight;
}