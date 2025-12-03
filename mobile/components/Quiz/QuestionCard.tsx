// components/Quiz/QuestionCard.tsx
import { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface Props {
  card: {
    vocabulary: string;
    phonetic?: string | null;
    options: string[];
    correctAnswer: string;
  };
  onAnswer: (correct: boolean) => void;
}

export default function QuestionCard({ card, onAnswer }: Props) {
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    setSelected(null);
  }, [card]);

  const handlePress = (option: string) => {
    if (selected) return;
    setSelected(option);
    onAnswer(option === card.correctAnswer);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.vocabulary}>{card.vocabulary}</Text>
      {card.phonetic && <Text style={styles.phonetic}>{card.phonetic}</Text>}

      <View style={styles.options}>
        {card.options.map((option, i) => {
          const isCorrect = option === card.correctAnswer;
          const isSelected = selected === option;

          return (
            <TouchableOpacity
              key={i}
              style={[
                styles.option,
                isSelected && isCorrect && styles.correct,
                isSelected && !isCorrect && styles.wrong,
              ]}
              onPress={() => handlePress(option)}
              disabled={!!selected}
            >
              <Text style={styles.optionText}>{option}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', paddingHorizontal: 10 },
  vocabulary: { fontSize: 36, fontWeight: 'bold', color: '#fff', textAlign: 'center', marginBottom: 10 },
  phonetic: { fontSize: 20, color: '#94a3b8', textAlign: 'center', marginBottom: 40 },
  options: { gap: 16 },
  option: {
    backgroundColor: '#1e293b',
    paddingVertical: 22,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#334155',
  },
  correct: { backgroundColor: '#166534', borderColor: '#22c55e' },
  wrong: { backgroundColor: '#7f1d1d', borderColor: '#ef4444' },
  optionText: { color: '#fff', fontSize: 18, textAlign: 'center', fontWeight: '600' },
});