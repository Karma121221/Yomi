# Japanese OCR with Furigana - React App

A simple React application that extracts Japanese text from images and adds furigana annotations using Azure Computer Vision API.

## Project Structure

```
Visual JP/
├── app.py                 # Flask backend server
├── furigana_az.py        # Furigana generator (your existing code)
├── ocr_az.py            # Azure OCR functionality (your existing code)
├── requirements.txt      # Python dependencies
├── .env                 # Environment variables
└── frontend/            # React application
    ├── package.json
    ├── public/
    │   └── index.html
    └── src/
        ├── index.js
        ├── index.css
        ├── App.js
        └── App.css
```

## Setup Instructions

### 1. Backend Setup

1. Install Python dependencies:
```bash
pip install -r requirements.txt
```

2. Make sure your `.env` file contains the Azure credentials:
```
AZURE_OCR_ENDPOINT=https://japaneseocrnamit.cognitiveservices.azure.com/
AZURE_OCR_KEY=your_azure_key_here
```

3. Start the Flask backend:
```bash
python app.py
```

The backend will run on `http://localhost:5000`

### 2. Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install Node.js dependencies:
```bash
npm install
```

3. Start the React development server:
```bash
npm start
```

The frontend will run on `http://localhost:3000`

## How to Use

1. Open your browser and go to `http://localhost:3000`
2. Click "Choose Image File" and select a Japanese image
3. Click "Extract Text with Furigana" to process the image
4. View the results with proper furigana annotations

## Features

- **Image Upload**: Drag and drop or select Japanese images
- **OCR Processing**: Extract text using Azure Computer Vision API
- **Furigana Generation**: Automatically add furigana to kanji characters
- **Ruby Text Display**: Proper furigana display using HTML ruby tags
- **Confidence Scores**: Shows OCR confidence for each line
- **Responsive Design**: Works on desktop and mobile devices

## Dependencies

### Backend (Python)
- Flask - Web framework
- Flask-CORS - Cross-origin resource sharing
- requests - HTTP library for Azure API calls
- pykakasi - Japanese text processing for furigana
- python-dotenv - Environment variable management

### Frontend (React)
- React 18 - UI library
- axios - HTTP client for API calls
- react-scripts - Build tools and development server

## API Endpoints

- `GET /` - Serves the main application
- `POST /api/upload` - Upload image and get furigana results
- `GET /api/health` - Health check endpoint

## Notes

- Maximum file size: 16MB
- Supported image formats: PNG, JPG, JPEG, GIF, BMP, WEBP
- The app uses traditional React setup (not Vite or Next.js)
- Furigana accuracy depends on the pykakasi library and context
