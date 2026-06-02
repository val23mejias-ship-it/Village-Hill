from flask import Flask, render_template, request, jsonify

app = Flask(__name__)
app.secret_key = 'clave-provisional'

# Simulación de estado del juego
noise = 0
inventory = []

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/make_decision', methods=['POST'])
def make_decision():
    global noise, inventory
    data = request.get_json()
    action = data.get('action')
    
    if action == 'take_key':
        if 'llave' not in inventory:
            inventory.append('llave')
        message = "Tomaste la llave sigilosamente. Ruido sin cambios."
    elif action == 'take_saw':
        noise += 30
        message = "¡Agarraste la motosierra! Ruido +30%"
    else:
        message = "Acción no reconocida"
    
    game_over = noise >= 100
    
    return jsonify({
        'noise_level': noise,
        'game_over': game_over,
        'inventory': {'items': inventory},
        'message': message
    })

if __name__ == '__main__':
    app.run(debug=True)