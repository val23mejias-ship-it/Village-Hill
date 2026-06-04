import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// ========== CONFIGURACIÓN INICIAL ==========
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB); // Cielo azul claro
scene.fog = new THREE.Fog(0x87CEEB, 40, 80); // Niebla ligera

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// ========== LUCES ==========
// Luz ambiental
const ambientLight = new THREE.AmbientLight(0x404060, 0.6);
scene.add(ambientLight);
// Luz solar principal
const sunLight = new THREE.DirectionalLight(0xffeedd, 1.2);
sunLight.position.set(15, 20, 5);
sunLight.castShadow = true;
sunLight.receiveShadow = true;
sunLight.shadow.mapSize.width = 1024;
sunLight.shadow.mapSize.height = 1024;
scene.add(sunLight);
// Luz de relleno desde atrás
const fillLight = new THREE.PointLight(0x664422, 0.4);
fillLight.position.set(-5, 5, -10);
scene.add(fillLight);

// ========== SUELO (desierto) ==========
const groundMat = new THREE.MeshStandardMaterial({ color: 0xccaa77, roughness: 0.8, metalness: 0.1 });
const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), groundMat);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.2;
ground.receiveShadow = true;
scene.add(ground);

// ========== MURO PERIMETRAL ==========
const wallMat = new THREE.MeshStandardMaterial({ color: 0xaa8866, roughness: 0.7 });
// Muros norte, sur, este, oeste (simplificado)
const wallHeight = 3;
const wallLength = 50;
const wallThick = 0.5;
// Muro norte
const northWall = new THREE.Mesh(new THREE.BoxGeometry(wallLength, wallHeight, wallThick), wallMat);
northWall.position.set(0, wallHeight/2, -25);
northWall.receiveShadow = true;
scene.add(northWall);
// Muro sur
const southWall = new THREE.Mesh(new THREE.BoxGeometry(wallLength, wallHeight, wallThick), wallMat);
southWall.position.set(0, wallHeight/2, 25);
southWall.receiveShadow = true;
scene.add(southWall);
// Muro este
const eastWall = new THREE.Mesh(new THREE.BoxGeometry(wallThick, wallHeight, wallLength), wallMat);
eastWall.position.set(25, wallHeight/2, 0);
eastWall.receiveShadow = true;
scene.add(eastWall);
// Muro oeste
const westWall = new THREE.Mesh(new THREE.BoxGeometry(wallThick, wallHeight, wallLength), wallMat);
westWall.position.set(-25, wallHeight/2, 0);
westWall.receiveShadow = true;
scene.add(westWall);

// ========== CALLE PRINCIPAL (arena más clara) ==========
const roadMat = new THREE.MeshStandardMaterial({ color: 0xddbb99, roughness: 0.9 });
const road = new THREE.Mesh(new THREE.PlaneGeometry(8, 40), roadMat);
road.rotation.x = -Math.PI / 2;
road.position.set(0, -0.15, 0);
road.receiveShadow = true;
scene.add(road);

// ========== CASAS (función para crear casas simples) ==========
function createHouse(x, z, color = 0xaa7755, roofColor = 0x884444) {
    const group = new THREE.Group();
    // Base de la casa
    const bodyMat = new THREE.MeshStandardMaterial({ color: color, roughness: 0.5 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.8, 1.8), bodyMat);
    body.position.y = 0.9;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);
    // Techo (pirámide o prisma)
    const roofMat = new THREE.MeshStandardMaterial({ color: roofColor, roughness: 0.8 });
    const roof = new THREE.Mesh(new THREE.ConeGeometry(1.3, 1.2, 4), roofMat);
    roof.rotation.y = Math.PI/4;
    roof.position.y = 1.8;
    roof.castShadow = true;
    group.add(roof);
    // Puerta
    const doorMat = new THREE.MeshStandardMaterial({ color: 0xaa8866 });
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.8, 0.1), doorMat);
    door.position.set(0, 0.4, 0.91);
    door.castShadow = true;
    group.add(door);
    group.position.set(x, -0.2, z);
    return group;
}

// Casas lado izquierdo (oeste)
const leftSideZ = [-14, -10, -6, -2, 2, 6, 10, 14];
leftSideZ.forEach(z => {
    const house = createHouse(-7, z, 0xaa7755, 0x884444);
    scene.add(house);
});
// Casas lado derecho (este)
const rightSideZ = [-14, -10, -6, -2, 2, 6, 10, 14];
rightSideZ.forEach(z => {
    const house = createHouse(7, z, 0xaa7755, 0x884444);
    scene.add(house);
});

// ========== CASA GRANDE AL FONDO (norte) ==========
const bigHouseGroup = new THREE.Group();
const bigBody = new THREE.Mesh(new THREE.BoxGeometry(3.5, 2.5, 3.5), new THREE.MeshStandardMaterial({ color: 0xaa6655 }));
bigBody.position.y = 1.25;
bigBody.castShadow = true;
bigHouseGroup.add(bigBody);
const bigRoof = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.5, 1.5, 4), new THREE.MeshStandardMaterial({ color: 0x773333 }));
bigRoof.position.y = 2.6;
bigRoof.castShadow = true;
bigHouseGroup.add(bigRoof);
bigHouseGroup.position.set(0, -0.2, -20);
scene.add(bigHouseGroup);

