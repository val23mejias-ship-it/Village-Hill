import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// ========== 1. CONFIGURACIÓN INICIAL ==========
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a1030);
scene.fog = new THREE.FogExp2(0x0a1030, 0.008);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// Luces
const ambientLight = new THREE.AmbientLight(0x404060);
scene.add(ambientLight);
const mainLight = new THREE.DirectionalLight(0xffeedd, 1);
mainLight.position.set(10, 20, 5);
mainLight.castShadow = true;
mainLight.receiveShadow = true;
scene.add(mainLight);
const fillLight = new THREE.PointLight(0x443366, 0.5);
fillLight.position.set(-5, 10, 10);
scene.add(fillLight);

// ========== 2. CARGAR MODELOS ==========
const loader = new GLTFLoader();

// Pueblo (3 partes)
loader.load('/static/assets/models/town/pueblo_uno.glb', (gltf) => scene.add(gltf.scene));
loader.load('/static/assets/models/town/pueblo_dos.glb', (gltf) => scene.add(gltf.scene));
loader.load('/static/assets/models/town/pueblo_tres.glb', (gltf) => scene.add(gltf.scene));

// Personaje principal
let playerModel;
loader.load('/static/assets/models/player/personaje.glb', (gltf) => {
    playerModel = gltf.scene;
    playerModel.traverse((child) => { if (child.isMesh) child.castShadow = true; });
    playerModel.scale.set(1, 1, 1);
    scene.add(playerModel);
    // Si tiene animaciones, las configuras aquí (opcional)
});

// Enemigo (Leatherface)
let enemyModel;
loader.load('/static/assets/models/enemy/malo.glb', (gltf) => {
    enemyModel = gltf.scene;
    enemyModel.traverse((child) => { if (child.isMesh) child.castShadow = true; });
    enemyModel.scale.set(1.2, 1.2, 1.2);
    scene.add(enemyModel);
});

// ========== 3. COMUNICACIÓN CON BACKEND ==========
const API_BASE = 'http://localhost:5001/api';
let currentPlayerPos = { x: 0, z: 0 };
let currentEnemyPos = { x: 5, z: 5 };
let currentNoise = 0;
let currentInventory = [];

// Obtener estado del juego desde el backend
async function fetchGameState() {
    try {
        const res = await fetch(`${API_BASE}/state`);
        if (!res.ok) throw new Error('Error en fetchState');
        const data = await res.json();
        currentPlayerPos = { x: data.player_x, z: data.player_z };
        currentEnemyPos = { x: data.enemy_x, z: data.enemy_z };
        currentNoise = data.noise_level || 0;
        currentInventory = data.inventory || [];
        
        // Actualizar posiciones de los modelos 3D
        if (playerModel) playerModel.position.set(currentPlayerPos.x, 0, currentPlayerPos.z);
        if (enemyModel) enemyModel.position.set(currentEnemyPos.x, 0, currentEnemyPos.z);
        
        // Actualizar UI
        document.getElementById('inventory-list').innerText = currentInventory.length ? currentInventory.join(', ') : 'Ninguno';
        document.getElementById('noise-level').innerText = currentNoise;
        
        // Comprobar game over
        if (data.game_over) {
            document.getElementById('game-over').style.display = 'block';
            // Opcional: detener sonidos, cancelar animación, etc.
        }
    } catch (error) {
        console.error("Error al obtener estado:", error);
    }
}

// Enviar movimiento al backend
async function sendMove(direction) {
    try {
        const res = await fetch(`${API_BASE}/move`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ direction })
        });
        if (!res.ok) throw new Error('Error en move');
        const data = await res.json();
        // Actualizar posición local
        currentPlayerPos = { x: data.player_x, z: data.player_z };
        if (playerModel) playerModel.position.set(currentPlayerPos.x, 0, currentPlayerPos.z);
        // Volver a obtener el estado completo para actualizar ruido, inventario, etc.
        await fetchGameState();
    } catch (error) {
        console.error("Error al enviar movimiento:", error);
    }
}

// ========== 4. CONTROLES WASD ==========
const keyState = { w: false, s: false, a: false, d: false };
let lastMoveTime = 0;
const MOVE_COOLDOWN = 150; // milisegundos entre movimientos (para no saturar)

window.addEventListener('keydown', (e) => {
    switch(e.code) {
        case 'KeyW': keyState.w = true; break;
        case 'KeyS': keyState.s = true; break;
        case 'KeyA': keyState.a = true; break;
        case 'KeyD': keyState.d = true; break;
    }
});
window.addEventListener('keyup', (e) => {
    switch(e.code) {
        case 'KeyW': keyState.w = false; break;
        case 'KeyS': keyState.s = false; break;
        case 'KeyA': keyState.a = false; break;
        case 'KeyD': keyState.d = false; break;
    }
});

function getDirection() {
    if (keyState.w) return 'north';
    if (keyState.s) return 'south';
    if (keyState.a) return 'west';
    if (keyState.d) return 'east';
    return null;
}

// Bucle que envía movimiento periódicamente (con cooldown)
function handleMovement() {
    const now = Date.now();
    const dir = getDirection();
    if (dir && (now - lastMoveTime) >= MOVE_COOLDOWN) {
        lastMoveTime = now;
        sendMove(dir);
    }
    requestAnimationFrame(handleMovement);
}

// ========== 5. CÁMARA EN TERCERA PERSONA ==========
function updateCamera() {
    if (!playerModel) return;
    // Posición relativa: detrás del jugador
    const offset = new THREE.Vector3(-5, 3, 5);
    const targetPos = playerModel.position.clone().add(offset);
    camera.position.lerp(targetPos, 0.05);
    camera.lookAt(playerModel.position);
}

// ========== 6. ANIMACIÓN Y RENDERIZADO ==========
function animate() {
    requestAnimationFrame(animate);
    updateCamera();
    renderer.render(scene, camera);
}
animate();

// ========== 7. INICIALIZACIÓN DEL JUEGO ==========
async function init() {
    // Crear una nueva partida (opcional, si el backend lo requiere)
    try {
        await fetch(`${API_BASE}/new_game`, { method: 'POST' });
    } catch(e) { console.log("new_game no implementado o error"); }
    // Cargar estado inicial
    await fetchGameState();
    // Iniciar el bucle de movimiento
    handleMovement();
    // Actualizar estado cada 2 segundos (por si acaso)
    setInterval(fetchGameState, 2000);
}

init();

// Ajustar cámara al redimensionar
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});