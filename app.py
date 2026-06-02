# app.py
# Punto de entrada del servidor Flask.

from flask import Flask
from flask_cors import CORS
from game.routes import game_bp

app = Flask(__name__)
app.secret_key = "texas-chainsaw-secret-key-2024"  # necesario para session

# Permite peticiones del frontend (Three.js en otro puerto)
CORS(app, supports_credentials=True)

# Registrar el blueprint con todas las rutas del juego
app.register_blueprint(game_bp)

@app.route("/")
def index():
    return app.send_static_file("index.html") if False else "API corriendo OK"

if __name__ == "__main__":
    app.run(debug=True, port=5001)