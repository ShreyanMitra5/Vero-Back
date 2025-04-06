import requests
import json

# Test article
test_article = """Artificial intelligence (AI) has transformed numerous industries in recent years, from healthcare to transportation. 
In healthcare, AI systems are being used to diagnose diseases more accurately and develop personalized treatment plans. 
The transportation sector has seen the emergence of self-driving cars and smart traffic management systems. 
However, these advances also raise important ethical concerns about privacy, job displacement, and decision-making accountability. 
Many experts argue that we need robust regulations and guidelines to ensure AI is developed and deployed responsibly. 
Some companies are already implementing AI ethics committees and transparency measures to address these concerns. 
The future of AI holds both exciting possibilities and significant challenges that society must carefully navigate."""

# Test the summarize endpoint
try:
    response = requests.post(
        'http://127.0.0.1:4000/api/summarize',
        json={'article': test_article, 'num_sentences': 3}
    )
    
    print(f"Status code: {response.status_code}")
    if response.status_code == 200:
        result = response.json()
        print("\nAPI Response:")
        print(json.dumps(result, indent=2))
    else:
        print(f"Error: {response.text}")
except Exception as e:
    print(f"Exception occurred: {str(e)}")
