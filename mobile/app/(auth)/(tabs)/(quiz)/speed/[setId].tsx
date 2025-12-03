// app/(auth)/(quiz)/speed/[setId].tsx
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import QuestionCard from '../../../../../components/Quiz/QuestionCard';
import ResultScreen from '../../../../../components/Quiz/ResultScreen';
import api from '../../../../utils/api';

interface Flashcard {
  id: string;
  vocabulary: string;
  phonetic?: string | null;
  meaning: string;
}

interface QuizCard extends Flashcard {
  options: string[];
  correctAnswer: string;
}

// Fisher-Yates shuffle
const shuffle = <T,>(array: T[]): T[] => {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

export default function SpeedRun() {
  const params = useLocalSearchParams<{ setId: string; reset?: string }>();
  const { setId, reset } = params;

  const [cards, setCards] = useState<QuizCard[]>([]);
  const [current, setCurrent] = useState(0);
  const [score, setScore] = useState(0);
  const [startTime, setStartTime] = useState(Date.now());
  const [elapsed, setElapsed] = useState(0);
  const [finished, setFinished] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchAndProcessCards = useCallback(async () => {
    if (!setId) return;

    try {
      setLoading(true);
      const res = await api.get(`/api/flashcard-sets/${setId}/flashcards`);
      const rawData: Flashcard[] = Array.isArray(res.data)
        ? res.data
        : res.data?.flashcards || [];

      if (rawData.length === 0) {
        setCards([]);
        return;
      }

      const processed: QuizCard[] = rawData.map((card) => {
        const others = rawData.filter(c => c.id !== card.id);
        const correct = card.meaning.trim();

        // Lấy 3 đáp án sai không trùng
        const wrong: string[] = [];
        const shuffledOthers = shuffle(others);
        for (const other of shuffledOthers) {
          if (wrong.length >= 3) break;
          const m = other.meaning?.trim();
          if (m && m !== correct && !wrong.includes(m)) {
            wrong.push(m);
          }
        }

        return {
          ...card,
          options: shuffle([correct, ...wrong]),
          correctAnswer: correct,
        };
      });

      setCards(shuffle(processed));
    } catch (err: any) {
      console.error('Lỗi tải flashcard:', err.response?.data || err.message);
      setCards([]);
    } finally {
      setLoading(false);
    }
  }, [setId]);

  const resetQuiz = useCallback(() => {
    setCurrent(0);
    setScore(0);
    setStartTime(Date.now());
    setElapsed(0);
    setFinished(false);
    fetchAndProcessCards();
  }, [fetchAndProcessCards]);

  // Load lần đầu
  useEffect(() => {
    resetQuiz();
  }, [resetQuiz]);

  // Reset khi có param ?reset=1
  useEffect(() => {
    if (reset) resetQuiz();
  }, [reset]);

  // Cập nhật thời gian mỗi giây
  useEffect(() => {
    if (finished) return;
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 100);
    return () => clearInterval(interval);
  }, [startTime, finished]);

  const handleAnswer = (isCorrect: boolean) => {
    if (isCorrect) setScore(s => s + 1);

    if (current < cards.length - 1) {
      setTimeout(() => setCurrent(c => c + 1), 600);
    } else {
      setFinished(true);
    }
  };

  // Loading
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0b1220' }}>
        <ActivityIndicator size="large" color="#60a5fa" />
        <Text style={{ color: '#fff', marginTop: 16 }}>Đang tải câu hỏi...</Text>
      </View>
    );
  }

  // Kết thúc
  if (finished) {
    return (
      <ResultScreen
        score={score}
        total={cards.length}
        timeUsed={elapsed}
        mode="speed"
        setId={setId!}
      />
    );
  }

  // Không có thẻ
  if (cards.length === 0) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0b1220' }}>
        <Text style={{ color: '#fff', fontSize: 18 }}>Không có flashcard trong bộ này</Text>
      </View>
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
        <Text style={{ color: '#60a5fa', fontSize: 20, fontWeight: 'bold' }}>
          {String(Math.floor(elapsed / 60)).padStart(2, '0')}:{String(elapsed % 60).padStart(2, '0')}
        </Text>
      </View>

      {/* Câu hỏi */}
      <QuestionCard card={currentCard} onAnswer={handleAnswer} />

      {/* Điểm */}
      <View style={{ marginTop: 40, alignItems: 'center' }}>
        <Text style={{ color: '#60a5fa', fontSize: 24, fontWeight: 'bold' }}>
          Điểm: {score}
        </Text>
      </View>
    </View>
  );
}
