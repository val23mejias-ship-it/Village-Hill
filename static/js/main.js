import * as THREE from 'three';

// ---------- 1. Configuración de la escena ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020210);
scene.fog = new THREE.FogExp2(0x020210, 0.04);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 1.65, 2.8);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// ---------- 2. Luces ----------
// Linterna (spot que sigue al mouse)
const flashlight = new THREE.SpotLight(0xffbb77, 1.4);
flashlight.angle = 0.45;
flashlight.penumbra = 0.4;
flashlight.distance = 12;
flashlight.castShadow = true;
flashlight.shadow.mapSize.width = 1024;
flashlight.shadow.mapSize.height = 1024;
scene.add(flashlight);
scene.add(flashlight.target);

// Luz ambiental muy tenue
const ambient = new THREE.AmbientLight(0x331111, 0.25);
scene.add(ambient);

// Luz de relleno desde atrás (para no perder detalles)
const backFill = new THREE.PointLight(0x553333, 0.3);
backFill.position.set(-1, 1.5, -2);
scene.add(backFill);

// ---------- 3. Elementos de la habitación (paredes, suelo, objetos) ----------
const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x442222, roughness: 0.7, metalness: 0.1 });
const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x2a1515, roughness: 0.85 });

// Suelo
const floor = new THREE.Mesh(new THREE.PlaneGeometry(7, 7), floorMaterial);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -0.6;
floor.receiveShadow = true;
scene.add(floor);

// Pared trasera
const backWall = new THREE.Mesh(new THREE.BoxGeometry(7, 3.2, 0.2), wallMaterial);
backWall.position.set(0, 1.2, -3.2);
backWall.receiveShadow = true;
scene.add(backWall);

// Pared izquierda
const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.2, 3.2, 5.5), wallMaterial);
leftWall.position.set(-3.2, 1.2, 0);
leftWall.receiveShadow = true;
scene.add(leftWall);

// Pared derecha
const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.2, 3.2, 5.5), wallMaterial);
rightWall.position.set(3.2, 1.2, 0);
rightWall.receiveShadow = true;
scene.add(rightWall);

// Mesa
const tableMat = new THREE.MeshStandardMaterial({ color: 0x7a4a2a, roughness: 0.6 });
const table = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.25, 0.9), tableMat);
table.position.set(1.3, -0.45, 0.6);
table.castShadow = true;
table.receiveShadow = true;
scene.add(table);

// Llave (dorada)
const keyMat = new THREE.MeshStandardMaterial({ color: 0xffaa44, metalness: 0.7, roughness: 0.3 });
const key = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.04, 16, 32), keyMat);
key.rotation.x = Math.PI / 2;
key.position.set(1.3, -0.2, 0.6);
scene.add(key);

// Motosierra (agrupada)
const sawGroup = new THREE.Group();
const sawBody = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.2, 0.7), new THREE.MeshStandardMaterial({ color: 0xaa3333, metalness: 0.5 }));
sawBody.castShadow = true;
sawGroup.add(sawBody);
const sawHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.35, 6), new THREE.MeshStandardMaterial({ color: 0x222222 }));
sawHandle.position.set(0.2, 0.1, 0.25);
sawHandle.castShadow = true;
sawGroup.add(sawHandle);
const sawBlade = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.9), new THREE.MeshStandardMaterial({ color: 0xccccdd, metalness: 0.8 }));
sawBlade.position.set(0, 0.05, -0.4);
sawBlade.castShadow = true;
sawGroup.add(sawBlade);
sawGroup.position.set(-2.5, -0.5, -1.4);
sawGroup.rotation.z = 0.2;
scene.add(sawGroup);

// Una silla adicional para ambientar
const chairMat = new THREE.MeshStandardMaterial({ color: 0x6a3a1a });
const chairSeat = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.1, 0.6), chairMat);
chairSeat.position.set(-1.5, -0.3, -2);
chairSeat.castShadow = true;
scene.add(chairSeat);
const chairBack = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.1), chairMat);
chairBack.position.set(-1.5, 0.1, -2.3);
chairBack.castShadow = true;
scene.add(chairBack);

// ---------- 4. Control de linterna con mouse ----------
let mouseX = 0, mouseY = 0;
document.addEventListener('mousemove', (event) => {
    mouseX = (event.clientX / window.innerWidth) * 2 - 1;
    mouseY = (event.clientY / window.innerHeight) * 2 - 1;
    flashlight.rotation.x = -mouseY * 0.45;
    flashlight.rotation.y = mouseX * 0.7;
});

