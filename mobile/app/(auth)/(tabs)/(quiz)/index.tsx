// app/(quiz)/index.tsx
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../../../../context/AuthContext';
import api from '../../../utils/api';

type UserType = {
  _id?: string;
  id?: string;
  name?: string;
  email?: string;
  avatarURL?: string;
  token?: string;
  role?: 'user' | 'teacher';
};

type SetType = {
  _id?: string;
  id?: string;
  title: string;
  description?: string;
  owner?: string | { _id?: string; id?: string };
  isPublic?: boolean;
  flashcards?: any[];
};

export default function QuizHome() {
  const [mySets, setMySets] = useState<SetType[]>([]);
  const [publicSets, setPublicSets] = useState<SetType[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth() as { user?: UserType }; // cast cho rõ

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/api/flashcard-sets/my');
        const allSets: SetType[] = res.data || [];

        // Chuẩn hoá user id (hỗ trợ cả id và _id)
        const userId = user ? (user._id ?? user.id) : undefined;

        const mySets = allSets.filter((s) => {
          // owner có thể là string (ownerId) hoặc object { _id } hoặc { id }
          const ownerRaw = (s as any).owner;
          const ownerId =
            typeof ownerRaw === 'string'
              ? ownerRaw
              : ownerRaw
              ? ownerRaw._id ?? ownerRaw.id
              : undefined;

          return Boolean(userId && ownerId && ownerId === userId);
        });

        const publicSets = allSets.filter((s) => Boolean(s.isPublic));

        setMySets(mySets);
        setPublicSets(publicSets);
      } catch (err) {
        console.warn('Lỗi tải bộ thẻ', err);
        alert('Lỗi tải bộ thẻ');
      } finally {
        setLoading(false);
      }
    })();
  }, [user]); // nghe user thay đổi — tốt cho khi login/logout

  const startQuiz = (setId: string, mode: 'speed' | 'timed') => {
    router.push({
      pathname: `/(auth)/(quiz)/${mode}/[setId]`,
      params: { setId }
    } as any); // keep as any to avoid router typing noise
  };

  if (loading) return <Text style={styles.loading}>Đang tải bộ thẻ...</Text>;

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Chọn bộ thẻ để luyện thi</Text>

      {mySets.length > 0 && (
        <>
          <Text style={styles.subtitle}>Bộ của bạn</Text>
          {mySets.map((set) => {
            const key = set._id ?? set.id ?? Math.random().toString();
            return (
              <View key={key} style={styles.setCard}>
                <Text style={styles.setTitle}>{set.title}</Text>
                <Text style={styles.setDesc}>{set.description || 'Không có mô tả'}</Text>
                <Text style={styles.count}>{set.flashcards?.length ?? 0} thẻ</Text>

                <View style={styles.btnRow}>
                  <TouchableOpacity style={styles.btnSpeed} onPress={() => startQuiz(key, 'speed')}>
                    <Text style={styles.btnText}>Speed Run</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.btnTimed} onPress={() => startQuiz(key, 'timed')}>
                    <Text style={styles.btnText}>Timed Test (10 phút)</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </>
      )}

      {publicSets.length > 0 && (
        <>
          <Text style={styles.subtitle}>Bộ công khai</Text>
          {publicSets.map((set) => {
            const key = set._id ?? set.id ?? Math.random().toString();
            return (
              <View key={key} style={[styles.setCard, styles.publicCard]}>
                <Text style={styles.setTitle}>{set.title} (Công khai)</Text>
                <Text style={styles.count}>{set.flashcards?.length ?? 0} thẻ</Text>
                <TouchableOpacity style={styles.btnSpeed} onPress={() => startQuiz(key, 'speed')}>
                  <Text style={styles.btnText}>Bắt đầu luyện</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#0b1220' },
  loading: { flex: 1, textAlign: 'center', color: '#fff', marginTop: 50, fontSize: 18 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 20, textAlign: 'center' },
  subtitle: { fontSize: 18, color: '#94a3b8', marginTop: 20, marginBottom: 10 },
  setCard: { backgroundColor: '#1e293b', padding: 16, borderRadius: 12, marginBottom: 12 },
  publicCard: { opacity: 0.9 },
  setTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  setDesc: { color: '#94a3b8', marginTop: 4 },
  count: { color: '#60a5fa', marginTop: 8 },
  btnRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
  btnSpeed: { backgroundColor: '#f472b6', padding: 12, borderRadius: 8, flex: 1 },
  btnTimed: { backgroundColor: '#fb923c', padding: 12, borderRadius: 8, flex: 1 },
  btnText: { color: '#fff', textAlign: 'center', fontWeight: '600' },
});
