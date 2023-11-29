# app.py
from flask import Flask
from mi_script import funcion_principal

app = Flask(__name__)

@app.route('/')
def index():
    resultado = funcion_principal()
    return resultado

if __name__ == '__main__':
    app.run(debug=True)