// Parpadeo aleatorio de la linterna (efecto de tensión)
setInterval(() => {
    if (Math.random() < 0.12) {
        flashlight.intensity = 0.7;
        setTimeout(() => { flashlight.intensity = 1.4; }, 70);
    }
}, 250);

// ---------- 5. Sonidos (opcionales, si los archivos existen) ----------
let ambientSound = null;
let chainsawSound = null;

try {
    ambientSound = new Howl({
        src: ['/static/assets/sounds/ambient.mp3'],
        loop: true,
        volume: 0.35,
        autoplay: true
    });
} catch(e) { console.log("Sonido ambiente no encontrado"); }

function playChainsaw() {
    if (!chainsawSound) {
        chainsawSound = new Howl({ src: ['/static/assets/sounds/chainsaw.mp3'], volume: 0.7 });
    }
    if (!chainsawSound.playing()) chainsawSound.play();
}

// ---------- 6. Animación y actualización de la linterna ----------
function animate() {
    requestAnimationFrame(animate);
    // La linterna sigue la posición de la cámara (delante)
    flashlight.position.copy(camera.position);
    flashlight.position.y = camera.position.y - 0.1;
    const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    flashlight.target.position.copy(camera.position.clone().add(direction.multiplyScalar(2)));
    renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------- 7. Lógica de UI y comunicación con backend ----------
const noiseSpan = document.getElementById('noise');
const panicFill = document.getElementById('panic-fill');
const invSpan = document.getElementById('inv-items');
const btnKey = document.getElementById('btnKey');
const btnSaw = document.getElementById('btnSaw');
const decisionPanel = document.getElementById('decision-panel');

// Función para mostrar flash rojo
function redFlash() {
    const flashDiv = document.createElement('div');
    flashDiv.className = 'flash-red';
    document.body.appendChild(flashDiv);
    setTimeout(() => flashDiv.remove(), 250);
}

// Función para actualizar la interfaz según datos del backend
function updateUI(data) {
    if (data.noise_level !== undefined) {
        const noiseVal = Math.min(100, Math.max(0, data.noise_level));
        noiseSpan.innerText = noiseVal;
        panicFill.style.width = noiseVal + '%';
        // Si el ruido supera 70, reproducir motosierra y flash
        if (noiseVal >= 70) {
            playChainsaw();
            if (noiseVal % 15 < 5) redFlash(); // flash intermitente
        }
    }
    if (data.inventory) {
        const items = data.inventory.items || [];
        if (items.length === 0) invSpan.innerText = 'Ninguno';
        else invSpan.innerText = items.join(', ');
    }
    if (data.message) {
        // Mostrar mensaje temporal en el panel de decisiones
        const msgDiv = document.createElement('div');
        msgDiv.style.color = '#faa';
        msgDiv.style.marginTop = '8px';
        msgDiv.style.fontSize = '0.9rem';
        msgDiv.innerText = `⚠️ ${data.message}`;
        decisionPanel.appendChild(msgDiv);
        setTimeout(() => msgDiv.remove(), 2000);
    }
    if (data.game_over) {
        // Game Over: bloquear botones y mostrar reinicio
        btnKey.disabled = true;
        btnSaw.disabled = true;
        decisionPanel.innerHTML = `
            <p style="color:#f44; font-size:1.4rem;">💀 LEATHERFACE TE ENCONTRÓ 💀</p>
            <p>Has hecho demasiado ruido... Tu pesadilla termina aquí.</p>
            <button onclick="location.reload()">🔪 Volver a intentar</button>
        `;
        if (ambientSound) ambientSound.stop();
        if (chainsawSound) chainsawSound.stop();
        // Añadir un efecto de sangre en la pantalla persistente
        document.body.style.backgroundColor = '#300';
    }
}

async function sendDecision(action) {
    try {
        const response = await fetch('/make_decision', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: action })
        });
        const data = await response.json();
        updateUI(data);
    } catch (err) {
        console.error('Error backend:', err);
        decisionPanel.innerHTML += `<p style="color:#f88;">Error de conexión con el servidor. Asegúrate de que Flask esté corriendo.</p>`;
    }
}

// Asignar eventos a los botones
btnKey.addEventListener('click', () => sendDecision('take_key'));
btnSaw.addEventListener('click', () => sendDecision('take_saw'));

// También se puede simular un estado inicial consultando al backend (opcional)
fetch('/make_decision', { method: 'POST', body: JSON.stringify({ action: 'get_state' }), headers: { 'Content-Type': 'application/json' } })
    .then(res => res.json())
    .then(data => updateUI(data))
    .catch(e => console.log("Esperando backend..."));