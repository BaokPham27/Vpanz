// components/Quiz/ResultScreen.tsx
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { ArrowLeft, RotateCcw, Share2, Trophy } from 'lucide-react-native';
import { Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';

type Props = {
  score: number;
  total: number;
  timeUsed?: number;
  mode: 'timed' | 'speed';
  setId: string;
};

export default function ResultScreen({ score, total, timeUsed, mode, setId }: Props) {
  const accuracy = Math.round((score / total) * 100);
  const isPerfect = score === total;

  const onShare = async () => {
    try {
      await Share.share({
        message: `Tôi vừa đạt ${score}/${total} điểm (${accuracy}%) trong ${
          mode === 'timed' ? 'Timed Test' : 'Speed Run'
        } trên Vpan! Thử thách bạn nào!`,
      });
    } catch (e) {}
  };

  // LÀM LẠI BÀI THI – HOẠT ĐỘNG 100%, KHÔNG LỖI TS
const replayQuiz = () => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

  // dùng object form để chắc chắn truyền param đúng
  router.push({
    pathname: `/(auth)/(quiz)/${mode}/[setId]`,
    params: { setId, reset: Date.now().toString() }
  } as any);
};


  // Về danh sách – cũng fix luôn
  const goToQuizList = () => {
    router.replace('/(auth)/(quiz)' as any);
  };

  return (
    <View style={styles.container}>
      {isPerfect && <ConfettiCannon count={300} origin={{ x: -10, y: 0 }} fadeOut={true} autoStart={true} />}

      <View style={styles.card}>
        <Trophy size={88} color={accuracy >= 95 ? '#fbbf24' : accuracy >= 80 ? '#22c55e' : '#fb923c'} />

        <Text style={styles.title}>
          {accuracy >= 95 ? 'Hoàn hảo!' : accuracy >= 90 ? 'Xuất sắc!' : accuracy >= 70 ? 'Rất tốt!' : 'Cố lên nào!'}
        </Text>

        <Text style={styles.score}>{score} / {total}</Text>
        <Text style={styles.accuracy}>{accuracy}% chính xác</Text>

        {timeUsed !== undefined && (
          <Text style={styles.time}>
            {mode === 'timed'
              ? `Dùng: ${Math.floor(timeUsed / 60)}:${(timeUsed % 60).toString().padStart(2, '0')}`
              : `Thành tích: ${Math.floor(timeUsed / 60)}′${(timeUsed % 60).toString().padStart(2, '0')}″`}
          </Text>
        )}

        <View style={styles.rank}>
          <Text style={styles.rankText}>
            {accuracy >= 98 ? 'SS' : accuracy >= 95 ? 'S+' : accuracy >= 90 ? 'S' : accuracy >= 80 ? 'A' : accuracy >= 70 ? 'B' : 'C'}
          </Text>
        </View>
      </View>

      <View style={styles.buttons}>
        <TouchableOpacity style={styles.btnShare} onPress={onShare}>
          <Share2 size={24} color="#fff" />
          <Text style={styles.btnText}>Chia sẻ</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.btnAgain} onPress={replayQuiz}>
          <RotateCcw size={24} color="#fff" />
          <Text style={styles.btnText}>Làm lại ngay</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.btnHome} onPress={goToQuizList}>
          <ArrowLeft size={24} color="#fff" />
          <Text style={styles.btnText}>Về danh sách</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b1220',
    padding: 20,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 32,
    padding: 40,
    alignItems: 'center',
    marginBottom: 50,
    borderWidth: 1,
    borderColor: '#334155',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 20,
  },
  title: {
    fontSize: 38,
    fontWeight: '900',
    color: '#fff',
    marginTop: 20,
    textAlign: 'center',
  },
  score: {
    fontSize: 78,
    fontWeight: '900',
    color: '#60a5fa',
    marginVertical: 16,
  },
  accuracy: {
    fontSize: 26,
    color: '#94a3b8',
    marginBottom: 12,
  },
  time: {
    fontSize: 20,
    color: '#cbd5e1',
    marginTop: 8,
    fontWeight: '600',
  },
  rank: {
    marginTop: 32,
    backgroundColor: '#334155',
    paddingHorizontal: 36,
    paddingVertical: 18,
    borderRadius: 60,
  },
  rankText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fbbf24',
  },
  buttons: {
    gap: 16,
  },
  btnShare: {
    backgroundColor: '#8b5cf6',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 14,
    padding: 18,
    borderRadius: 18,
  },
  btnAgain: {
    backgroundColor: '#10b981',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 14,
    padding: 18,
    borderRadius: 18,
  },
  btnHome: {
    backgroundColor: '#64748b',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 14,
    padding: 18,
    borderRadius: 18,
  },
  btnText: {
    color: '#fff',
    fontSize: 19,
    fontWeight: '700',
  },
});