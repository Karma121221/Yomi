import requests

def fetch_kanji_info(kanji):
    url = f"https://kanjiapi.dev/v1/kanji/{kanji}"
    response = requests.get(url)

    if response.status_code == 200:
        data = response.json()
        print(f"Kanji: {data.get('kanji')}")
        print(f"Meanings: {', '.join(data.get('meanings', []))}")
        print(f"On'yomi (音読み): {', '.join(data.get('on_readings', []))}")
        print(f"Kun'yomi (訓読み): {', '.join(data.get('kun_readings', []))}")
        print(f"Heisig Keyword: {data.get('heisig_en', 'N/A')}")
        print(f"Grade Level: {data.get('grade', 'N/A')}")
        print(f"Stroke Count: {data.get('stroke_count')}")
        print(f"Mainichi Newspaper Frequency Rank: {data.get('freq_mainichi_shinbun', 'N/A')}")
    else:
        print(f"Failed to fetch data for '{kanji}'. Status code: {response.status_code}")

# Example usage
if __name__ == "__main__":
    kanji_input = input("Enter a kanji: ")
    fetch_kanji_info(kanji_input.strip())
