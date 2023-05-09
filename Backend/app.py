from flask import Flask
app = Flask(__name__)

@app.route('/')
def start():
    return "Hello John!"

@app.route('/api/process_data/')
