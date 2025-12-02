// components/Quiz/QuestionCard.tsx
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type Props = {
  card: any;                    // thẻ hiện tại
  allCards: any[];              // toàn bộ thẻ trong bộ (để lấy đáp án sai)
  onAnswer: (correct: boolean) => void;
};

const shuffle = (array: any[]) => [...array].sort(() => Math.random() - 0.5);

export default function QuestionCard({ card, allCards, onAnswer }: Props) {
  const [selected, setSelected] = useState<string | null>(null);

  // Reset selected khi chuyển câu (rất quan trọng!)
  useEffect(() => {
    setSelected(null);
  }, [card]);

  // Tạo 3 đáp án sai từ các thẻ khác (loại trừ chính nó)
  const wrongOptions = useMemo(() => {
    const others = allCards.filter(c => c._id !== card._id);
    const shuffled = shuffle(others);
    return shuffled.slice(0, 3).map(c => c.meaning);
  }, [allCards, card]);

  // 4 đáp án: 1 đúng + 3 sai → trộn ngẫu nhiên
  const options = useMemo(() => {
    const final = [card.meaning, ...wrongOptions];
    return shuffle(final);
  }, [card.meaning, wrongOptions]);

  const handlePress = (opt: string) => {
    if (selected) return; // đã chọn rồi thì không cho bấm nữa
    setSelected(opt);
    const correct = opt === card.meaning;
    onAnswer(correct);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.vocabulary}>{card.vocabulary}</Text>
      {card.phonetic && <Text style={styles.phonetic}>{card.phonetic}</Text>}

      <View style={styles.options}>
        {options.map((opt, i) => {
          const isCorrect = opt === card.meaning;
          const isWrong = selected === opt && !isCorrect;

          return (
            <TouchableOpacity
              key={i}
              style={[
                styles.option,
                selected === opt && isCorrect && styles.correct,
                isWrong && styles.wrong,
              ]}
              onPress={() => handlePress(opt)}
              disabled={!!selected}
            >
              <Text style={styles.optionText}>{opt}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center' },
  vocabulary: { fontSize: 36, fontWeight: 'bold', color: '#fff', textAlign: 'center', marginBottom: 10 },
  phonetic: { fontSize: 20, color: '#94a3b8', textAlign: 'center', marginBottom: 30 },
  options: { gap: 14 },
  option: { 
    backgroundColor: '#1e293b', 
    padding: 20, 
    borderRadius: 16, 
    borderWidth: 2, 
    borderColor: '#334155' 
  },
  correct: { backgroundColor: '#166534', borderColor: '#22c55e' },
  wrong: { backgroundColor: '#7f1d1d', borderColor: '#ef4444' },
  optionText: { color: '#fff', fontSize: 19, textAlign: 'center', fontWeight: '600' },
});