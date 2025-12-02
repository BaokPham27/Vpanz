// app/(auth)/(shadow)/[topicId].tsx
import axios from 'axios';
import { Audio } from 'expo-av';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface Sentence {
  number: number;
  text: string;
}
interface TopicDetail {
  _id?: string;
  title: string;
  description: string;
  sentences: Sentence[];
}

const BASE_URL = 'http://10.249.2.233:5000';
const LOCAL_FRAME_URI = require('../../../assets/images/bangthongbao.png');
const FINISH_FRAME_URI = require('../../../assets/images/banghoanthanh.png');

const ShadowSentencesScreen: React.FC = () => {
  const { topicId } = useLocalSearchParams<{ topicId: string }>();

  const [topic, setTopic] = useState<TopicDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Mobile recording
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [totalScore, setTotalScore] = useState(0);
  const [finished, setFinished] = useState(false);

// Web MediaRecorder (use any to avoid TS issues)
const mediaRecorderRef = useRef<any | null>(null);
const audioChunksRef = useRef<Blob[]>([]);
const streamRef = useRef<MediaStream | null>(null);
const [isRecordingState, setIsRecordingState] = useState(false);


  // Playback
  const [playback, setPlayback] = useState<Audio.Sound | null>(null);

  // Modal
  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [finishModalVisible, setFinishModalVisible] = useState(false);
  const [resultData, setResultData] = useState({
    score: 0,
    errors: [] as string[],
    sentenceNumber: 0,
    totalAfter: 0,
    isLast: false,
  });

  useEffect(() => {
    console.log('[Shadow] mount topicId=', topicId);
    if (topicId) fetchTopicDetail(String(topicId));
    return () => {
      (async () => {
        try {
          console.log('[Shadow] cleanup: unloading playback');
          await playback?.unloadAsync();
        } catch (e) {
          console.warn('[Shadow] cleanup: unload playback error', e);
        }
        try {
          if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => {
              console.log('[Shadow] cleanup: stopping track', t.kind, t);
              t.stop();
            });
            streamRef.current = null;
          }
        } catch (e) {
          console.warn('[Shadow] cleanup: stop tracks error', e);
        }
        // stop and release recording if any
        if (recording) {
          try {
            console.log('[Shadow] cleanup: stopping recording');
            await recording.stopAndUnloadAsync();
          } catch (e) {
            console.warn('[Shadow] cleanup: stop recording error', e);
          }
        }
      })();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topicId]);

  const fetchTopicDetail = async (id: string) => {
    try {
      console.log('[Shadow] fetching topic', id);
      setLoading(true);
      const res = await axios.get(`${BASE_URL}/api/shadow/${id}`);
      console.log('[Shadow] topic loaded, sentences=', res.data?.sentences?.length);
      setTopic(res.data);
    } catch (err) {
      console.error('[Shadow] fetchTopicDetail error', err);
      Alert.alert('Lỗi', 'Không tải được dữ liệu topic.');
    } finally {
      setLoading(false);
    }
  };

  const currentSentence = topic?.sentences?.[currentIndex] ?? null;
  const totalSentences = topic?.sentences.length ?? 0;

  // ==================== GHI ÂM MOBILE ====================
  const startRecordingMobile = async () => {
    try {
      console.log('[Shadow] startRecordingMobile: requesting permission');
      const { status } = await Audio.requestPermissionsAsync();
      console.log('[Shadow] permission status', status);
      if (status !== 'granted') {
        Alert.alert('Cần quyền micro');
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      console.log('[Shadow] creating recording (mobile)');
      const recResult = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      console.log('[Shadow] created recording object', recResult);
      setRecording(recResult.recording);
      setRecordingUri(null);
    } catch (err) {
      console.error('[Shadow] startRecordingMobile error', err);
      Alert.alert('Lỗi', 'Không thể ghi âm');
    }
  };

  const stopRecordingMobile = async () => {
    if (!recording) {
      console.warn('[Shadow] stopRecordingMobile called but recording is null');
      return;
    }
    console.log('[Shadow] stopRecordingMobile: stopping...');
    try {
      await recording.stopAndUnloadAsync();
      console.log('[Shadow] stopRecordingMobile: stopped and unloaded');
    } catch (e) {
      console.warn('[Shadow] stopRecordingMobile: stopAndUnloadAsync failed', e);
    }
    try {
      const uri = recording.getURI();
      console.log('[Shadow] stopRecordingMobile: getURI ->', uri);
      setRecordingUri(uri ?? null);
    } catch (e) {
      console.warn('[Shadow] stopRecordingMobile: getURI error', e);
      setRecordingUri(null);
    } finally {
      setRecording(null);
    }
  };

  // ==================== GHI ÂM WEB ====================
const startRecordingWeb = async () => {
  try {
    console.log('[Shadow] startRecordingWeb: requesting getUserMedia');
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    console.log('[Shadow] startRecordingWeb: got stream', stream);
    streamRef.current = stream;

    const MediaRecorderClass = (window as any).MediaRecorder;
    if (!MediaRecorderClass) {
      Alert.alert('Trình duyệt không hỗ trợ MediaRecorder');
      console.error('[Shadow] MediaRecorder not available on window');
      return;
    }

    const mediaRecorder = new MediaRecorderClass(stream);
    audioChunksRef.current = [];

    mediaRecorder.onstart = () => {
      console.log('[Shadow][Web] mediaRecorder onstart state=', mediaRecorder.state);
      setIsRecordingState(true);
    };
    mediaRecorder.ondataavailable = (e: any) => {
      console.log('[Shadow][Web] ondataavailable size=', e?.data?.size);
      if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data);
    };

    mediaRecorder.onerror = (err: any) => {
      console.error('[Shadow][Web] mediaRecorder error', err);
    };

    mediaRecorder.onstop = () => {
      console.log('[Shadow][Web] mediaRecorder onstop, chunks=', audioChunksRef.current.length);
      try {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const url = URL.createObjectURL(blob);
        console.log('[Shadow][Web] created blob url=', url);
        setRecordingUri(url);
      } catch (e) {
        console.error('[Shadow][Web] onstop create blob error', e);
        setRecordingUri(null);
      } finally {
        audioChunksRef.current = [];
        mediaRecorderRef.current = null;
        setIsRecordingState(false); // ← đảm bảo tắt state khi onstop xong
      }
    };

    console.log('[Shadow][Web] starting mediaRecorder');
    mediaRecorder.start();
    mediaRecorderRef.current = mediaRecorder;
    console.log('[Shadow][Web] mediaRecorder state after start=', mediaRecorder.state);
    setRecordingUri(null);
    // setIsRecordingState(true); // onstart handler cũng set, nhưng có thể set ở đây để chắc chắn
    setIsRecordingState(true);
  } catch (err) {
    console.error('[Shadow] startRecordingWeb error', err);
    Alert.alert('Lỗi micro', 'Trình duyệt không cho phép ghi âm');
  }
};


