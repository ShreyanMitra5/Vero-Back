# Fake News Detection Chrome Extension with Flask API

This project consists of a Chrome extension that analyzes news headlines using a machine learning model to detect potentially fake news, and a Flask API that performs the model inference.

## Project Structure

- `/fake_news/` - Chrome extension files
- `app.py` - Flask API server
- `test2.py` - FakeNewsPredictor class for model inference
- `model_checkpoint.pt` - Trained model checkpoint
- `requirements.txt` - Python dependencies

## Setup Instructions

### 1. Set up the Flask API

1. Install the required Python packages:
   ```
   pip install -r requirements.txt
   ```

2. Run the Flask API server:
   ```
   python app.py
   ```
   The server will run on http://localhost:5000

### 2. Load the Chrome Extension

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in the top-right corner)
3. Click "Load unpacked" and select the `/fake_news` directory
4. The extension should now be installed and active

## Usage

1. Make sure the Flask API is running
2. Visit any news website
3. The extension will automatically analyze headlines on the page
4. Headlines will be marked with a badge indicating whether they are likely real or fake news
5. Hover over the badge to see detailed analysis from the model

## API Endpoints

- `POST /api/check-fake-news` - Analyzes a headline
  - Request body: `{"headline": "Your headline text here"}`
  - Response: JSON with prediction and confidence scores
  
- `GET /health` - Health check endpoint

## Model Information

The system uses a fine-tuned BERT model for sequence classification, trained to detect fake news headlines. The model checkpoint contains the trained weights and configuration.

## Troubleshooting

- If the extension doesn't show badges, check the browser console for errors
- Ensure the Flask API is running at http://localhost:5000
- Check that CORS is properly enabled in the Flask API
