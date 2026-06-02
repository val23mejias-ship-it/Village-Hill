# game/models.py
# Define los datos estáticos del juego: habitaciones, objetos y decisiones.

ROOMS = {
    "cabin_main": {
        "id": "cabin_main",
        "name": "Cabaña Principal",
        "description": "Una cabaña oscura y decrépita. El olor a sangre llena el aire.",
        "exits": {
            "north": "cabin_kitchen",
            "south": "cabin_exit"   # solo se desbloquea si tienes la llave
        },
        "items": ["flashlight", "note"],
        "threats": ["chainsaw_sound"],  # sonidos/eventos de amenaza
    },
    "cabin_kitchen": {
        "id": "cabin_kitchen",
        "name": "Cocina",
        "description": "Utensilios oxidados cuelgan del techo. Algo se movió en las sombras.",
        "exits": {
            "south": "cabin_main"
        },
        "items": ["key", "medkit"],
        "threats": ["leatherface_nearby"],
    },
    "cabin_exit": {
        "id": "cabin_exit",
        "name": "Salida",
        "description": "La puerta trasera. La libertad está al otro lado... si llegas vivo.",
        "exits": {},
        "items": [],
        "threats": [],
        "is_exit": True   # llegar aquí con la llave = victoria
    }
}

ITEMS = {
    "flashlight": {
        "id": "flashlight",
        "name": "Linterna",
        "description": "Una linterna polvorienta. Las baterías aún funcionan.",
        "effect": "reduce_panic",     # al recogerla, baja el pánico
        "effect_value": 15,
        "pickable": True
    },
    "note": {
        "id": "note",
        "name": "Nota ensangrentada",
        "description": "'Él vuelve cuando oyes la motosierra. No corras. No hagas ruido.'",
        "effect": None,
        "pickable": True
    },
    "key": {
        "id": "key",
        "name": "Llave oxidada",
        "description": "Una llave vieja. Probablemente abre algo importante.",
        "effect": None,
        "pickable": True
    },
    "medkit": {
        "id": "medkit",
        "name": "Botiquín",
        "description": "Un botiquín de primeros auxilios a medio usar.",
        "effect": "reduce_panic",
        "effect_value": 20,
        "pickable": True
    }
}

# Decisiones posibles que el jugador puede tomar en ciertos contextos
DECISIONS = {
    "hear_chainsaw": {
        "id": "hear_chainsaw",
        "prompt": "Escuchas la motosierra acercarse. ¿Qué haces?",
        "options": [
            {
                "id": "hide",
                "text": "Esconderte debajo de la mesa",
                "noise_change": -10,    # bajas el ruido
                "panic_change": +5,     # pero el pánico sube un poco
                "success_chance": 0.85  # 85% de sobrevivir esta decisión
            },
            {
                "id": "run",
                "text": "Correr hacia la cocina",
                "noise_change": +25,    # hacer ruido al correr
                "panic_change": +20,
                "success_chance": 0.50
            },
            {
                "id": "freeze",
                "text": "Quedarte paralizado sin moverte",
                "noise_change": 0,
                "panic_change": +15,
                "success_chance": 0.70
            }
        ]
    }
}