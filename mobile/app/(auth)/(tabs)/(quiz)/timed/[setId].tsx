// app/(auth)/(quiz)/timed/[setId].tsx
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import QuestionCard from '../../../../../components/Quiz/QuestionCard';
import ResultScreen from '../../../../../components/Quiz/ResultScreen';
import Timer from '../../../../../components/Quiz/Timer';
import api from '../../../../utils/api';

const INITIAL_TIME = 600; // 10 phút

export default function TimedQuiz() {
  const params = useLocalSearchParams<{ setId: string; reset?: string }>();
  const { setId, reset } = params;

  const [cards, setCards] = useState<any[]>([]);
  const [current, setCurrent] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(INITIAL_TIME);
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

  useEffect(() => {
    fetchCards();
    setCurrent(0);
    setScore(0);
    setFinished(false);
    setTimeLeft(INITIAL_TIME);
  }, [fetchCards]);

  // restart khi reset param thay đổi
  useEffect(() => {
    if (!reset) return;
    if (cards.length > 0) {
      const reshuffled = [...cards].sort(() => Math.random() - 0.5);
      setCards(reshuffled);
    } else {
      fetchCards();
    }
    setCurrent(0);
    setScore(0);
    setFinished(false);
    setTimeLeft(INITIAL_TIME);
  }, [reset]);

  // Đồng hồ đếm ngược
  useEffect(() => {
    if (timeLeft <= 0 || finished) {
      setFinished(true);
      return;
    }
    const timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, finished]);

  const handleAnswer = (correct: boolean) => {
    if (correct) setScore(s => s + 1);

    if (current < cards.length - 1) {
      setTimeout(() => setCurrent(c => c + 1), 800);
    } else {
      setFinished(true);
    }
  };

  if (finished || timeLeft <= 0) {
    return (
      <ResultScreen
        score={score}
        total={cards.length}
        timeUsed={INITIAL_TIME - timeLeft}
        mode="timed"
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
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <Text style={{ color: '#fff', fontSize: 17, fontWeight: '600' }}>
          Câu {current + 1}/{cards.length}
        </Text>
        <Timer seconds={timeLeft} size={52} initialSeconds={INITIAL_TIME} />
      </View>

      {/* Câu hỏi + 4 đáp án */}
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
