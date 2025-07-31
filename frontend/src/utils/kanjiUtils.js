export const extractKanji = (text) => {
  if (!text) return [];
  
  // Regex to match kanji characters
  const kanjiRegex = /[\u4e00-\u9faf]/g;
  const kanjiMatches = text.match(kanjiRegex) || [];
  
  // Remove duplicates while preserving order
  const uniqueKanji = [];
  const seen = new Set();
  
  for (const kanji of kanjiMatches) {
    if (!seen.has(kanji)) {
      seen.add(kanji);
      uniqueKanji.push(kanji);
    }
  }
  
  return uniqueKanji;
};

export const fetchKanjiInfo = async (kanji) => {
  try {
    const response = await fetch(`https://kanjiapi.dev/v1/kanji/${kanji}`);
    
    if (response.status === 200) {
      const data = await response.json();
      return {
        success: true,
        data: data
      };
    } else {
      return {
        success: false,
        error: `Failed to fetch data for '${kanji}'. Status code: ${response.status}`
      };
    }
  } catch (error) {
    return {
      success: false,
      error: `Network error: ${error.message}`
    };
  }
};