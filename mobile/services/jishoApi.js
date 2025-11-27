import { API_BASE_URL } from './config';

export async function searchJapaneseWord(keyword) {
  if (!keyword?.trim()) return [];

  try {
    const response = await fetch(
      `${API_BASE_URL}/api/jishoApi/search?keyword=${encodeURIComponent(keyword)}`
    );

    if (!response.ok) {
      console.error('Server error:', response.status);
      return [];
    }

    const data = await response.json();
    return data.data || data;
  } catch (err) {
    console.error('Error calling API:', err);
    return [];
  }
}

export function getPronunciationUrl(text) {
  if (!text?.trim()) return '';
  return `${API_BASE_URL}/api/jishoApi/audio?text=${encodeURIComponent(text)}`;
}