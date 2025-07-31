import axios from 'axios';

const API_URL = process.env.NODE_ENV === 'production' 
  ? 'https://yomi-backend.onrender.com/api/tts'
  : 'http://localhost:5000/api/tts';

export const handlePlayAudio = async (text, lineKey, playingAudio, setPlayingAudio, audioLoadingStates, setAudioLoadingStates) => {
  try {
    if (playingAudio) {
      playingAudio.pause();
      setPlayingAudio(null);
    }

    setAudioLoadingStates(prev => ({ ...prev, [lineKey]: true }));

    const response = await axios.post(API_URL, {
      text: text
    }, {
      responseType: 'blob'
    });

    const audioBlob = new Blob([response.data], { type: 'audio/mpeg' });
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    
    audio.onended = () => {
      setPlayingAudio(null);
      URL.revokeObjectURL(audioUrl);
    };

    audio.onerror = () => {
      setPlayingAudio(null);
      URL.revokeObjectURL(audioUrl);
      console.error('Audio playback failed');
    };

    setPlayingAudio(audio);
    await audio.play();

  } catch (error) {
    console.error('TTS request failed:', error);
  } finally {
    setAudioLoadingStates(prev => ({ ...prev, [lineKey]: false }));
  }
};