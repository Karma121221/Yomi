from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from flask_jwt_extended import jwt_required, get_jwt_identity
import os
import tempfile
from werkzeug.utils import secure_filename
import base64
import requests
import json
from furigana_az import FuriganaGenerator
import io
import hashlib
import uuid
from auth import AuthManager

app = Flask(__name__)
CORS(app)

# Initialize authentication
auth_manager = AuthManager(app)

app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp'}

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

furigana_gen = FuriganaGenerator()

def translate_text(text, source_lang='ja', target_lang='en'):
    """Translate text using Azure Translator Service"""
    try:
        # Get Azure Translator credentials from environment
        endpoint = os.getenv('TL_AZURE_ENDPOINT')
        key = os.getenv('TL_AZURE_KEY')
        region = "centralindia"  # You may need to adjust this based on your Azure region
        
        if not endpoint or not key:
            print("Azure Translator credentials not found")
            return None
            
        # Construct the request
        path = '/translate'
        constructed_url = endpoint + path
        
        params = {
            'api-version': '3.0',
            'from': source_lang,
            'to': [target_lang]
        }
        
        headers = {
            'Ocp-Apim-Subscription-Key': key,
            'Ocp-Apim-Subscription-Region': region,
            'Content-type': 'application/json',
            'X-ClientTraceId': str(uuid.uuid4())
        }
        
        # Request body
        body = [{
            'text': text
        }]
        
        response = requests.post(constructed_url, params=params, headers=headers, json=body)
        
        if response.status_code == 200:
            result = response.json()
            if result and len(result) > 0 and 'translations' in result[0]:
                return result[0]['translations'][0]['text']
        else:
            print(f"Azure Translator API error: {response.status_code}")
            print(f"Response: {response.text}")
            
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

# Authentication routes
@app.route('/api/auth/register', methods=['POST'])
def register():
    """Register a new user"""
    try:
        data = request.get_json()
        result, status_code = auth_manager.register_user(data)
        return jsonify(result), status_code
    except Exception as e:
        return jsonify({'success': False, 'message': 'Internal server error'}), 500

@app.route('/api/auth/login', methods=['POST'])
def login():
    """Login user"""
    try:
        data = request.get_json()
        result, status_code = auth_manager.login_user(data)
        return jsonify(result), status_code
    except Exception as e:
        return jsonify({'success': False, 'message': 'Internal server error'}), 500

@app.route('/api/auth/profile', methods=['GET'])
@jwt_required()
def get_profile():
    """Get user profile"""
    try:
        user_id = get_jwt_identity()
        result, status_code = auth_manager.get_user_profile(user_id)
        return jsonify(result), status_code
    except Exception as e:
        return jsonify({'success': False, 'message': 'Internal server error'}), 500

@app.route('/api/auth/profile/progress', methods=['PUT'])
@jwt_required()
def update_progress():
    """Update user study progress"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        progress_data = data.get('progress', {})
        result, status_code = auth_manager.update_user_progress(user_id, progress_data)
        return jsonify(result), status_code
    except Exception as e:
        return jsonify({'success': False, 'message': 'Internal server error'}), 500

@app.route('/api/auth/verify-token', methods=['GET'])
@jwt_required()
def verify_token():
    """Verify if token is valid"""
    try:
        user_id = get_jwt_identity()
        return jsonify({'success': True, 'user_id': user_id}), 200
    except Exception as e:
        return jsonify({'success': False, 'message': 'Token invalid'}), 401

@app.route('/api/update-profile', methods=['POST'])
@jwt_required()
def update_profile():
    """Update user profile information"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        full_name = data.get('fullName', '').strip()
        username = data.get('username', '').strip()
        
        if not full_name or not username:
            return jsonify({'success': False, 'message': 'Full name and username are required'}), 400
        
        result, status_code = auth_manager.update_user_profile(user_id, full_name, username)
        return jsonify(result), status_code
    except Exception as e:
        return jsonify({'success': False, 'message': 'Internal server error'}), 500

# Kanji Collection Routes
@app.route('/api/kanji/save', methods=['POST'])
@jwt_required()
def save_kanji():
    """Save selected kanji to user's collection"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        kanji_list = data.get('kanji', [])
        
        if not kanji_list:
            return jsonify({'success': False, 'message': 'No kanji provided'}), 400
        
        result, status_code = auth_manager.save_kanji_to_collection(user_id, kanji_list)
        return jsonify(result), status_code
    except Exception as e:
        return jsonify({'success': False, 'message': 'Internal server error'}), 500

@app.route('/api/kanji/saved', methods=['GET'])
@jwt_required()
def get_saved_kanji():
    """Get user's saved kanji collection"""
    try:
        user_id = get_jwt_identity()
        result, status_code = auth_manager.get_user_kanji_collection(user_id)
        return jsonify(result), status_code
    except Exception as e:
        return jsonify({'success': False, 'message': 'Internal server error'}), 500

@app.route('/api/kanji/remove', methods=['DELETE'])
@jwt_required()
def remove_kanji():
    """Remove a kanji from user's collection"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        kanji_char = data.get('kanji')
        
        if not kanji_char:
            return jsonify({'success': False, 'message': 'No kanji provided'}), 400
        
        result, status_code = auth_manager.remove_kanji_from_collection(user_id, kanji_char)
        return jsonify(result), status_code
    except Exception as e:
        return jsonify({'success': False, 'message': 'Internal server error'}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
