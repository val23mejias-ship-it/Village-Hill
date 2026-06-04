// src/player.js — Movimiento FPS con linterna y generación de ruido
import * as THREE from 'three';
import { addNoise } from './enemy.js';

const SPEED       = 5;
const SPRINT_MULT = 1.8;
const PLAYER_H    = 1.7;
const BOB_FREQ    = 9;
const BOB_AMP     = 0.05;

const keys = {};
let yaw    = 0;
let pitch  = 0;
let bobTime = 0;
let _camera = null;

const playerBody = new THREE.Object3D();

export function createPlayer(camera, scene) {
  _camera = camera;
  playerBody.position.set(0, PLAYER_H, 8);
  scene.add(playerBody);
  playerBody.add(camera);
  camera.position.set(0, 0, 0);

  window.addEventListener('keydown', e => { keys[e.code] = true; });
  window.addEventListener('keyup',   e => { keys[e.code] = false; });
  document.addEventListener('mousemove', onMouseMove);

  return { body: playerBody, camera };
}

function onMouseMove(e) {
  if (!document.pointerLockElement) return;
  const sens = 0.0018;
  yaw   -= e.movementX * sens;
  pitch -= e.movementY * sens;
  pitch  = Math.max(-Math.PI * 0.42, Math.min(Math.PI * 0.42, pitch));
}

const _front = new THREE.Vector3();
const _right  = new THREE.Vector3();
const _move   = new THREE.Vector3();

export function updatePlayer(player, delta) {
  const { body } = player;

  body.rotation.y = yaw;
  _front.set(Math.sin(yaw), 0, Math.cos(yaw));
  _right.set(Math.cos(yaw), 0, -Math.sin(yaw));
  _move.set(0, 0, 0);

  if (keys['KeyW'] || keys['ArrowUp'])    _move.addScaledVector(_front, -1);
  if (keys['KeyS'] || keys['ArrowDown'])  _move.addScaledVector(_front,  1);
  if (keys['KeyA'] || keys['ArrowLeft'])  _move.addScaledVector(_right, -1);
  if (keys['KeyD'] || keys['ArrowRight']) _move.addScaledVector(_right,  1);

  const sprinting = keys['ShiftLeft'] || keys['ShiftRight'];
  const moving    = _move.lengthSq() > 0;

  if (moving) {
    _move.normalize();
    const speed = sprinting ? SPEED * SPRINT_MULT : SPEED;
    _move.multiplyScalar(speed * delta);
    body.position.addScaledVector(_move, 1);

    // Generar ruido — más si está corriendo
    addNoise(sprinting ? delta * 1.2 : delta * 0.4);

    bobTime += delta * BOB_FREQ;
    _camera.position.y = Math.sin(bobTime) * BOB_AMP;
    _camera.position.x = Math.sin(bobTime * 0.5) * BOB_AMP * 0.5;
  } else {
    _camera.position.y += (0 - _camera.position.y) * 0.12;
    _camera.position.x += (0 - _camera.position.x) * 0.12;
  }

  _camera.rotation.x = pitch;
  body.position.y    = PLAYER_H;

  // Límites del mapa
  body.position.x = Math.max(-18, Math.min(18, body.position.x));
  body.position.z = Math.max(-80, Math.min(30, body.position.z));
}

export function getPlayerPosition() {
  return playerBody.position;
}