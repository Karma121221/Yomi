import os
import requests
import json
from typing import List, Dict, Any
from dotenv import load_dotenv

load_dotenv()

class AzureOCR:
    def __init__(self):
        """Initialize Azure OCR client with credentials from .env file"""
        self.endpoint = os.getenv('AZURE_OCR_ENDPOINT')
        self.key = os.getenv('AZURE_OCR_KEY')
        
        if not self.endpoint or not self.key:
            raise ValueError("Azure OCR endpoint and key must be set in .env file")
        
        self.endpoint = self.endpoint.rstrip('/')
        
        self.ocr_url = f"{self.endpoint}/vision/v3.2/read/analyze"
        
        self.headers = {
            'Ocp-Apim-Subscription-Key': self.key,
            'Content-Type': 'application/octet-stream'
        }

    def extract_text_from_image(self, image_path: str) -> Dict[str, Any]:
        """
        Extract Japanese text from an image file
        
        Args:
            image_path (str): Path to the image file
            
        Returns:
            Dict containing extracted text and metadata
        """
        try:
            with open(image_path, 'rb') as image_file:
                image_data = image_file.read()
            
            response = requests.post(
                self.ocr_url,
                headers=self.headers,
                data=image_data
            )
            
            if response.status_code != 202:
                raise Exception(f"OCR request failed: {response.status_code} - {response.text}")
            
            operation_location = response.headers.get('Operation-Location')
            if not operation_location:
                raise Exception("No operation location received")
            
            result = self._poll_for_result(operation_location)
            
            return self._parse_ocr_result(result)
            
        except FileNotFoundError:
            raise FileNotFoundError(f"Image file not found: {image_path}")
        except Exception as e:
            raise Exception(f"OCR processing failed: {str(e)}")

    def _poll_for_result(self, operation_location: str) -> Dict[str, Any]:
        """Poll the operation location until OCR processing is complete"""
        import time
        
        headers = {'Ocp-Apim-Subscription-Key': self.key}
        
        while True:
            response = requests.get(operation_location, headers=headers)
            
            if response.status_code != 200:
                raise Exception(f"Failed to get OCR result: {response.status_code}")
            
            result = response.json()
            status = result.get('status')
            
            if status == 'succeeded':
                return result
            elif status == 'failed':
                raise Exception("OCR processing failed on Azure side")
            elif status in ['notStarted', 'running']:
                time.sleep(1) 
            else:
                raise Exception(f"Unknown status: {status}")

    def _parse_ocr_result(self, result: Dict[str, Any]) -> Dict[str, Any]:
        """Parse OCR result and extract text with metadata"""
        parsed_result = {
            'full_text': '',
            'lines': [],
            'pages': [],
            'reading_direction': 'auto-detected'
        }
        
        analyze_result = result.get('analyzeResult', {})
        read_results = analyze_result.get('readResults', [])
        
        all_text_lines = []
        
        for page_idx, page in enumerate(read_results):
            page_info = {
                'page_number': page_idx + 1,
                'width': page.get('width', 0),
                'height': page.get('height', 0),
                'lines': []
            }
            
            lines = page.get('lines', [])
            for line in lines:
                text = line.get('text', '')
                bounding_box = line.get('boundingBox', [])
                
                line_info = {
                    'text': text,
                    'bounding_box': bounding_box,
                    'confidence': self._calculate_line_confidence(line)
                }
                
                page_info['lines'].append(line_info)
                all_text_lines.append(text)
            
            parsed_result['pages'].append(page_info)
        
        parsed_result['full_text'] = '\n'.join(all_text_lines)
        parsed_result['lines'] = all_text_lines
        
        return parsed_result

    def _calculate_line_confidence(self, line: Dict[str, Any]) -> float:
        """Calculate average confidence for a line based on word confidences"""
        words = line.get('words', [])
        if not words:
            return 0.0
        
        confidences = [word.get('confidence', 0.0) for word in words]
        return sum(confidences) / len(confidences) if confidences else 0.0

    def extract_text_simple(self, image_path: str) -> str:
        """
        Simple method to extract just the text as a string
        
        Args:
            image_path (str): Path to the image file
            
        Returns:
            str: Extracted text
        """
        result = self.extract_text_from_image(image_path)
        return result['full_text']

def main():
    """Example usage of the AzureOCR class"""
    try:
        ocr = AzureOCR()
        
        image_path = input("Enter path to Japanese image file: ").strip()
        
        if not os.path.exists(image_path):
            print(f"Error: File {image_path} not found")
            return
        
        print("Processing image with Azure OCR...")
        
        result = ocr.extract_text_from_image(image_path)
        
        print("\n" + "="*50)
        print("OCR RESULTS")
        print("="*50)
        
        print(f"\nExtracted Text:")
        print("-" * 30)
        print(result['full_text'])
        
        print(f"\nNumber of pages: {len(result['pages'])}")
        print(f"Total lines detected: {len(result['lines'])}")
        
        print(f"\nDetailed Results:")
        print("-" * 30)
        for page in result['pages']:
            print(f"\nPage {page['page_number']} ({page['width']}x{page['height']}):")
            for i, line in enumerate(page['lines'], 1):
                confidence = line['confidence']
                print(f"  Line {i} (conf: {confidence:.2f}): {line['text']}")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()