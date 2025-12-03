// app/books/[bookId]/[chapterId].tsx
import { Audio } from 'expo-av';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, ChevronLeft, ChevronRight, Eye, EyeOff } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Image,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const PAGE_TURN_SOUND = require('../../../../../assets/sounds/page-turn.mp3');
const API_BASE = 'http://26.94.144.5:5000';

export default function EhonReader() {
  const params = useLocalSearchParams();
  const bookId = Array.isArray(params.bookId) ? params.bookId[0] : (params.bookId ?? '');
  const chapterNum = Array.isArray(params.chapterId) ? params.chapterId[0] : (params.chapterId ?? '1');
  const chapterNumber = parseInt(chapterNum) || 1;

  const [chapter, setChapter] = useState<any>(null);
  const [totalChapters, setTotalChapters] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showTranslation, setShowTranslation] = useState(false);
  const [popup, setPopup] = useState<any>(null);
  const [isTurning, setIsTurning] = useState(false);

  const fadeAnim = new Animated.Value(1);

  const fetchBookAndChapter = async () => {
    try {
      setLoading(true);

      // LẤY THÔNG TIN SÁCH + TỔNG SỐ CHƯƠNG
      const bookRes = await fetch(`${API_BASE}/api/books/${bookId}`);
      if (!bookRes.ok) throw new Error('Không tải được sách');
      const bookData = await bookRes.json();

      console.log('Tổng số chương:', bookData.chapters?.length); // DEBUG
      console.log('Dữ liệu chapters:', bookData.chapters); // DEBUG

      setTotalChapters(bookData.chapters?.length || 0);

      // LẤY NỘI DUNG CHƯƠNG HIỆN TẠI
      const chapterRes = await fetch(`${API_BASE}/api/books/${bookId}/chapter/${chapterNumber}`);
      if (!chapterRes.ok) {
        alert(`Chương ${chapterNumber} chưa tồn tại!`);
        return;
      }
      const chapterData = await chapterRes.json();
      setChapter(chapterData);
    } catch (err) {
      console.error(err);
      alert('Lỗi kết nối server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!bookId) return;
    if (!params.chapterId) {
      router.replace(`/books/${bookId}/1`);
      return;
    }
    fetchBookAndChapter();
  }, [bookId, chapterNumber]);

  const hasPrev = chapterNumber > 1;
  const hasNext = chapterNumber < totalChapters;

  // DEBUG: Xem giá trị thực tế
  console.log('chapterNumber:', chapterNumber);
  console.log('totalChapters:', totalChapters);
  console.log('hasNext:', hasNext, 'hasPrev:', hasPrev);

  const playPageTurnSound = async () => {
    try {
      const { sound } = await Audio.Sound.createAsync(PAGE_TURN_SOUND, { shouldPlay: true, volume: 0.8 });
      await sound.playAsync();
      sound.setOnPlaybackStatusUpdate(status => {
        if (status.isLoaded && (status as any).didJustFinish) sound.unloadAsync();
      });
    } catch (e) {}
  };

  const goToChapter = (num: number) => {
    if (isTurning || num < 1 || num > totalChapters) return;
    setIsTurning(true);
    playPageTurnSound();

    Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
      router.replace(`/books/${bookId}/${num}`);
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start(() =>
        setIsTurning(false)
      );
    });
  };

  const goBackToList = () => {
    router.push('/books/list'); // hoặc '/books/list' tùy bạn
  };

  if (loading || !chapter) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#92400e" />
        <Text style={{ marginTop: 16, color: '#92400e', fontSize: 18 }}>
          Đang tải chương {chapterNumber}...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* NÚT BACK */}
      <TouchableOpacity style={styles.backButton} onPress={goBackToList}>
        <ArrowLeft color="#92400e" size={28} />
        <Text style={styles.backText}>Danh sách</Text>
      </TouchableOpacity>

      {/* DEBUG: HIỂN THỊ CHƯƠNG HIỆN TẠI / TỔNG */}
      <View style={{ position: 'absolute', top: 60, right: 20, backgroundColor: 'rgba(0,0,0,0.6)', padding: 8, borderRadius: 8, zIndex: 100 }}>
        <Text style={{ color: 'white', fontSize: 12 }}>
          {chapterNumber} / {totalChapters}
        </Text>
      </View>

      <Animated.View style={[styles.pageContainer, { opacity: fadeAnim }]}>
        <View style={styles.mainLayout}>
          <View style={styles.imageColumn}>
            <Image source={{ uri: chapter.illustration }} style={styles.illustration} resizeMode="contain" />
          </View>

          <View style={styles.contentColumn}>
            <View style={styles.titleContainer}>
              <Text style={styles.chapterTitle}>{chapter.title}</Text>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
              {chapter.content.map((line: any, i: number) => (
                <View key={i} style={styles.line}>
                  <TouchableOpacity activeOpacity={0.8} onPress={() => setPopup(line)}>
                    <Text style={styles.japaneseText}>{line.text}</Text>
                  </TouchableOpacity>
                  {showTranslation && <Text style={styles.translationText}>{line.meaning}</Text>}
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Animated.View>

      <Modal visible={!!popup} transparent animationType="fade">
        <TouchableOpacity style={styles.popupOverlay} onPress={() => setPopup(null)}>
          <View style={styles.popup}>
            <Text style={styles.popupJp}>{popup?.text}</Text>
            <Text style={styles.popupRuby}>{popup?.ruby}</Text>
            <Text style={styles.popupVn}>{popup?.meaning}</Text>
          </View>
        </TouchableOpacity>
      </Modal>

      <View style={styles.bottomBar} pointerEvents="box-none">
        <TouchableOpacity
          style={[styles.navBtn, (!hasPrev || isTurning) && styles.disabled]}
          onPress={() => goToChapter(chapterNumber - 1)}
          disabled={!hasPrev || isTurning}
        >
          <ChevronLeft color={hasPrev ? "#fff" : "#666"} size={32} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.toggleBtn} onPress={() => setShowTranslation(v => !v)}>
          {showTranslation ? <EyeOff color="#60a5fa" size={28} /> : <Eye color="#60a5fa" size={28} />}
          <Text style={styles.toggleText}>{showTranslation ? "Ẩn dịch" : "Hiện dịch"}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navBtn, (!hasNext || isTurning) && styles.disabled]}
          onPress={() => goToChapter(chapterNumber + 1)}
          disabled={!hasNext || isTurning}
        >
          <ChevronRight color={hasNext ? "#fff" : "#666"} size={32} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fdf6e3' },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 30,
    zIndex: 100,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 10,
  },
  backText: { marginLeft: 8, fontSize: 16, fontWeight: '600', color: '#92400e' },
  pageContainer: { ...StyleSheet.absoluteFillObject, backgroundColor: '#fdf6e3' },
  mainLayout: { flex: 1, flexDirection: 'row' },
  imageColumn: {
    width: '35%',
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    borderRightWidth: 3,
    borderRightColor: '#f0e6d2',
  },
  illustration: {
    width: '100%',
    height: 'auto',
    aspectRatio: 0.75,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  contentColumn: {
    width: '65%',
    backgroundColor: '#fdf6e3',
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  titleContainer: {
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#e0d4b8',
  },
  chapterTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#92400e',
    textAlign: 'center',
  },
  line: { marginBottom: 32 },
  japaneseText: {
    fontSize: 28,
    lineHeight: 50,
    color: '#1f2937',
    fontWeight: '600',
    textAlign: 'left',
  },
  translationText: {
    fontSize: 19,
    color: '#6b7280',
    marginTop: 10,
    fontStyle: 'italic',
    lineHeight: 30,
  },
  popupOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  popup: {
    backgroundColor: '#fff',
    padding: 28,
    borderRadius: 24,
    alignItems: 'center',
    width: '85%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 20,
  },
  popupJp: { fontSize: 30, fontWeight: 'bold', color: '#1e293b', marginBottom: 8 },
  popupRuby: { fontSize: 18, color: '#6b7280', marginBottom: 16, fontStyle: 'italic' },
  popupVn: { fontSize: 22, color: '#059669', fontWeight: '600', textAlign: 'center' },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderTopWidth: 3,
    borderTopColor: '#f0e6d2',
    elevation: 15,
  },
  navBtn: { padding: 14, backgroundColor: '#92400e', borderRadius: 50 },
  disabled: { backgroundColor: '#9ca3af' },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#f59e0b',
  },
  toggleText: { marginLeft: 10, fontSize: 16, fontWeight: 'bold', color: '#92400e' },
});