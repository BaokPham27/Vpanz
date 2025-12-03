// app/(auth)/(quiz)/timed/[setId].tsx
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import QuestionCard from '../../../../../components/Quiz/QuestionCard';
import ResultScreen from '../../../../../components/Quiz/ResultScreen';
import Timer from '../../../../../components/Quiz/Timer';
import api from '../../../../utils/api';

const INITIAL_TIME = 600;

// Fisher-Yates shuffle chuẩn
const shuffle = <T,>(array: T[]): T[] => {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

// Định nghĩa kiểu ngay trong file (không cần file riêng)
interface Flashcard {
  id: string;
  vocabulary: string;
  phonetic?: string | null;
  meaning: string;
  image?: string | null;
  createdBy: string;
  createdAt: string;
  setId: number;
  easeFactor?: number;
}

interface QuizCard extends Flashcard {
  options: string[];
  correctAnswer: string;
}

export default function TimedQuiz() {
  const params = useLocalSearchParams<{ setId: string; reset?: string }>();
  const { setId, reset } = params;

  const [cards, setCards] = useState<QuizCard[]>([]);
  const [current, setCurrent] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(INITIAL_TIME);
  const [finished, setFinished] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchCards = useCallback(async () => {
    if (!setId) return;

    try {
      setLoading(true);
      const res = await api.get(`/api/flashcard-sets/${setId}/flashcards`);

      const rawData: Flashcard[] = Array.isArray(res.data)
        ? res.data
        : (res.data?.flashcards as Flashcard[]) || [];

      if (rawData.length === 0) {
        setCards([]);
        return;
      }

      const processed: QuizCard[] = rawData.map((card) => {
        const others = rawData.filter((c) => c.id !== card.id);
        const correct = card.meaning?.trim();

        const wrong: string[] = [];
        const shuffled = shuffle(others);

        for (const other of shuffled) {
          if (wrong.length >= 3) break;
          const m = other.meaning?.trim();
          if (m && m !== correct && !wrong.includes(m)) {
            wrong.push(m);
          }
        }

        // LOG kiểm tra từng bước
        console.log("=====================================");
        console.log("Từ:", card.vocabulary);
        console.log("Đáp án đúng:", correct);
        console.log("Các đáp án khác có thể sử dụng:", others.map(o => o.meaning));
        console.log("Đáp án sai đã chọn:", wrong);

        // Nếu thiếu → thêm placeholder
        while (wrong.length < 3) {
          wrong.push("Đáp án khác");
        }

        console.log("Đáp án cuối cùng (4 options):", [correct, ...wrong]);
        console.log("=====================================");

        return {
          ...card,
          options: shuffle([correct!, ...wrong]),
          correctAnswer: correct!,
        };
      });


      setCards(shuffle(processed));
    } catch (err: any) {
      console.error('Lỗi tải:', err.response?.data || err.message);
      setCards([]);
    } finally {
      setLoading(false);
    }
  }, [setId]);

  const resetQuiz = useCallback(() => {
    setCurrent(0);
    setScore(0);
    setTimeLeft(INITIAL_TIME);
    setFinished(false);
    fetchCards();
  }, [fetchCards]);

  useEffect(() => resetQuiz(), [resetQuiz]);
  useEffect(() => { if (reset) resetQuiz(); }, [reset]);

  useEffect(() => {
    if (finished || timeLeft <= 0) {
      setFinished(true);
      return;
    }
    const timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, finished]);

  const handleAnswer = (isCorrect: boolean) => {
    if (isCorrect) setScore(s => s + 1);
    if (current < cards.length - 1) {
      setTimeout(() => setCurrent(c => c + 1), 600);
    } else {
      setFinished(true);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0b1220' }}>
        <ActivityIndicator size="large" color="#60a5fa" />
        <Text style={{ color: '#fff', marginTop: 16 }}>Đang tải câu hỏi...</Text>
      </View>
    );
  }

  if (finished || timeLeft <= 0) {
    return <ResultScreen score={score} total={cards.length} timeUsed={INITIAL_TIME - timeLeft} mode="timed" setId={setId!} />;
  }

  if (cards.length === 0) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0b1220' }}>
        <Text style={{ color: '#fff', fontSize: 18 }}>Không có flashcard</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 20, backgroundColor: '#0b1220' }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <Text style={{ color: '#fff', fontSize: 17, fontWeight: '600' }}>
          Câu {current + 1}/{cards.length}
        </Text>
        <Timer seconds={timeLeft} size={52} initialSeconds={INITIAL_TIME} />
      </View>

      <QuestionCard card={cards[current]} onAnswer={handleAnswer} />

      <View style={{ marginTop: 40, alignItems: 'center' }}>
        <Text style={{ color: '#60a5fa', fontSize: 24, fontWeight: 'bold' }}>
          Điểm: {score}
        </Text>
      </View>
    </View>
  );
}