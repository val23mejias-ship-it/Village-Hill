// src/player.js — Movimiento en primera persona
import * as THREE from 'three';
 
const SPEED       = 7;
const SPRINT_MULT = 1.6;
const PLAYER_H    = 1.7;   // altura de ojos
const BOB_FREQ    = 9;
const BOB_AMP     = 0.05;
 
const keys = {};
let   yaw   = 0;
let   pitch = 0;
let   bobTime = 0;
let   _camera  = null;
let   _scene   = null;
 
// Cuerpo del jugador (hitbox invisible)
const playerBody = new THREE.Object3D();
 
export function createPlayer(camera, scene) {
  _camera = camera;
  _scene  = scene;
 
  playerBody.position.set(0, PLAYER_H, 8);  // inicio en la calle
  scene.add(playerBody);
  playerBody.add(camera);
  camera.position.set(0, 0, 0);
 
  // Eventos de teclado
  window.addEventListener('keydown', e => { keys[e.code] = true; });
  window.addEventListener('keyup',   e => { keys[e.code] = false; });
 
  // Mouse look (pointer lock)
  document.addEventListener('mousemove', onMouseMove);
 
  return { body: playerBody, camera };
}
 
function onMouseMove(e) {
  if (document.pointerLockElement === null) return;
  const sens = 0.0018;
  yaw   -= e.movementX * sens;
  pitch -= e.movementY * sens;
  pitch  = Math.max(-Math.PI * 0.42, Math.min(Math.PI * 0.42, pitch));
}
 
// Dirección de movimiento según yaw
const _front = new THREE.Vector3();
const _right  = new THREE.Vector3();
const _move   = new THREE.Vector3();
 
export function updatePlayer(player, delta) {
  const { body } = player;
 
  // Rotación horizontal en el cuerpo
  body.rotation.y = yaw;
 
  // Dirección
  _front.set(Math.sin(yaw), 0, Math.cos(yaw));
  _right.set(Math.cos(yaw), 0, -Math.sin(yaw));
  _move.set(0, 0, 0);
 
  if (keys['KeyW'] || keys['ArrowUp'])    _move.addScaledVector(_front, -1);
  if (keys['KeyS'] || keys['ArrowDown'])  _move.addScaledVector(_front,  1);
  if (keys['KeyA'] || keys['ArrowLeft'])  _move.addScaledVector(_right, -1);
  if (keys['KeyD'] || keys['ArrowRight']) _move.addScaledVector(_right,  1);
 
  const moving = _move.lengthSq() > 0;
  if (moving) {
    _move.normalize();
    const speed = (keys['ShiftLeft'] || keys['ShiftRight'])
      ? SPEED * SPRINT_MULT
      : SPEED;
    _move.multiplyScalar(speed * delta);
    body.position.addScaledVector(_move, 1);
 
    // Bob
    bobTime += delta * BOB_FREQ;
    _camera.position.y = Math.sin(bobTime) * BOB_AMP;
    _camera.position.x = Math.sin(bobTime * 0.5) * BOB_AMP * 0.5;
  } else {
    // Suavizar vuelta al centro
    _camera.position.y += (0 - _camera.position.y) * 0.12;
    _camera.position.x += (0 - _camera.position.x) * 0.12;
  }
 
  // Pitch de cámara
  _camera.rotation.x = pitch;
 
  // Mantener altura
  body.position.y = PLAYER_H;
 
  // Límites del mapa (caja simple)
  body.position.x = Math.max(-18, Math.min(18, body.position.x));
  body.position.z = Math.max(-80, Math.min(30, body.position.z));
}
 
export function getPlayerPosition() {
  return playerBody.position;
}
 