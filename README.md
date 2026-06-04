# ESCAPE — Juego de Terror 3D

Juego de terror en primera persona construido con **Three.js** (puro, sin bundler).  
Sin dependencias externas ni modelos .glb — todo es geometría procedural.

---

## Cómo jugar

1. Abre `index.html` con un servidor local (ver abajo).
2. Haz clic en **[ INICIAR ]** y mueve el ratón para activar el pointer lock.
3. Explora el pueblo y **encuentra los 3 objetos** ocultos en la calle.
4. Acércate a cada objeto y presiona **E** para recogerlo.
5. Al tener los 3, el **portón al final de la calle** se abre.
6. Cruza el portón para **escapar y ganar**.

---

## Controles

| Tecla | Acción |
|-------|--------|
| W A S D | Moverse |
| Ratón | Mirar |
| Shift | Correr |
| E | Recoger objeto |
| Click | Recuperar control del ratón |

---

## Ejecutar localmente

Necesitas un servidor HTTP local porque el proyecto usa ES Modules.

### Opción 1 — VS Code Live Server
Instala la extensión **Live Server** y haz clic en "Go Live".

### Opción 2 — Python
```bash
python -m http.server 8080
# Abre: http://localhost:8080
```

### Opción 3 — Node.js
```bash
npx serve .
```

---

## Estructura del proyecto

```
horror-game/
├── index.html          ← Entrada, HUD, pantallas de inicio/victoria
├── README.md
└── src/
    ├── main.js         ← Orquestador: renderer, loop, estado global
    ├── player.js       ← Movimiento FPS, mouse look, head bob
    ├── map.js          ← Mapa procedural: casas, árboles, calle, vallas
    ├── collectibles.js ← 3 objetos coleccionables con animación
    ├── gate.js         ← Portón con animación de apertura
    ├── lighting.js     ← Iluminación nocturna + parpadeo
    └── audio.js        ← Sonidos procedurales (Web Audio API)
```

---

## Características técnicas

- **Geometría 100% procedural** — no requiere archivos .glb ni texturas externas.
- **Web Audio API** — viento, drones, crujidos y latidos generados en tiempo real.
- **Pointer Lock API** — control de ratón en primera persona.
- **Efectos visuales**: niebla exponencial, tone mapping cinemático, sombras suaves, parpadeo de luces, scanlines y viñeta CSS.
- **Optimizado**: materiales compartidos entre instancias, sin carga asíncrona.

---

## Deploy en GitHub Pages

1. Sube la carpeta al repositorio.
2. En **Settings → Pages**, selecciona `main` branch y carpeta raíz `/`.
3. Listo — no hay build step.

---

## Extender con modelos GLB

Si quieres añadir modelos reales:

```javascript
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const loader = new GLTFLoader();
loader.load('models/casa.glb', (gltf) => {
  const modelo = gltf.scene;
  // Clonar para reutilizar:
  const casa = modelo.clone();
  casa.position.set(x, 0, z);
  scene.add(casa);
});
```

Coloca los archivos en `/models/` y reemplaza las funciones `buildHouse()` / `buildTree()` en `map.js`.
