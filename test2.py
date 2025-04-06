import torch
from transformers import BertTokenizer, BertForSequenceClassification
import numpy as np
from torch.serialization import safe_globals, add_safe_globals
from numpy.core.multiarray import _reconstruct

# Add numpy scalar types to safe globals
add_safe_globals([
    _reconstruct,
    np.dtype,
    np._globals._NoValue,
    np.core._multiarray_umath._reconstruct,
    np.ndarray,
    np.ndarray.__new__,
    np.generic,
    np.bool_,
    np.int64,
    np.int32,
    np.int16,
    np.int8,
    np.uint64,
    np.uint32,
    np.uint16,
    np.uint8,
    np.float64,
    np.float32,
    np.float16,
    np.complex128,
    np.complex64,
])

class FakeNewsPredictor:
    def __init__(self, model_path):
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        print(f"Using device: {self.device}")
        
        # Load tokenizer and model
        print("Loading BERT model and tokenizer...")
        self.tokenizer = BertTokenizer.from_pretrained('bert-base-uncased')
        self.model = BertForSequenceClassification.from_pretrained(
            'bert-base-uncased',
            num_labels=2,
            hidden_dropout_prob=0.2,
            attention_probs_dropout_prob=0.2
        )
        
        # Load trained weights with security settings
        print(f"Loading weights from {model_path}")
        try:
            # First try with weights_only=True and safe globals
            with safe_globals():
                checkpoint = torch.load(model_path, map_location=self.device)
        except Exception as e:
            print("Attempting alternative loading method...")
            # If that fails, try with weights_only=False
            checkpoint = torch.load(model_path, map_location=self.device, weights_only=False)
        
        self.model.load_state_dict(checkpoint['model_state_dict'])
        self.model.to(self.device)
        self.model.eval()
        
        print(f"Model loaded successfully! Best validation accuracy: {checkpoint['best_val_acc']:.4f}")

    def preprocess_text(self, text):
        """Clean and preprocess the input text"""
        # Remove special characters and extra whitespace
        text = ' '.join(text.split())
        return text

    def predict(self, text):
        """Predict whether the text is fake news"""
        # Preprocess the text
        text = self.preprocess_text(text)
        
        # Tokenize the text
        inputs = self.tokenizer(
            text,
            truncation=True,
            padding=True,
            max_length=512,
            return_tensors="pt"
        ).to(self.device)
        
        # Get prediction
        with torch.no_grad():
            outputs = self.model(**inputs)
            logits = outputs.logits
            probs = torch.nn.functional.softmax(logits, dim=1)
            prediction = torch.argmax(logits, dim=1).item()
            confidence = probs[0][prediction].item()
        
        # Get probabilities for both classes
        fake_prob = probs[0][1].item()
        real_prob = probs[0][0].item()
        
        return {
            'prediction': 'FAKE' if prediction == 1 else 'REAL',
            'confidence': confidence,
            'fake_probability': fake_prob,
            'real_probability': real_prob
        }

def interactive_testing(predictor):
    """Interactive mode for testing the model with user input"""
    print("\n=== Interactive Testing Mode ===")
    print("Enter news headlines to test (type 'quit' to exit)")
    print("-" * 50)
    
    while True:
        # Get user input
        text = input("\nEnter a news headline: ").strip()
        
        # Check if user wants to quit
        if text.lower() == 'quit':
            break
        
        # Skip empty inputs
        if not text:
            continue
        
        # Get prediction
        result = predictor.predict(text)
        
        # Print results
        print("\nResults:")
        print(f"Prediction: {result['prediction']}")
        print(f"Confidence: {result['confidence']:.2%}")
        print(f"Fake Probability: {result['fake_probability']:.2%}")
        print(f"Real Probability: {result['real_probability']:.2%}")
        print("-" * 50)

def main():
    # Initialize predictor with local model path
    model_path = 'model_checkpoint.pt'  # Make sure this file exists in the same directory
    predictor = FakeNewsPredictor(model_path)
    
    # Run interactive testing
    interactive_testing(predictor)

if __name__ == "__main__":
    main()