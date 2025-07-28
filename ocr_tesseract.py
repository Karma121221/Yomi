import pytesseract
from PIL import Image
import cv2
import numpy as np
import os
from dotenv import load_dotenv
from typing import Optional

load_dotenv()
tesseract_path = os.getenv("TESSERACT_PATH")
if not tesseract_path:
    raise ValueError("TESSERACT_PATH not set in .env file")
pytesseract.pytesseract.tesseract_cmd = tesseract_path

def preprocess_image(image_path: str) -> Optional[np.ndarray]:
    if not os.path.exists(image_path):
        print(f"Error: Image path not found at '{image_path}'")
        return None
    image = cv2.imread(image_path)
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    blurred = cv2.medianBlur(gray, 3)
    thresh = cv2.adaptiveThreshold(
        blurred, 255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY_INV,
        11, 2
    )
    return thresh

def extract_text(image: np.ndarray, lang: str, psm: int) -> str:
    config = f'--oem 1 --psm {psm}'
    pil_img = Image.fromarray(image)
    text = pytesseract.image_to_string(pil_img, lang=lang, config=config)
    return text.strip()

if __name__ == "__main__":
    image_path = "C:\\Users\\Namit\\Downloads\\sa.jpg"
    processed_image = preprocess_image(image_path)
    if processed_image is not None:
        choice = ''
        while choice not in ['v', 'h']:
            choice = input("Is the text vertical or horizontal? (v/h): ").strip().lower()
        if choice == 'v':
            lang = 'jpn_vert'
            psm = 5
            orientation = "Vertical"
        else:
            lang = 'jpn'
            psm = 6
            orientation = "Horizontal"
        print(f"\n🤖 Extracting text using the {orientation} model...")
        extracted_text = extract_text(processed_image, lang=lang, psm=psm)
        print("\n=========================")
        print(f"✅ Extracted Text ({orientation}):")
        print("=========================")
        print(extracted_text if extracted_text else "Could not extract any text.")
