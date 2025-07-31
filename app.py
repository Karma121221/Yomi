from flask import Flask, request, jsonify, send_file
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

def azure_text_to_speech(text):
    """
    Convert Japanese text to speech using Azure Speech Services
    """
    from dotenv import load_dotenv
    load_dotenv()
    
    endpoint = os.getenv('TTS_AZURE_ENDPOINT')
    key = os.getenv('TTS_AZURE_KEY')
    
    if not endpoint or not key:
        raise ValueError("Azure TTS endpoint and key must be set in .env file")
    
    # Remove trailing slash and construct the URL
    endpoint = endpoint.rstrip('/')
    url = f"{endpoint}/cognitiveservices/v1"
    
    headers = {
        'Ocp-Apim-Subscription-Key': key,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-16khz-32kbitrate-mono-mp3',
        'User-Agent': 'Visual JP TTS Client'
    }
    
    # SSML format for Japanese text
    ssml = f"""
    <speak version='1.0' xml:lang='ja-JP'>
        <voice xml:lang='ja-JP' xml:gender='Female' name='ja-JP-NanamiNeural'>
            {text}
        </voice>
    </speak>
    """
    
    response = requests.post(url, headers=headers, data=ssml.encode('utf-8'))
    
    if response.status_code == 200:
        return response.content
    else:
        raise Exception(f"Azure TTS request failed: {response.status_code} - {response.text}")

@app.route('/')
def index():
    """Root endpoint - just return API status instead of trying to render template"""
    return jsonify({
        'message': 'Yomi Backend API',
        'status': 'running',
        'endpoints': {
            'health': '/api/health',
            'upload': '/api/upload',
            'process_text': '/api/process-text',
            'tts': '/api/tts'
        }
    })

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
    Convert Japanese text to speech using Azure Speech Services
    """
    try:
        data = request.get_json()
        text = data.get('text', '').strip()
        
        if not text:
            return jsonify({'error': 'No text provided'}), 400
        
        # Generate audio using Azure Speech Services
        audio_content = azure_text_to_speech(text)
        
        # Create a hash of the text for the filename
        text_hash = hashlib.md5(text.encode('utf-8')).hexdigest()
        
        # Create audio buffer
        audio_buffer = io.BytesIO(audio_content)
        audio_buffer.seek(0)
        
        # Return the audio file
        return send_file(
            audio_buffer,
            mimetype='audio/mpeg',
            as_attachment=False,
            download_name=f'tts_{text_hash}.mp3'
        )
        
    except Exception as e:
        print(f"TTS generation failed: {str(e)}")
        return jsonify({'error': f'TTS generation failed: {str(e)}'}), 500

@app.route('/api/process-text', methods=['POST'])
def process_text():
    """
    Process Japanese text directly without OCR
    """
    try:
        data = request.get_json()
        
        if not data or 'text' not in data:
            return jsonify({'error': 'No text provided'}), 400
        
        text = data['text'].strip()
        
        if not text:
            return jsonify({'error': 'Empty text provided'}), 400
        
        # Split text by periods to create separate lines/sentences
        sentences = []
        current_sentence = ""
        
        for char in text:
            current_sentence += char
            # Split on Japanese periods (。) and regular periods (.)
            if char in ['。', '.']:
                if current_sentence.strip():
                    sentences.append(current_sentence.strip())
                current_sentence = ""
        
        # Add any remaining text as the last sentence
        if current_sentence.strip():
            sentences.append(current_sentence.strip())
        
        # If no periods found, treat the whole text as one sentence
        if not sentences:
            sentences = [text]
        
        # Process each sentence with furigana
        processed_lines = []
        for i, sentence in enumerate(sentences):
            result = furigana_gen._add_furigana_to_text(sentence)
            processed_lines.append({
                'original': sentence,
                'furigana': result['text'],
                'parts': result['parts'],
                'confidence': 1.0
            })
        
        # Translate the complete original text
        translated_text = translate_text(text, 'ja', 'en')
        
        # Create furigana_text by joining all processed sentences
        furigana_text = ' '.join([line['furigana'] for line in processed_lines])
        
        # Format response for frontend
        response_data = {
            'success': True,
            'original_text': text,
            'furigana_text': furigana_text,
            'translated_text': translated_text,
            'pages': [{
                'page_number': 1,
                'lines': processed_lines
            }]
        }
        
        return jsonify(response_data)
        
    except Exception as e:
        return jsonify({'error': f'Processing failed: {str(e)}'}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
