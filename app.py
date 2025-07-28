from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import os
import tempfile
from werkzeug.utils import secure_filename
import base64
import requests
import json
from furigana_az import FuriganaGenerator

app = Flask(__name__)
CORS(app)  # Enable CORS for React frontend

# Configure upload settings
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp'}

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# Initialize furigana generator
furigana_gen = FuriganaGenerator()

def translate_text(text, source_lang='ja', target_lang='en'):
    """
    Translate text using LibreTranslate API with improved error handling
    """
    try:
        # Clean and validate input text
        if not text or not text.strip():
            return None
        
        text = text.strip()
        
        # Try MyMemory API (free, no key required)
        try:
            mymemory_url = f"https://api.mymemory.translated.net/get?q={requests.utils.quote(text)}&langpair={source_lang}|{target_lang}"
            response = requests.get(mymemory_url, timeout=10)
            
            if response.status_code == 200:
                result = response.json()
                if result.get('responseStatus') == 200:
                    translated_text = result['responseData']['translatedText']
                    if translated_text and translated_text.strip() and translated_text != text:
                        print(f"MyMemory translation successful: {translated_text[:50]}...")
                        return translated_text
        except Exception as e:
            print(f"MyMemory API error: {e}")
        
        # Try LibreTranslate with proper API endpoint
        libretranslate_urls = [
            "https://libretranslate.de/api/v1/translate",
            "https://translate.astian.org/translate"
        ]
        
        data = {
            'q': text,
            'source': source_lang,
            'target': target_lang,
            'format': 'text'
        }
        
        headers = {
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        
        for url in libretranslate_urls:
            try:
                print(f"Trying translation service: {url}")
                response = requests.post(url, json=data, headers=headers, timeout=10)
                
                print(f"Response status: {response.status_code}")
                
                if response.status_code == 200:
                    try:
                        result = response.json()
                        translated_text = result.get('translatedText')
                        if translated_text and translated_text.strip() and translated_text != text:
                            print(f"Translation successful: {translated_text[:50]}...")
                            return translated_text
                    except json.JSONDecodeError as e:
                        print(f"JSON decode error for {url}: {e}")
                        continue
                        
            except Exception as e:
                print(f"Request error for {url}: {e}")
                continue
        
        # If all services fail, return None instead of fallback
        print("All translation services failed")
        return None
            
    except Exception as e:
        print(f"Translation error: {str(e)}")
        return None

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/upload', methods=['POST'])
def upload_file():
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if not allowed_file(file.filename):
            return jsonify({'error': 'Invalid file type. Please upload an image.'}), 400
        
        # Save uploaded file temporarily
        filename = secure_filename(file.filename)
        temp_dir = tempfile.gettempdir()
        temp_path = os.path.join(temp_dir, filename)
        file.save(temp_path)
        
        try:
            # Process image with furigana generator
            result = furigana_gen.extract_text_with_furigana(temp_path)
            
            # Translate the original text to English
            original_text = result['original_ocr']['full_text']
            translated_text = translate_text(original_text, 'ja', 'en')
            
            # Format response for frontend
            response_data = {
                'success': True,
                'original_text': original_text,
                'furigana_text': result['furigana_text'],
                'translated_text': translated_text,
                'pages': []
            }
            
            # Process each page for detailed display
            for page in result['furigana_pages']:
                page_data = {
                    'page_number': page['page_number'],
                    'lines': []
                }
                
                for line in page['lines']:
                    line_data = {
                        'original': line['original_text'],
                        'furigana': line['furigana_text'],
                        'parts': line['furigana_parts'],
                        'confidence': line['confidence']
                    }
                    page_data['lines'].append(line_data)
                
                response_data['pages'].append(page_data)
            
            return jsonify(response_data)
            
        finally:
            # Clean up temporary file
            if os.path.exists(temp_path):
                os.remove(temp_path)
    
    except Exception as e:
        return jsonify({'error': f'Processing failed: {str(e)}'}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy', 'message': 'Furigana API is running'})

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
