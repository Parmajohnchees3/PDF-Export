from flask import Flask, jsonify, request
from flask_cors import CORS
import json


app = Flask(__name__)
cors = CORS(app, resources={r"/process_rectangles": {"origins": "http://localhost:3000"}})

@app.route('/')
def start():
    return "Hello John!"

@app.route('/process_rectangles', methods = ['POST'])
def handle_rectangles():
    data = request.get_json()
    rectangles = data.get('rectangles')

    print(f'Received rectangles: {rectangles}')  # Print rectangles to console for debugging

    response_data = {'success' : True}
    return jsonify(response_data)

if __name__ == '__main__':
    app.run(debug=True)