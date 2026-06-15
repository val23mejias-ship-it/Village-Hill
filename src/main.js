// src/main.js
import * as THREE from 'three';
import { createPlayer, updatePlayer } from './player.js';
import { buildMap } from './map.js';
import { createCollectibles, updateCollectibles } from './collectibles.js';
import { createGate, updateGate, checkGateCross } from './gate.js';
import { setupLighting, createFlashlight } from './lighting.js';
import { createEnemy, updateEnemy } from './enemy.js';
import { initAudio, startAmbience, playPickup, playWinSound, playGameOver } from './audio.js';

export const state = {
  collected: 0, total: 3,
  gameStarted: false, gameWon: false, gameOver: false,
};

// ── Renderer ─────────────────────────────────────────────────────
export const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(1);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = false;
renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.NoToneMapping;
renderer.toneMappingExposure = 0.6;
renderer.outputColorSpace  = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

// ── Escena & Cámara ───────────────────────────────────────────────
export const scene  = new THREE.Scene();
scene.background    = new THREE.Color(0x080a12);
scene.fog           = new THREE.FogExp2(0x080a12, 0.028);

export const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 150);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ── Variables ─────────────────────────────────────────────────────
const clock = new THREE.Clock();
let player, collectibles, gate, enemyRef;

async function initWorld() {
  setupLighting(scene);
  await Promise.all([
    buildMap(scene),
    createGate(scene).then(g => { gate = g; }),
  ]);
  collectibles = await createCollectibles(scene, state, onCollect);
  player       = createPlayer(camera, scene);
  createFlashlight(camera);
  enemyRef     = createEnemy(scene, onCaught);
}

function onCollect() {
  state.collected++;
  playPickup();
  updatePips();
  if (state.collected >= state.total) {
    setTimeout(() => updateGate(gate, true), 300);
  }
}

function onCaught() {
  if (state.gameOver || state.gameWon) return;
  state.gameOver = true;
  playGameOver();
  document.exitPointerLock();
  showGameOver();
}

function updatePips() {
  for (let i = 0; i < state.total; i++) {
    const pip = document.getElementById(`pip-${i}`);
    if (pip) pip.classList.toggle('collected', i < state.collected);
  }
}

// ── Loop ──────────────────────────────────────────────────────────
function animate() {
  requestAnimationFrame(animate);
  if (!state.gameStarted || !player) return;
  if (state.gameOver || state.gameWon) return;

  const delta = Math.min(clock.getDelta(), 0.05);
  updatePlayer(player, delta);
  if (collectibles) updateCollectibles(collectibles, player);
  if (gate)         checkGateCross(player.body);
  if (enemyRef)     updateEnemy(delta, enemyRef, player.body, onCaught);
  renderer.render(scene, camera);
}

// ── Start ─────────────────────────────────────────────────────────
document.getElementById('btn-start').addEventListener('click', async () => {
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

document.getElementById('btn-restart').addEventListener('click', () => location.reload());

export function showWin() {
  if (state.gameWon || state.gameOver) return;
  state.gameWon = true;
  playWinSound();
  document.exitPointerLock();
  setTimeout(() => {
    document.getElementById('win-screen').classList.remove('hidden');
    document.getElementById('hud').style.display = 'none';
  }, 800);
}

function showGameOver() {
  document.getElementById('hud').style.display = 'none';
  const fleeUI = document.getElementById('flee-ui');
  if (fleeUI) fleeUI.style.display = 'none';
  setTimeout(() => {
    const win = document.getElementById('win-screen');
    win.querySelector('h2').textContent = 'TE ATRAPÓ';
    win.querySelector('h2').style.color = '#ff2200';
    win.querySelector('h2').style.textShadow = '0 0 30px #ff220066';
    win.querySelector('p').textContent  = 'No lograste escapar del pueblo';
    win.classList.remove('hidden');
  }, 200);
}

renderer.domElement.addEventListener('click', () => {
  if (state.gameStarted && !state.gameWon && !state.gameOver)
    renderer.domElement.requestPointerLock();
});