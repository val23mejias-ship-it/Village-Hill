# game/game_state.py
# Gestiona el estado de una partida: posición, inventario, pánico, ruido y fin del juego.

import random
from game.models import ROOMS, ITEMS, DECISIONS


class GameState:
    def __init__(self):
        self.current_room_id = "cabin_main"   # sala inicial
        self.inventory = []                    # objetos que lleva el jugador
        self.panic = 30                        # 0 = calmado, 100 = muerto de miedo
        self.noise = 0                         # 0 = silencioso, 100 = Leatherface te encontró
        self.health = 100                      # 0 = muerto
        self.game_over = False
        self.outcome = None                    # "escape" | "death" | None
        self.visited_rooms = [self.current_room_id]
        self.items_in_rooms = {                # copia mutable de items por sala
            room_id: list(room["items"])
            for room_id, room in ROOMS.items()
        }

    # ─── Consultas ────────────────────────────────────────────────

    def get_current_room(self):
        return ROOMS[self.current_room_id]

    def get_available_items(self):
        """Devuelve los objetos que quedan en la sala actual."""
        item_ids = self.items_in_rooms.get(self.current_room_id, [])
        return [ITEMS[i] for i in item_ids if i in ITEMS]

    def to_dict(self):
        """Serializa el estado completo a dict (para enviar como JSON al frontend)."""
        return {
            "current_room": self.get_current_room(),
            "inventory": self.inventory,
            "available_items": self.get_available_items(),
            "panic": self.panic,
            "noise": self.noise,
            "health": self.health,
            "game_over": self.game_over,
            "outcome": self.outcome,
            "visited_rooms": self.visited_rooms
        }

    # ─── Acciones del jugador ──────────────────────────────────────

    def pick_up_item(self, item_id):
        """Intenta recoger un objeto de la sala actual."""
        room_items = self.items_in_rooms.get(self.current_room_id, [])

        if item_id not in room_items:
            return {"success": False, "message": "Ese objeto no está aquí."}

        item = ITEMS.get(item_id)
        if not item or not item["pickable"]:
            return {"success": False, "message": "No puedes llevarte eso."}

        # Remover de la sala y agregar al inventario
        room_items.remove(item_id)
        self.inventory.append(item_id)

        # Aplicar efecto del objeto
        message = f"Recogiste: {item['name']}. {item['description']}"
        if item.get("effect") == "reduce_panic":
            reduction = item.get("effect_value", 10)
            self.panic = max(0, self.panic - reduction)
            message += f" Tu pánico bajó {reduction} puntos."

        self._check_game_over()
        return {"success": True, "message": message, "item": item}

    def move_to_room(self, direction):
        """Intenta mover al jugador en una dirección."""
        current_room = self.get_current_room()
        exits = current_room.get("exits", {})

        if direction not in exits:
            return {"success": False, "message": "No puedes ir en esa dirección."}

        target_room_id = exits[direction]

        # Verificar si la salida requiere llave
        if target_room_id == "cabin_exit" and "key" not in self.inventory:
            self.panic = min(100, self.panic + 10)
            return {
                "success": False,
                "message": "La puerta está cerrada con llave. Necesitas encontrar la llave."
            }

        # Moverse a la nueva sala
        self.current_room_id = target_room_id
        if target_room_id not in self.visited_rooms:
            self.visited_rooms.append(target_room_id)

        # El movimiento genera algo de ruido
        self.noise = min(100, self.noise + 5)

        new_room = self.get_current_room()
        message = f"Entraste a: {new_room['name']}. {new_room['description']}"

        # ¿Es la salida? → victoria
        if new_room.get("is_exit"):
            self.game_over = True
            self.outcome = "escape"
            message = "¡Escapaste! Corres hacia la oscuridad de la noche. Sobreviviste... por ahora."

        self._check_game_over()
        return {"success": True, "message": message, "room": new_room}

    def make_decision(self, decision_id, option_id):
        """Procesa una decisión del jugador ante un evento."""
        decision = DECISIONS.get(decision_id)
        if not decision:
            return {"success": False, "message": "Decisión no válida."}

        option = next((o for o in decision["options"] if o["id"] == option_id), None)
        if not option:
            return {"success": False, "message": "Opción no válida."}

        # Aplicar cambios de pánico y ruido
        self.panic = max(0, min(100, self.panic + option["panic_change"]))
        self.noise = max(0, min(100, self.noise + option["noise_change"]))

        # Tirada de suerte
        survived = random.random() < option["success_chance"]

        if not survived:
            self.health = max(0, self.health - 40)
            message = "¡Leatherface te encontró! Te hirió gravemente."
            if self.health <= 0:
                self.game_over = True
                self.outcome = "death"
                message = "Leatherface te atrapó. Game over."
        else:
            message = f"Decidiste: {option['text']}. Lograste evitarlo... por ahora."

        self._check_game_over()
        return {
            "success": True,
            "survived": survived,
            "message": message,
            "panic": self.panic,
            "noise": self.noise,
            "health": self.health
        }

    # ─── Lógica interna ───────────────────────────────────────────

    def _check_game_over(self):
        """Verifica condiciones de fin de juego."""
        if self.panic >= 100:
            self.game_over = True
            self.outcome = "death"
        if self.noise >= 100:
            self.game_over = True
            self.outcome = "death"
        if self.health <= 0:
            self.game_over = True
            self.outcome = "death"