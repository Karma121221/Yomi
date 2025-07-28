import os
import re
import json
from typing import List, Dict, Any, Tuple
from dotenv import load_dotenv
import requests

from ocr_az import AzureOCR

load_dotenv()

class FuriganaGenerator:
    def __init__(self):
        """Initialize Furigana Generator with OCR and dictionary capabilities"""
        self.ocr = AzureOCR()
        
        try:
            import pykakasi
            self.kakasi = pykakasi.kakasi()
            self.has_kakasi = True
        except ImportError:
            print("Warning: pykakasi not installed. Install with: pip install pykakasi")
            self.has_kakasi = False
        
        try:
            import MeCab
            self.mecab = MeCab.Tagger("-Owakati")
            self.has_mecab = True
        except ImportError:
            print("Warning: MeCab not available. Using basic tokenization.")
            self.has_mecab = False
        
        self.kanji_pattern = re.compile(r'[\u4e00-\u9faf]+')
        self.hiragana_pattern = re.compile(r'[\u3040-\u309f]+')
        self.katakana_pattern = re.compile(r'[\u30a0-\u30ff]+')

    def extract_text_with_furigana(self, image_path: str) -> Dict[str, Any]:
        """
        Extract text from image and add furigana annotations
        
        Args:
            image_path (str): Path to the image file
            
        Returns:
            Dict containing original OCR results plus furigana annotations
        """
        ocr_result = self.ocr.extract_text_from_image(image_path)
        
        furigana_result = {
            'original_ocr': ocr_result,
            'furigana_text': '',
            'furigana_lines': [],
            'furigana_pages': []
        }
        
        for page in ocr_result['pages']:
            furigana_page = {
                'page_number': page['page_number'],
                'width': page['width'],
                'height': page['height'],
                'lines': []
            }
            
            for line_info in page['lines']:
                original_text = line_info['text']
                furigana_line = self._add_furigana_to_text(original_text)
                
                furigana_line_info = {
                    'original_text': original_text,
                    'furigana_text': furigana_line['text'],
                    'furigana_parts': furigana_line['parts'],
                    'bounding_box': line_info['bounding_box'],
                    'confidence': line_info['confidence']
                }
                
                furigana_page['lines'].append(furigana_line_info)
            
            furigana_result['furigana_pages'].append(furigana_page)
        
        all_furigana_lines = []
        for page in furigana_result['furigana_pages']:
            for line in page['lines']:
                all_furigana_lines.append(line['furigana_text'])
        
        furigana_result['furigana_text'] = '\n'.join(all_furigana_lines)
        furigana_result['furigana_lines'] = all_furigana_lines
        
        return furigana_result

    def _add_furigana_to_text(self, text: str) -> Dict[str, Any]:
        """
        Add furigana to Japanese text with contextual accuracy
        
        Args:
            text (str): Japanese text
            
        Returns:
            Dict with furigana-annotated text and parts
        """
        if not self.has_kakasi:
            return {
                'text': text,
                'parts': [{'text': text, 'reading': '', 'type': 'unknown'}]
            }
        
        parts = self._tokenize_and_analyze(text)
        
        furigana_text_parts = []
        for part in parts:
            if part['type'] == 'kanji' and part['reading']:
                furigana_text_parts.append(f"{part['text']}({part['reading']})")
            else:
                furigana_text_parts.append(part['text'])
        
        return {
            'text': ''.join(furigana_text_parts),
            'parts': parts
        }

    def _tokenize_and_analyze(self, text: str) -> List[Dict[str, str]]:
        """
        Tokenize Japanese text and determine readings for each part
        
        Args:
            text (str): Japanese text to analyze
            
        Returns:
            List of text parts with type and reading information
        """
        parts = []
        
        if self.has_mecab:
            parts = self._mecab_tokenize(text)
        else:
            parts = self._kakasi_tokenize(text)
        
        return parts

    def _mecab_tokenize(self, text: str) -> List[Dict[str, str]]:
        """Tokenize using MeCab for better accuracy"""
        parts = []
        
        parsed = self.mecab.parse(text)
        words = parsed.strip().split()
        
        for word in words:
            if not word:
                continue
                
            part_info = self._analyze_word(word)
            parts.append(part_info)
        
        return parts

    def _kakasi_tokenize(self, text: str) -> List[Dict[str, str]]:
        """Tokenize using kakasi as fallback"""
        parts = []
        
        try:
            result = self.kakasi.convert(text)
            
            for item in result:
                orig = item.get('orig', '')
                hira = item.get('hira', '')
                
                part_info = {
                    'text': orig,
                    'reading': hira if hira != orig else '',
                    'type': self._classify_text_type(orig)
                }
                parts.append(part_info)
                
        except Exception as e:
            parts.append({
                'text': text,
                'reading': '',
                'type': 'unknown'
            })
        
        return parts

    def _analyze_word(self, word: str) -> Dict[str, str]:
        """Analyze a single word and determine its reading"""
        text_type = self._classify_text_type(word)
        
        if text_type == 'kanji' and self.has_kakasi:
            try:
                result = self.kakasi.convert(word)
                if result:
                    reading = ''.join([item.get('hira', '') for item in result])
                    return {
                        'text': word,
                        'reading': reading if reading != word else '',
                        'type': text_type
                    }
            except:
                pass
        
        return {
            'text': word,
            'reading': '',
            'type': text_type
        }

    def _classify_text_type(self, text: str) -> str:
        """Classify text as kanji, hiragana, katakana, or other"""
        if not text:
            return 'unknown'
        
        kanji_count = len(self.kanji_pattern.findall(text))
        hiragana_count = len(self.hiragana_pattern.findall(text))
        katakana_count = len(self.katakana_pattern.findall(text))
        
        total_japanese = kanji_count + hiragana_count + katakana_count
        
        if kanji_count > 0:
            return 'kanji'
        elif hiragana_count > 0:
            return 'hiragana'
        elif katakana_count > 0:
            return 'katakana'
        elif total_japanese == 0:
            return 'other'
        else:
            return 'mixed'

    def generate_html_furigana(self, furigana_result: Dict[str, Any]) -> str:
        """
        Generate HTML with proper furigana formatting using ruby tags
        
        Args:
            furigana_result: Result from extract_text_with_furigana
            
        Returns:
            HTML string with ruby furigana annotations
        """
        html_parts = ['<div class="furigana-text">']
        
        for page in furigana_result['furigana_pages']:
            html_parts.append(f'<div class="page" data-page="{page["page_number"]}">')
            
            for line in page['lines']:
                html_parts.append('<div class="line">')
                
                for part in line['furigana_parts']:
                    if part['type'] == 'kanji' and part['reading']:
                        # Use HTML ruby tags for proper furigana display
                        html_parts.append(f'<ruby>{part["text"]}<rt>{part["reading"]}</rt></ruby>')
                    else:
                        html_parts.append(part['text'])
                
                html_parts.append('</div>')
            
            html_parts.append('</div>')
        
        html_parts.append('</div>')
        
        css = """
        <style>
        .furigana-text {
            font-family: 'Noto Sans JP', 'Hiragino Sans', 'Yu Gothic', sans-serif;
            line-height: 2;
            font-size: 18px;
        }
        .page {
            margin-bottom: 20px;
            padding: 10px;
            border: 1px solid #ddd;
        }
        .line {
            margin-bottom: 10px;
        }
        ruby {
            ruby-align: center;
        }
        rt {
            font-size: 0.7em;
            color: #666;
        }
        </style>
        """
        
        return css + '\n' + '\n'.join(html_parts)

    def extract_text_simple_with_furigana(self, image_path: str) -> str:
        """
        Simple method to get furigana text as string
        
        Args:
            image_path (str): Path to the image file
            
        Returns:
            str: Text with furigana in format 漢字(かんじ)
        """
        result = self.extract_text_with_furigana(image_path)
        return result['furigana_text']

