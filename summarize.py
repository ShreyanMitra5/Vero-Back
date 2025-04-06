import nltk
from nltk.corpus import stopwords
from nltk.tokenize import sent_tokenize, word_tokenize
from string import punctuation
from heapq import nlargest
from collections import defaultdict

# Download required NLTK data
try:
    nltk.data.find('tokenizers/punkt')
    nltk.data.find('corpora/stopwords')
except LookupError:
    nltk.download('punkt')
    nltk.download('stopwords')

def summarize_article(article_text, num_sentences=3):
    try:
        # Tokenize the text into sentences
        sentences = sent_tokenize(article_text)
        
        # Tokenize words and remove stopwords
        stop_words = set(stopwords.words('english') + list(punctuation))
        word_freq = defaultdict(int)
        
        for sentence in sentences:
            for word in word_tokenize(sentence.lower()):
                if word not in stop_words:
                    word_freq[word] += 1
        
        # Calculate sentence scores based on word frequencies
        sentence_scores = defaultdict(int)
        for sentence in sentences:
            for word in word_tokenize(sentence.lower()):
                if word in word_freq:
                    sentence_scores[sentence] += word_freq[word]
        
        # Get the top sentences
        summary_sentences = nlargest(num_sentences, sentence_scores, key=sentence_scores.get)
        
        # Join sentences and return
        return ' '.join(summary_sentences)
    except Exception as e:
        return f"Error: {e}"

# Example usage
article = """Artificial intelligence (AI) has transformed numerous industries in recent years, from healthcare to transportation. 
In healthcare, AI systems are being used to diagnose diseases more accurately and develop personalized treatment plans. 
The transportation sector has seen the emergence of self-driving cars and smart traffic management systems. 
However, these advances also raise important ethical concerns about privacy, job displacement, and decision-making accountability. 
Many experts argue that we need robust regulations and guidelines to ensure AI is developed and deployed responsibly. 
Some companies are already implementing AI ethics committees and transparency measures to address these concerns. 
The future of AI holds both exciting possibilities and significant challenges that society must carefully navigate."""

summary = summarize_article(article)
print("Original text:")
print(article)
print("\nSummary:")
print(summary)