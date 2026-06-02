import * as THREE from 'three';

// --- Escena, cámara, renderer ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111122);
scene.fog = new THREE.FogExp2(0x111122, 0.02);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// --- Luz ambiental y una luz de techo básica ---
const ambientLight = new THREE.AmbientLight(0x333333);
scene.add(ambientLight);
const dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
dirLight.position.set(5, 10, 7);
dirLight.castShadow = true;
scene.add(dirLight);

// --- Personaje (por ahora un cubo) ---
const playerGeometry = new THREE.BoxGeometry(0.6, 1.2, 0.6);
const playerMaterial = new THREE.MeshStandardMaterial({ color: 0x88aaff });
const player = new THREE.Mesh(playerGeometry, playerMaterial);
player.castShadow = true;
player.receiveShadow = true;
player.position.set(0, 0.6, 0);
scene.add(player);

// --- Suelo (grande, para moverse) ---
const floorMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.8 });
const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), floorMat);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -0.05;
floor.receiveShadow = true;
scene.add(floor);

// Algunos obstáculos (cubos) para simular un pueblo
const obstacleMat = new THREE.MeshStandardMaterial({ color: 0xaa8866 });
for (let i = -5; i <= 5; i+=2) {
    const block = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.5, 0.8), obstacleMat);
    block.position.set(i * 1.5, 0.7, -4);
    block.castShadow = true;
    scene.add(block);
}

// --- Controles WASD ---
const keyState = {
    KeyW: false, KeyS: false, KeyA: false, KeyD: false
};
let moveSpeed = 3.5;

window.addEventListener('keydown', (e) => {
    if (keyState.hasOwnProperty(e.code)) keyState[e.code] = true;
});
window.addEventListener('keyup', (e) => {
    if (keyState.hasOwnProperty(e.code)) keyState[e.code] = false;
});

function updateMovement(deltaTime) {
    let moveX = 0, moveZ = 0;
    if (keyState.KeyW) moveZ -= 1;
    if (keyState.KeyS) moveZ += 1;
    if (keyState.KeyA) moveX -= 1;
    if (keyState.KeyD) moveX += 1;
    if (moveX !== 0 || moveZ !== 0) {
        const len = Math.hypot(moveX, moveZ);
        moveX /= len;
        moveZ /= len;
    }
    player.position.x += moveX * moveSpeed * deltaTime;
    player.position.z += moveZ * moveSpeed * deltaTime;
    // Límites simples
    player.position.x = Math.max(-18, Math.min(18, player.position.x));
    player.position.z = Math.max(-18, Math.min(18, player.position.z));
}

// --- Cámara en tercera persona (sigue al jugador) ---
const cameraOffset = new THREE.Vector3(-5, 3, 5);
function updateCamera() {
    camera.position.copy(player.position.clone().add(cameraOffset));
    camera.lookAt(player.position);
}

// --- Bucle de animación ---
let lastTime = performance.now();
function animate() {
    const now = performance.now();
    let delta = Math.min(0.033, (now - lastTime) / 1000);
    lastTime = now;
    updateMovement(delta);
    updateCamera();
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}
animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
// Enemigo (cubo rojo por ahora)
const enemyGeo = new THREE.BoxGeometry(0.8, 1.8, 0.8);
const enemyMat = new THREE.MeshStandardMaterial({ color: 0xaa3333 });
const enemy = new THREE.Mesh(enemyGeo, enemyMat);
enemy.castShadow = true;
enemy.position.set(5, 0.9, 5);
scene.add(enemy);

// Persecución simple
function updateEnemy(deltaTime) {
    const direction = new THREE.Vector3().subVectors(player.position, enemy.position).normalize();
    enemy.position.x += direction.x * 2.5 * deltaTime;
    enemy.position.z += direction.z * 2.5 * deltaTime;
    // Colisión: si distancia < 1.2, game over
    const dist = player.position.distanceTo(enemy.position);
    if (dist < 1.2) {
        // Game Over: mostrar mensaje y detener todo
        alert("Leatherface te atrapó. Game Over.");
        // Reiniciar o recargar
    }
}
// Crear la linterna (un spotlight)
const flashlight = new THREE.SpotLight(0xffaa66, 1.2);
flashlight.angle = 0.5;
flashlight.penumbra = 0.4;
flashlight.distance = 12;
flashlight.castShadow = true;
scene.add(flashlight);
scene.add(flashlight.target);

// En update, posicionar la linterna en el pecho del personaje y que mire hacia donde mira la cámara
function updateFlashlight() {
    flashlight.position.copy(player.position);
    flashlight.position.y += 0.8; // altura del pecho
    // Hacemos que la linterna mire hacia la dirección de la cámara (hacia adelante)
    const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    flashlight.target.position.copy(player.position.clone().add(direction.multiplyScalar(5)));
}