const stopRecordingWeb = () => {
  const recorder = mediaRecorderRef.current;
  console.log('[Shadow][Web] stopRecordingWeb called. recorder=', !!recorder, 'state=', recorder?.state);
  if (recorder && recorder.state !== 'inactive') {
    try {
      recorder.stop();
      console.log('[Shadow][Web] stop invoked on recorder');
    } catch (e) {
      console.error('[Shadow][Web] stopRecordingWeb error', e);
    }
    // safety fallback in case onstop never fires:
    setTimeout(() => {
      if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
        setIsRecordingState(false);
      }
    }, 800);
  } else {
    console.warn('[Shadow][Web] stopRecordingWeb: no active recorder or already inactive');
    setIsRecordingState(false);
  }
};


  // ==================== UNIFIED API ====================
  const startRecording = () => {
    console.log('[Shadow] startRecording pressed. Platform=', Platform.OS);
    if (Platform.OS === 'web') startRecordingWeb();
    else startRecordingMobile();
  };

  const stopRecording = () => {
    console.log('[Shadow] stopRecording pressed. Platform=', Platform.OS);
    if (Platform.OS === 'web') stopRecordingWeb();
    else stopRecordingMobile();
  };

  // Sửa lại isRecording cho rõ ràng
const isRecording = Platform.OS === 'web' ? isRecordingState : !!recording;


  // DEBUG: log isRecording changes
  useEffect(() => {
    console.log('[Shadow] isRecording=', isRecording, 'mediaRecorderState=', mediaRecorderRef.current?.state, 'recording=', !!recording);
  }, [isRecording, recording, mediaRecorderRef.current]);

  // ==================== NGHE LẠI ====================
  const playRecording = async () => {
    if (!recordingUri) {
      console.warn('[Shadow] playRecording: no recordingUri');
      return;
    }
    console.log('[Shadow] playRecording uri=', recordingUri);
    try {
      await playback?.unloadAsync();
      const { sound } = await Audio.Sound.createAsync({ uri: recordingUri }, { shouldPlay: true });
      setPlayback(sound);
    } catch (err) {
      console.error('[Shadow] playRecording error', err);
      Alert.alert('Lỗi phát');
    }
  };

  // ==================== GỬI ĐIỂM ====================
