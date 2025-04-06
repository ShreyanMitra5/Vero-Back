import nltk

try:
    nltk.data.find('tokenizers/punkt')
    print('punkt is downloaded')
except LookupError:
    print('punkt is NOT downloaded')
    
try:
    nltk.data.find('corpora/stopwords')
    print('stopwords are downloaded')
except LookupError:
    print('stopwords are NOT downloaded')
