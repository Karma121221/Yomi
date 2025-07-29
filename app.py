from flask import Flask, request, jsonify, render_template, send_file
from flask_cors import CORS
import os
import tempfile
from werkzeug.utils import secure_filename
import base64
import requests
import json
from furigana_az import FuriganaGenerator
import io
import hashlib

# Add GTTS import
try:
    from gtts import gTTS
    GTTS_AVAILABLE = True
except ImportError:
    print("Warning: gTTS not installed. Install with: pip install gtts")
    GTTS_AVAILABLE = False

app = Flask(__name__)
CORS(app)

app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp'}

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

furigana_gen = FuriganaGenerator()

def translate_text(text, source_lang='ja', target_lang='en'):
    """
    Translate text using LibreTranslate API with improved error handling
    """
    try:
        if not text or not text.strip():
            return None
        
        text = text.strip()
        
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
        
        filename = secure_filename(file.filename)
        temp_dir = tempfile.gettempdir()
        temp_path = os.path.join(temp_dir, filename)
        file.save(temp_path)
        
        try:
            result = furigana_gen.extract_text_with_furigana(temp_path)
            
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
            if os.path.exists(temp_path):
                os.remove(temp_path)
    
    except Exception as e:
        return jsonify({'error': f'Processing failed: {str(e)}'}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy', 'message': 'Furigana API is running'})

@app.route('/api/tts', methods=['POST'])
def text_to_speech():
    """
    Convert Japanese text to speech using Google Text-to-Speech
    """
    if not GTTS_AVAILABLE:
        return jsonify({'error': 'Text-to-speech service not available'}), 500
    
    try:
        data = request.get_json()
        text = data.get('text', '').strip()
        
        if not text:
            return jsonify({'error': 'No text provided'}), 400
        
        # Create a hash of the text for caching
        text_hash = hashlib.md5(text.encode('utf-8')).hexdigest()
        
        # Create TTS object
        tts = gTTS(text=text, lang='ja', slow=False)
        
        # Save to a bytes buffer
        audio_buffer = io.BytesIO()
        tts.write_to_fp(audio_buffer)
        audio_buffer.seek(0)
        
        # Return the audio file
        return send_file(
            audio_buffer,
            mimetype='audio/mpeg',
            as_attachment=False,
            download_name=f'tts_{text_hash}.mp3'
        )
        
    except Exception as e:
        return jsonify({'error': f'TTS generation failed: {str(e)}'}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