def main():
    """Example usage of the FuriganaGenerator class"""
    try:
        furigana_gen = FuriganaGenerator()
        
        image_path = input("Enter path to Japanese image file: ").strip()
        
        if not os.path.exists(image_path):
            print(f"Error: File {image_path} not found")
            return
        
        print("Processing image and generating furigana...")
        
        result = furigana_gen.extract_text_with_furigana(image_path)
        
        print("\n" + "="*50)
        print("FURIGANA OCR RESULTS")
        print("="*50)
        
        print(f"\nOriginal Text:")
        print("-" * 30)
        print(result['original_ocr']['full_text'])
        
        print(f"\nText with Furigana:")
        print("-" * 30)
        print(result['furigana_text'])
        
        print(f"\nDetailed Breakdown:")
        print("-" * 30)
        for page in result['furigana_pages']:
            print(f"\nPage {page['page_number']}:")
            for i, line in enumerate(page['lines'], 1):
                print(f"  Line {i}:")
                print(f"    Original: {line['original_text']}")
                print(f"    Furigana: {line['furigana_text']}")
                
                kanji_parts = [p for p in line['furigana_parts'] if p['type'] == 'kanji' and p['reading']]
                if kanji_parts:
                    print(f"    Kanji readings:")
                    for part in kanji_parts:
                        print(f"      {part['text']} → {part['reading']}")
        
        html_output = furigana_gen.generate_html_furigana(result)
        html_filename = os.path.splitext(os.path.basename(image_path))[0] + "_furigana.html"
        
        with open(html_filename, 'w', encoding='utf-8') as f:
            f.write(html_output)
        
        print(f"\nHTML furigana file saved as: {html_filename}")
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()