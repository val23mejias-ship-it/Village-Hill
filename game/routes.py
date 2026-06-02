# game/routes.py
# Define todos los endpoints de la API REST del juego.

from flask import Blueprint, request, jsonify, session
from game.game_state import GameState

game_bp = Blueprint("game", __name__)

# ─── Helper ───────────────────────────────────────────────────────

def get_or_create_state():
    """Obtiene el estado de sesión o crea uno nuevo."""
    if "game_state" not in session:
        session["game_state"] = GameState().__dict__
    # Reconstruir el objeto GameState desde la sesión
    state = GameState.__new__(GameState)
    state.__dict__.update(session["game_state"])
    return state

def save_state(state):
    session["game_state"] = state.__dict__
    session.modified = True

# ─── Endpoints ────────────────────────────────────────────────────

@game_bp.route("/api/new_game", methods=["POST"])
def new_game():
    """Inicia una nueva partida."""
    state = GameState()
    save_state(state)
    return jsonify({
        "success": True,
        "message": "Partida iniciada. Estás en la cabaña. Sobrevive.",
        "state": state.to_dict()
    })


@game_bp.route("/api/state", methods=["GET"])
def get_state():
    """Devuelve el estado actual de la partida."""
    state = get_or_create_state()
    return jsonify(state.to_dict())


@game_bp.route("/api/move", methods=["POST"])
def move():
    """Mueve al jugador en una dirección. Body: { direction: 'north' }"""
    data = request.get_json()
    direction = data.get("direction")

    if not direction:
        return jsonify({"success": False, "message": "Debes indicar una dirección."}), 400

    state = get_or_create_state()

    if state.game_over:
        return jsonify({"success": False, "message": "La partida ya terminó."}), 400

    result = state.move_to_room(direction)
    save_state(state)
    result["state"] = state.to_dict()
    return jsonify(result)


@game_bp.route("/api/pickup", methods=["POST"])
def pickup():
    """Recoge un objeto. Body: { item_id: 'flashlight' }"""
    data = request.get_json()
    item_id = data.get("item_id")

    if not item_id:
        return jsonify({"success": False, "message": "Debes indicar un objeto."}), 400

    state = get_or_create_state()

    if state.game_over:
        return jsonify({"success": False, "message": "La partida ya terminó."}), 400

    result = state.pick_up_item(item_id)
    save_state(state)
    result["state"] = state.to_dict()
    return jsonify(result)


@game_bp.route("/api/decide", methods=["POST"])
def decide():
    """Procesa una decisión. Body: { decision_id: 'hear_chainsaw', option_id: 'hide' }"""
    data = request.get_json()
    decision_id = data.get("decision_id")
    option_id = data.get("option_id")

    if not decision_id or not option_id:
        return jsonify({"success": False, "message": "Faltan parámetros."}), 400

    state = get_or_create_state()

    if state.game_over:
        return jsonify({"success": False, "message": "La partida ya terminó."}), 400

    result = state.make_decision(decision_id, option_id)
    save_state(state)
    result["state"] = state.to_dict()
    return jsonify(result)


@game_bp.route("/api/decisions", methods=["GET"])
def get_decisions():
    """Devuelve todas las decisiones disponibles (para que el frontend las renderice)."""
    from game.models import DECISIONS
    return jsonify(DECISIONS)