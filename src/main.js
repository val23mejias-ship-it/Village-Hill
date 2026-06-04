// src/main.js — Punto de entrada principal
import * as THREE from 'three';
import { createPlayer, updatePlayer } from './player.js';
import { buildMap } from './map.js';
import { createCollectibles, updateCollectibles } from './collectibles.js';
import { createGate, updateGate, checkGateCross } from './gate.js';
import { setupLighting } from './lighting.js';
import { initAudio, startAmbience, playPickup, playWinSound } from './audio.js';
 
// ── Estado global ───────────────────────────────────────────────
export const state = {
  collected: 0,
  total: 3,
  gameStarted: false,
  gameWon: false,
};
 
// ── Renderer ────────────────────────────────────────────────────
export const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.4;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);
 
// ── Escena & Cámara ─────────────────────────────────────────────
export const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050508);
scene.fog = new THREE.FogExp2(0x050508, 0.045);
 
export const camera = new THREE.PerspectiveCamera(
  75, window.innerWidth / window.innerHeight, 0.1, 120
);
 
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
 
// ── Inicializar mundo (async porque carga modelos GLB) ──────────
const clock = new THREE.Clock();
let player, collectibles, gate;
 
async function initWorld() {
  setupLighting(scene);
 
  // Carga en paralelo mapa y portón
  await Promise.all([
    buildMap(scene),
    createGate(scene).then(g => { gate = g; }),
  ]);
 
  // Coleccionables también son async
  collectibles = await createCollectibles(scene, state, onCollect);
 
  // Jugador se crea después del mapa
  player = createPlayer(camera, scene);
}
 
function onCollect(index) {
  state.collected++;
  playPickup();
  updatePips();
  if (state.collected >= state.total) {
    setTimeout(() => updateGate(gate, true), 300);
  }
}
 
function updatePips() {
  for (let i = 0; i < state.total; i++) {
    const pip = document.getElementById(`pip-${i}`);
    if (pip) pip.classList.toggle('collected', i < state.collected);
  }
}
 
// ── Loop principal ──────────────────────────────────────────────
function animate() {
  requestAnimationFrame(animate);
  if (!state.gameStarted || !player) return;
 
  const delta = Math.min(clock.getDelta(), 0.05);
  updatePlayer(player, delta);
  if (collectibles) updateCollectibles(collectibles, player);
  if (gate) checkGateCross(player.body);
  renderer.render(scene, camera);
}
 
// ── UI / Start ──────────────────────────────────────────────────
document.getElementById('btn-start').addEventListener('click', async () => {
  // Mostrar indicador de carga
  const btn = document.getElementById('btn-start');
  btn.textContent = '[ CARGANDO... ]';
  btn.disabled = true;
 
  initAudio();
  await initWorld();
 
  document.getElementById('start-screen').classList.add('hidden');
  document.getElementById('hud').style.display = 'block';
 
  renderer.domElement.requestPointerLock();
  state.gameStarted = true;
  clock.start();
  startAmbience();
  animate();
});
 
document.getElementById('btn-restart').addEventListener('click', () => {
  location.reload();
});
 
// ── Victoria ─────────────────────────────────────────────────────
export function showWin() {
  if (state.gameWon) return;
  state.gameWon = true;
  playWinSound();
  document.exitPointerLock();
  setTimeout(() => {
    document.getElementById('win-screen').classList.remove('hidden');
    document.getElementById('hud').style.display = 'none';
  }, 800);
}
 
// ── Pointer lock ─────────────────────────────────────────────────
renderer.domElement.addEventListener('click', () => {
  if (state.gameStarted && !state.gameWon) {
    renderer.domElement.requestPointerLock();
  }
});
 