// ========== PORTÓN FINAL ==========
const gateMat = new THREE.MeshStandardMaterial({ color: 0xaa8866 });
const gateLeft = new THREE.Mesh(new THREE.BoxGeometry(1.5, 3, 0.3), gateMat);
gateLeft.position.set(-1.2, 1.5, -24.8);
gateLeft.castShadow = true;
scene.add(gateLeft);
const gateRight = new THREE.Mesh(new THREE.BoxGeometry(1.5, 3, 0.3), gateMat);
gateRight.position.set(1.2, 1.5, -24.8);
gateRight.castShadow = true;
scene.add(gateRight);
const gateTop = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.3, 0.3), gateMat);
gateTop.position.set(0, 3, -24.8);
gateTop.castShadow = true;
scene.add(gateTop);

// ========== OBJETOS RECOGIBLES (llaves, gasolina) ==========
const itemMat = new THREE.MeshStandardMaterial({ color: 0xffaa44, emissive: 0x442200 });
const items = [];
const itemPositions = [
    { x: -5, z: -8, id: 'key1' },
    { x: 4, z: -3, id: 'key2' },
    { x: -3, z: 5, id: 'gas' },
    { x: 6, z: 10, id: 'key3' },
    { x: -6, z: 12, id: 'battery' }
];
itemPositions.forEach(pos => {
    const item = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 16), itemMat);
    item.position.set(pos.x, 0.2, pos.z);
    item.castShadow = true;
    item.userData = { id: pos.id, collected: false };
    scene.add(item);
    items.push(item);
});

// ========== PERSONAJE (cubo azul temporal) ==========
let playerModel;
// Usamos un cubo con textura o color para el personaje
const playerMat = new THREE.MeshStandardMaterial({ color: 0x44aaff, emissive: 0x004466 });
const player = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.2, 0.6), playerMat);
player.castShadow = true;
player.receiveShadow = true;
player.position.set(0, 0.6, 0);
scene.add(player);
playerModel = player; // para compatibilidad

// ========== ENEMIGO (cubo rojo) ==========
const enemyMat = new THREE.MeshStandardMaterial({ color: 0xaa3333, emissive: 0x331100 });
const enemy = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.5, 0.8), enemyMat);
enemy.castShadow = true;
enemy.position.set(8, 0.75, 8);
scene.add(enemy);

// ========== CÁMARA EN TERCERA PERSONA ==========
let cameraOffset = new THREE.Vector3(-5, 3, 5);
function updateCamera() {
    if (!playerModel) return;
    const targetPos = playerModel.position.clone().add(cameraOffset);
    camera.position.lerp(targetPos, 0.05);
    camera.lookAt(playerModel.position);
}

// ========== CONTROLES WASD (movimiento local, sin backend por ahora) ==========
const keyState = { w: false, s: false, a: false, d: false };
let moveSpeed = 3.5;
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

function updateMovement(delta) {
    let moveX = 0, moveZ = 0;
    if (keyState.w) moveZ -= 1;
    if (keyState.s) moveZ += 1;
    if (keyState.a) moveX -= 1;
    if (keyState.d) moveX += 1;
    if (moveX !== 0 || moveZ !== 0) {
        const len = Math.hypot(moveX, moveZ);
        moveX /= len;
        moveZ /= len;
    }
    let newX = player.position.x + moveX * moveSpeed * delta;
    let newZ = player.position.z + moveZ * moveSpeed * delta;
    // Limitar al área dentro del muro
    newX = Math.max(-22, Math.min(22, newX));
    newZ = Math.max(-22, Math.min(22, newZ));
    player.position.x = newX;
    player.position.z = newZ;
}

// ========== COLISIÓN CON OBJETOS ==========
function checkPickups() {
    items.forEach(item => {
        if (!item.userData.collected) {
            const dist = player.position.distanceTo(item.position);
            if (dist < 0.8) {
                item.userData.collected = true;
                scene.remove(item);
                console.log(`Recogiste: ${item.userData.id}`);
                // Aquí puedes enviar al backend con fetch si quieres
            }
        }
    });
}

// ========== IA DEL ENEMIGO ==========
let enemySpeed = 2.5;
function updateEnemy(delta) {
    const direction = new THREE.Vector3().subVectors(player.position, enemy.position).normalize();
    enemy.position.x += direction.x * enemySpeed * delta;
    enemy.position.z += direction.z * enemySpeed * delta;
    // Limitar enemigo dentro del muro
    enemy.position.x = Math.max(-22, Math.min(22, enemy.position.x));
    enemy.position.z = Math.max(-22, Math.min(22, enemy.position.z));
    const dist = player.position.distanceTo(enemy.position);
    if (dist < 1.2) {
        console.log("GAME OVER - Te atrapó Leatherface");
        // Aquí puedes mostrar un mensaje o recargar
    }
}

// ========== BUCLE PRINCIPAL ==========
let lastTime = performance.now();
function animate() {
    const now = performance.now();
    let delta = Math.min(0.033, (now - lastTime) / 1000);
    lastTime = now;
    updateMovement(delta);
    updateEnemy(delta);
    checkPickups();
    updateCamera();
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}
animate();

// Ajustar cámara al redimensionar
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

console.log("Juego iniciado. Usa WASD para moverte. Recoge objetos. Huye del cubo rojo.");