const submitAndNext = async () => {
  console.log('[Shadow] submitAndNext called', { currentIndex, recordingUri });

  if (!currentSentence || !recordingUri) return;

  setIsSubmitting(true);

  try {
    const formData = new FormData();
    if (Platform.OS === 'web') {
      const resp = await fetch(recordingUri);
      const blob = await resp.blob();
      formData.append('audio', blob, 'shadow.wav');
    } else {
      formData.append('audio', { uri: recordingUri, name: 'shadow.wav', type: 'audio/wav' } as any);
    }
    formData.append('text', currentSentence.text);

    const res = await axios.post(`${BASE_URL}/api/shadow/predict`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
    });

    const { score, errors } = res.data;

    // 1️⃣ cập nhật tổng điểm
    const newTotal = totalScore + score;
    setTotalScore(newTotal);

    // 2️⃣ cập nhật modal dữ liệu
    setResultData({
      score,
      errors,
      sentenceNumber: currentSentence.number,
      totalAfter: newTotal,
      isLast: currentIndex === totalSentences - 1,
    });

    // 3️⃣ hiển thị modal
    setResultModalVisible(true);

  } catch (err: any) {
    console.error('[Shadow] submitAndNext error', err);
    Alert.alert('Lỗi', 'Không thể chấm điểm');
  } finally {
    setIsSubmitting(false);
  }
};


  const onResultOk = () => {
    console.log('[Shadow] onResultOk: isLast=', resultData.isLast);
    setResultModalVisible(false);
    if (resultData.isLast) {
      setFinished(true);
      setFinishModalVisible(true);
    } else {
      setCurrentIndex(i => i + 1);
    }
  };

  // ==================== RENDER ====================
  if (loading || !topic || !currentSentence) {
    return (
      <SafeAreaView style={styles.full}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#60a5fa" />
          <Text style={{ color: '#fff', marginTop: 12 }}>Đang tải...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.full}>
      <View style={styles.container}>
        <Text style={styles.topicTitle}>{topic.title}</Text>
        <Text style={styles.topicDesc}>{topic.description}</Text>
        <Text style={styles.progress}>Câu {currentIndex + 1} / {totalSentences}</Text>

        <View style={styles.sentenceBox}>
          <Text style={styles.sentenceNumber}>#{currentSentence.number}</Text>
          <Text style={styles.sentenceText}>{currentSentence.text}</Text>
        </View>

        {/* NÚT GHI ÂM */}
        <View style={styles.recordRow}>
          {!isRecording ? (
            <TouchableOpacity
              style={[styles.btn, styles.btnPrimary]}
              onPress={startRecording}
              disabled={isSubmitting || finished}
            >
              <Text style={styles.btnText}>Bắt đầu ghi âm</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.btn, styles.btnDanger]}
              onPress={stopRecording}
            >
              <Text style={styles.btnText}>Dừng ghi âm</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* NÚT NGHE LẠI */}
        {recordingUri && !isRecording && (
          <TouchableOpacity style={[styles.btn, styles.btnPlay]} onPress={playRecording}>
            <Text style={styles.btnText}>Nghe lại bản ghi</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.recordStatus}>
          {isRecording
            ? 'Đang ghi âm... (nhấn Dừng để hoàn tất)'
            : recordingUri
              ? 'Đã ghi xong – có thể nghe lại & chấm điểm'
              : 'Nhấn nút xanh để bắt đầu'}
        </Text>

        {/* NÚT CHẤM ĐIỂM */}
        <TouchableOpacity
          style={[
            styles.btn,
            styles.btnSecondary,
            (!recordingUri || isSubmitting || finished) && styles.btnDisabled,
          ]}
          onPress={submitAndNext}
          disabled={!recordingUri || isSubmitting || finished}
        >
          <Text style={styles.btnText}>
            {currentIndex === totalSentences - 1 ? 'Chấm điểm & hoàn thành' : 'Chấm điểm & sang câu tiếp'}
          </Text>
        </TouchableOpacity>

        <View style={styles.totalBox}>
          <Text style={styles.totalText}>Tổng điểm: {totalScore.toFixed(1)}</Text>
        </View>

        {/* === Kết quả Modal === */}
        <Modal animationType="fade" transparent visible={resultModalVisible}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalWrapper}>
              <Image source={LOCAL_FRAME_URI} style={styles.resultFrame} resizeMode="contain" />
              <View style={styles.resultContent}>
                <Text style={styles.modalTitle}>Câu {resultData.sentenceNumber}</Text>
                <Text style={styles.modalScore}>Điểm: {resultData.score.toFixed(1)}</Text>
                <Text style={styles.modalErrors}>
                  {resultData.errors.length > 0 ? 'Lỗi: ' + resultData.errors.join(', ') : 'Hoàn hảo!'}
                </Text>
                <TouchableOpacity style={styles.modalBtn} onPress={onResultOk}>
                  <Text style={styles.modalBtnText}>OK</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* === Hoàn thành Modal === */}
        <Modal animationType="fade" transparent visible={finishModalVisible}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalWrapper}>
              <Image source={FINISH_FRAME_URI} style={styles.finishFrame} resizeMode="contain" />
              <View style={styles.finishContent}>
                <Text style={styles.finishTitle}>Hoàn thành!</Text>
                <Text style={styles.finishText}>Bạn đã hoàn thành {totalSentences} câu</Text>
                <Text style={styles.finishScore}>Tổng điểm: {totalScore.toFixed(1)}</Text>
                <TouchableOpacity style={styles.finishBtn} onPress={() => setFinishModalVisible(false)}>
                  <Text style={styles.finishBtnText}>Đóng</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  full: { flex: 1, backgroundColor: '#0b1220' },
  container: { flex: 1, padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  topicTitle: { fontSize: 22, fontWeight: '700', color: '#f9fafb' },
  topicDesc: { fontSize: 14, color: '#9ca3af', marginTop: 4, marginBottom: 12 },
  progress: { fontSize: 15, color: '#e5e7eb', marginBottom: 10, fontWeight: '600' },
  sentenceBox: { backgroundColor: '#111827', borderRadius: 12, padding: 18, marginBottom: 20, borderWidth: 1, borderColor: '#1f2937' },
  sentenceNumber: { color: '#9ca3af', marginBottom: 6 },
  sentenceText: { fontSize: 21, color: '#f9fafb', fontWeight: '600' },
  recordRow: { alignItems: 'center', marginVertical: 12 },
  btn: { paddingVertical: 16, paddingHorizontal: 32, borderRadius: 999, minWidth: 240, alignItems: 'center' },
  btnPrimary: { backgroundColor: '#22c55e' },
  btnDanger: { backgroundColor: '#ef4444' },
  btnPlay: { backgroundColor: '#8b5cf6', marginTop: 12 },
  btnSecondary: { backgroundColor: '#3b82f6', marginTop: 16 },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 17 },
  recordStatus: { textAlign: 'center', color: '#94a3b8', marginVertical: 12, fontSize: 15 },
  totalBox: { marginTop: 24, padding: 16, backgroundColor: '#111827', borderRadius: 12, borderWidth: 1, borderColor: '#1f2937' },
  totalText: { color: '#60a5fa', fontSize: 19, fontWeight: '800', textAlign: 'center' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center' },
  modalWrapper: { width: '88%', alignItems: 'center' },
  resultFrame: { width: 210 , aspectRatio: 1.6, position: 'absolute', top: 0 },
  resultContent: { width: '74%', marginTop: 92, alignItems: 'center' },
  modalTitle: { color: '#000', fontSize: 23, fontWeight: '800', marginBottom: 10 },
  modalScore: { color: '#b45309', fontSize: 28, fontWeight: '900', marginBottom: 10 },
  modalErrors: { color: '#000', fontSize: 16, textAlign: 'center', marginBottom: 24 },
  modalBtn: { backgroundColor: '#ef4444', paddingHorizontal: 36, paddingVertical: 14, borderRadius: 14 },
  modalBtnText: { color: '#fff', fontWeight: '700', fontSize: 17 },

  finishFrame: { width: '260%', aspectRatio: 1.6, position: 'absolute', top: -80 },
  finishContent: { width: '74%', marginTop: 130, alignItems: 'center' },
  finishTitle: { color: '#000', fontSize: 30, fontWeight: '900', marginBottom: 12 },
  finishText: { color: '#000', fontSize: 19, marginBottom: 8 },
  finishScore: { color: '#b45309', fontSize: 26, fontWeight: '900', marginBottom: 24 },
  finishBtn: { backgroundColor: '#3b82f6', paddingHorizontal: 40, paddingVertical: 16, borderRadius: 14 },
  finishBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});

export default ShadowSentencesScreen;
