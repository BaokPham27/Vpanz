// app/(auth)/(quiz)/speed/[setId].tsx
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import QuestionCard from '../../../../../components/Quiz/QuestionCard';
import ResultScreen from '../../../../../components/Quiz/ResultScreen';
import api from '../../../../utils/api';

export default function SpeedRun() {
  const params = useLocalSearchParams<{ setId: string; reset?: string }>();
  const { setId, reset } = params;

  const [cards, setCards] = useState<any[]>([]);
  const [current, setCurrent] = useState(0);
  const [score, setScore] = useState(0);
  const [startTime, setStartTime] = useState(Date.now());
  const [finished, setFinished] = useState(false);

  const fetchCards = useCallback(async () => {
    if (!setId) return;
    try {
      const res = await api.get(`/api/flashcard-sets/${setId}/flashcards`);
      const shuffled = [...res.data].sort(() => Math.random() - 0.5);
      setCards(shuffled);
    } catch (err) {
      console.error('Lỗi tải flashcard:', err);
    }
  }, [setId]);

  // load lần đầu (và khi setId thay đổi)
  useEffect(() => {
    fetchCards();
    // reset local state when loading new set
    setCurrent(0);
    setScore(0);
    setFinished(false);
    setStartTime(Date.now());
  }, [fetchCards]);

  // restart khi param reset thay đổi
  useEffect(() => {
    if (!reset) return;
    // nếu chưa có cards thì fetch lại, còn có thì reshuffle
    if (cards.length > 0) {
      const reshuffled = [...cards].sort(() => Math.random() - 0.5);
      setCards(reshuffled);
    } else {
      fetchCards();
    }
    setCurrent(0);
    setScore(0);
    setFinished(false);
    setStartTime(Date.now());
  }, [reset]); // chỉ dựa vào reset (string) — mỗi lần khác nhau sẽ chạy

  const handleAnswer = (correct: boolean) => {
    if (correct) setScore(s => s + 1);

    if (current < cards.length - 1) {
      setTimeout(() => setCurrent(c => c + 1), 800);
    } else {
      setFinished(true);
    }
  };

  if (finished) {
    const timeUsed = Math.floor((Date.now() - startTime) / 1000);
    return (
      <ResultScreen
        score={score}
        total={cards.length}
        timeUsed={timeUsed}
        mode="speed"
        setId={setId!}
      />
    );
  }

  if (cards.length === 0) {
    return (
      <Text style={{ color: '#fff', textAlign: 'center', marginTop: 120, fontSize: 18 }}>
        Đang tải câu hỏi...
      </Text>
    );
  }

  const currentCard = cards[current];

  return (
    <View style={{ flex: 1, padding: 20, backgroundColor: '#0b1220' }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
        <Text style={{ color: '#fff', fontSize: 17, fontWeight: '600' }}>
          Câu {current + 1}/{cards.length}
        </Text>
        <Text style={{ color: '#60a5fa', fontSize: 17, fontWeight: '600' }}>
          Thời gian: {Math.floor((Date.now() - startTime) / 1000)}s
        </Text>
      </View>

      {/* Câu hỏi + 4 đáp án (1 đúng + 3 sai từ các thẻ khác) */}
      <QuestionCard
        card={currentCard}
        allCards={cards}
        onAnswer={handleAnswer}
      />

      {/* Điểm hiện tại */}
      <View style={{ marginTop: 40, alignItems: 'center' }}>
        <Text style={{ color: '#60a5fa', fontSize: 24, fontWeight: 'bold' }}>
          Điểm: {score}
        </Text>
      </View>
    </View>
  );
}
