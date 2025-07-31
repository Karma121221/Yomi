import React from 'react';

export const renderFuriganaText = (parts) => {
  return parts.map((part, index) => {
    if (part.type === 'kanji' && part.reading) {
      return (
        <ruby key={index} className="furigana-ruby">
          {part.text}
          <rt className="furigana-rt">{part.reading}</rt>
        </ruby>
      );
    } else {
      return <span key={index}>{part.text}</span>;
    }
  });
};