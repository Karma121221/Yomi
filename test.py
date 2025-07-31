import os
import requests
from dotenv import load_dotenv

load_dotenv()

def test_azure_tts():
    endpoint = os.getenv('TTS_AZURE_ENDPOINT')
    key = os.getenv('TTS_AZURE_KEY')
    
    print(f"Endpoint: {endpoint}")
    print(f"Key: {key[:10]}...")
    
    # Fix: Use the correct endpoint for Speech Services
    endpoint = endpoint.rstrip('/')
    # Change this line - use the correct Speech Services endpoint
    url = f"{endpoint}/sts/v1.0/issuetoken"  # First get a token
    # Or use direct synthesis endpoint:
    url = f"{endpoint}/cognitiveservices/v1"
    
    # Actually, let's use the correct regional endpoint
    # For Central India, it should be:
    speech_endpoint = "https://centralindia.tts.speech.microsoft.com"
    url = f"{speech_endpoint}/cognitiveservices/v1"
    
    headers = {
        'Ocp-Apim-Subscription-Key': key,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-16khz-32kbitrate-mono-mp3',
        'User-Agent': 'Visual JP TTS Client'
    }
    
    ssml = """
    <speak version='1.0' xml:lang='ja-JP'>
        <voice xml:lang='ja-JP' xml:gender='Female' name='ja-JP-NanamiNeural'>
            こんにちは
        </voice>
    </speak>
    """
    
    response = requests.post(url, headers=headers, data=ssml.encode('utf-8'))
    
    print(f"Status: {response.status_code}")
    print(f"Content-Type: {response.headers.get('content-type')}")
    print(f"Content-Length: {len(response.content)}")
    
    if response.status_code == 200:
        with open('test_audio.mp3', 'wb') as f:
            f.write(response.content)
        print("Audio saved as test_audio.mp3")
    else:
        print(f"Error: {response.text}")

if __name__ == "__main__":
    test_azure_tts()