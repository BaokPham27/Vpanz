import { Platform } from 'react-native';
export async function searchJapaneseWord(keyword) {
  if (!keyword || !keyword.trim()) return [];

  const LOCALHOST = Platform.OS === "android" ? "10.0.2.2" : "192.168.1.9";

  try {
    const response = await fetch(
      `http://${LOCALHOST}:5000/api/jishoApi/search?keyword=${encodeURIComponent(keyword)}`
    );

    if (!response.ok) {
      console.error('Server trả về lỗi:', response.status);
      return [];
    }

    const data = await response.json();
    return data.data || data; // tùy server trả về
  } catch (err) {
    console.error('Lỗi khi gọi server Node.js:', err);
    return [];
  }
}

// New: return server audio endpoint URL (no fetching)
export async function getPronunciationUrl(text) {
  if (!text || !text.trim()) return '';

  const LOCALHOST = Platform.OS === "android" ? "10.0.2.2" : "192.168.2.6";


  // Return the server endpoint that proxies the TTS audio.
  // The client can use this URL directly with Audio.Sound.createAsync({ uri }) or with HTML Audio on web
  return `http://${LOCALHOST}:5000/api/jishoApi/audio?text=${encodeURIComponent(text)}`;
}
