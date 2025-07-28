import pytesseract
from PIL import Image
import cv2
import numpy as np
import os
from dotenv import load_dotenv
from typing import Optional
import pykakasi

load_dotenv()

tesseract_path = os.getenv("TESSERACT_PATH")
if not tesseract_path:
    raise ValueError("TESSERACT_PATH not set in .env file. Please check your .env configuration.")
pytesseract.pytesseract.tesseract_cmd = tesseract_path

def preprocess_image(image_path: str) -> Optional[np.ndarray]:
    if not os.path.exists(image_path):
        print(f"Error: Image path not found at '{image_path}'")
        return None

    image = cv2.imread(image_path)
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    blurred = cv2.medianBlur(gray, 3)
    
    mean_brightness = cv2.mean(blurred)[0]
    
    if mean_brightness < 127:
        thresh = cv2.adaptiveThreshold(
            blurred, 255,
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY, 
            11,
            2
        )
    else:
        thresh = cv2.adaptiveThreshold(
            blurred, 255,
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY_INV,
            11,
            2
        )
    
    return thresh


def extract_text_from_image(image: np.ndarray, lang: str, psm: int) -> str:
    config = f'--oem 1 --psm {psm}'
    pil_img = Image.fromarray(image)
    text = pytesseract.image_to_string(pil_img, lang=lang, config=config)
    return text.strip()


def add_furigana(text: str) -> str:
    if not text:
        return ""
    kks = pykakasi.kakasi() 
    kks.setMode("J", "H")
    kks.setMode("K", "H")
    kks.setMode("E", "H")
    kks.setMode("a", "H")
    kks.setMode("s", True)
    kks.setMode("f", True)
    conv = kks.getConverter()
    result = conv.do(text)
    return result


if __name__ == "__main__":
    image_path = "C:\\Users\\Namit\\Downloads\\ka.png"
    processed_image = preprocess_image(image_path)

    if processed_image is not None:
        choice = ''
        while choice not in ['v', 'h']:
            choice = input("Is the text vertical or horizontal? (v/h): ").strip().lower()

        if choice == 'v':
            lang = 'jpn_vert'
            psm = 4 
            orientation = "Vertical"
        else:
            lang = 'jpn'
            psm = 1
            orientation = "Horizontal"
        
        print(f"\n🤖 Extracting text using the {orientation} model...")

        extracted_text = extract_text_from_image(processed_image, lang=lang, psm=psm)
        print("✍️  Adding furigana to detected kanji...")
        text_with_furigana = add_furigana(extracted_text)

        print("\n=========================")
        print(f"✅ Extracted Text ({orientation}):")
        print("=========================")
        print(extracted_text if extracted_text else "[Could not extract any text.]")
        
        print("\n=========================")
        print("✅ Text with Furigana:")
        print("=========================")
        print(text_with_furigana if text_with_furigana else "[No text to add furigana to.]")