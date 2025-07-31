from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import sys

# Add the backend directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

# Import your existing app
from app import app

# Enable CORS for Vercel
CORS(app, origins=["*"])

# Export the app for Vercel
def handler(request):
    return app(request)

if __name__ == "__main__":
    app.run()