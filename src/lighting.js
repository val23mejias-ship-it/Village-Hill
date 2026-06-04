// src/lighting.js — Iluminación nocturna de terror
import * as THREE from 'three';
 
export function setupLighting(scene) {
 
  // ── Luz ambiental muy tenue ──────────────────────────────────
  const ambient = new THREE.AmbientLight(0x0a0d18, 0.8);
  scene.add(ambient);
 
  // ── Luna (luz direccional tenue azulada) ─────────────────────
  const moon = new THREE.DirectionalLight(0x3344aa, 0.4);
  moon.position.set(20, 40, 10);
  moon.castShadow = true;
  moon.shadow.mapSize.set(2048, 2048);
  moon.shadow.camera.near   = 1;
  moon.shadow.camera.far    = 150;
  moon.shadow.camera.left   = -50;
  moon.shadow.camera.right  =  50;
  moon.shadow.camera.top    =  50;
  moon.shadow.camera.bottom = -50;
  moon.shadow.bias = -0.001;
  scene.add(moon);
 
  // ── Luz de relleno fría (cielo) ──────────────────────────────
  const hemi = new THREE.HemisphereLight(0x0a0d20, 0x000000, 0.3);
  scene.add(hemi);
 
  // ── Luz del portón (roja inquietante) ────────────────────────
  const gateLight = new THREE.PointLight(0x440000, 3, 20, 2);
  gateLight.position.set(0, 4, -68);
  scene.add(gateLight);
 
  // ── Luces de ventanas tenues ─────────────────────────────────
  const windowLights = [
    { x: -8,  z:  5  },
    { x:  8,  z: -8  },
    { x: -8,  z: -36 },
  ];
 
  windowLights.forEach(({ x, z }) => {
    const light = new THREE.PointLight(0x1a2a0a, 1.2, 8, 2);
    light.position.set(x, 2.5, z);
    scene.add(light);
  });
 
  // ── Parpadeo de algunas luces (horror) ───────────────────────
  const flickerLights = [];
  [-15, -45].forEach(z => {
    const fl = new THREE.PointLight(0xffcc44, 1.8, 10, 2);
    fl.position.set(-4, 4.8, z);
    scene.add(fl);
    flickerLights.push({ light: fl, baseIntensity: 1.8, t: Math.random() * 100 });
  });
 
  // Loop de parpadeo (independiente del game loop)
  let lastTime = performance.now();
  function flickerUpdate() {
    const now = performance.now();
    const dt  = (now - lastTime) / 1000;
    lastTime  = now;
 
    flickerLights.forEach(fl => {
      fl.t += dt;
      // Parpadeo con ruido
      const noise = Math.sin(fl.t * 17.3) * Math.sin(fl.t * 5.7) * Math.sin(fl.t * 23.1);
      fl.light.intensity = fl.baseIntensity + noise * 0.6;
      if (Math.random() < 0.002) fl.light.intensity = 0; // apagón breve
    });
 
    requestAnimationFrame(flickerUpdate);
  }
  flickerUpdate();
}
 