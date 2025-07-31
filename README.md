# Yomi 方 - Japanese Text Recognition & Learning Tool

A modern web application that extracts Japanese text from images using OCR, adds furigana annotations, and provides comprehensive kanji information to help with Japanese language learning.

## 🌟 Features

### Text Extraction
- **Image OCR**: Upload images containing Japanese text for automatic extraction using Azure Computer Vision
- **Direct Text Input**: Paste Japanese text directly for processing
- **Smart Text Orientation**: Automatically detects and handles both vertical and horizontal text layouts

### Furigana Generation
- **Automatic Furigana**: Adds reading annotations (furigana) to kanji characters
- **Multiple Display Modes**: 
  - Traditional ruby text format (漢字 with furigana above)
  - Bracket format (漢字(かんじ))
- **Contextual Accuracy**: Uses MeCab and PyKakasi for accurate readings

### Kanji Information System
- **Comprehensive Kanji Data**: Detailed information for each kanji including:
  - English meanings
  - On'yomi (音読み) and Kun'yomi (訓読み) readings
  - JLPT levels
  - Stroke counts
- **Smart Kanji Extraction**: Automatically identifies and lists all unique kanji from processed text
- **Multiple Sorting Options**:
  - Chronological order (as they appear)
  - JLPT level (easy to hard / hard to easy)
  - Stroke count (ascending / descending)

### Audio Features
- **Text-to-Speech**: Listen to Japanese pronunciation using Azure Speech Services
- **Per-sentence Audio**: Play audio for individual sentences or text segments

### Translation
- **English Translation**: Automatic translation of Japanese text to English using Azure Translator

### User Experience
- **Dark/Light Mode**: Toggle between dark and light themes
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Confidence Scoring**: OCR confidence indicators for extracted text accuracy
- **Interactive Sidebar**: Collapsible kanji information panel

## 🚀 Live Demo

Visit the live application at: [Vercel](https://yomi-kata.vercel.app/)

## 📸 Screenshots

![Alt text](screenshots\1.png)

![Alt text](screenshots\2.png)

![Alt text](screenshots\3.png)

![Alt text](screenshots\4.png)

![Alt text](screenshots\5.png)

## 🛠️ Technology Stack

### Backend
- **Flask**: Python web framework
- **Azure Computer Vision**: OCR text extraction
- **Azure Speech Services**: Text-to-speech functionality
- **Azure Translator**: Text translation services
- **MeCab**: Japanese morphological analyzer
- **PyKakasi**: Japanese text processing
- **CORS Support**: Cross-origin resource sharing

### Frontend
- **React**: Modern JavaScript framework
- **Axios**: HTTP client for API requests
- **CSS3**: Modern styling with dark/light theme support
- **Responsive Design**: Mobile-first approach

### APIs & Services
- **KanjiAPI.dev**: Kanji character information
- **Azure Cognitive Services**: OCR, TTS, and translation

## 📋 Prerequisites

- Python 3.8+
- Node.js 14+
- Azure Cognitive Services account
- Environment variables for API keys

## 🔧 Installation

### Backend Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd Yomi
```

2. Install Python dependencies:
```bash
pip install -r requirements.txt
```

3. Set up environment variables in `.env`:
```env
AZURE_OCR_ENDPOINT=your_ocr_endpoint
AZURE_OCR_KEY=your_ocr_key
TTS_AZURE_ENDPOINT=your_tts_endpoint
TTS_AZURE_KEY=your_tts_key
TL_AZURE_ENDPOINT=your_translator_endpoint
TL_AZURE_KEY=your_translator_key
```

4. Run the Flask backend:
```bash
python app.py
```

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

## 📝 Usage

1. **Upload an Image**: Choose an image file containing Japanese text
2. **Or Paste Text**: Directly input Japanese text for processing
3. **View Results**: See extracted text with furigana annotations
4. **Explore Kanji**: Click the kanji list button to view detailed character information
5. **Listen**: Use the audio buttons to hear pronunciation
6. **Translate**: View English translations of the processed text

## 🌍 Supported Formats

### Image Formats
- PNG
- JPG/JPEG
- GIF
- BMP
- WebP

### Text Processing
- Hiragana (ひらがな)
- Katakana (カタカナ)
- Kanji (漢字)
- Mixed Japanese text

## 🔮 Future Enhancements

- Vocabulary list management
- Study session tracking
- Export functionality
- Additional language support
- Offline mode capabilities