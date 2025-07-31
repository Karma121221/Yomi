from flask import Flask, request, jsonify
from flask_cors import CORS
import os

app = Flask(__name__)

# Configure CORS for production
if os.environ.get('VERCEL'):
    CORS(app, origins=["https://yomi-i4j8wjecg-karma121s-projects.vercel.app"])
else:
    CORS(app)

# Your existing routes here...
@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy"})

# Add all your existing routes with /api prefix
@app.route('/api/extract-text', methods=['POST'])
def extract_text():
    # Your existing extract_text function
    pass

@app.route('/api/generate-furigana', methods=['POST'])
def generate_furigana():
    # Your existing generate_furigana function
    pass

# Export for Vercel
if __name__ != '__main__':
    # This is for Vercel
    app = app