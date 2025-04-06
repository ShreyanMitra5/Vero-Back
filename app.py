from flask import Flask, request, jsonify
from flask_cors import CORS
import torch
import os

# Import the FakeNewsPredictor class from test2.py
from test2 import FakeNewsPredictor

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Initialize the predictor with the model
model_path = 'model_checkpoint.pt'
predictor = FakeNewsPredictor(model_path)

@app.route('/api/check-fake-news', methods=['POST'])
def check_fake_news():
    """
    API endpoint to check if a headline is fake news
    Expects a JSON with a 'headline' field
    Returns prediction and confidence
    """
    # Get the headline from the request
    data = request.json
    if not data or 'headline' not in data:
        return jsonify({'error': 'No headline provided'}), 400
    
    headline = data['headline']
    
    # Get prediction
    try:
        result = predictor.predict(headline)
        
        # Format the response to match what the Chrome extension expects
        response = {
            'headline': headline,
            'prediction': 'Real News' if result['prediction'] == 'REAL' else 'Fake News',
            'confidence': result['confidence'],
            'fake_probability': result['fake_probability'],
            'real_probability': result['real_probability']
        }
        
        return jsonify(response)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/health', methods=['GET'])
def health_check():
    """Simple health check endpoint"""
    return jsonify({'status': 'ok'})

if __name__ == '__main__':
    # Run the Flask app
    app.run(host='127.0.0.1', port=4000, debug=False)
