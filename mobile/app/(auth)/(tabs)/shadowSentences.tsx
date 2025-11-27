import axios from 'axios';
import { Audio } from 'expo-av';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
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

// ⚠️ ĐỔI IP NÀY CHO ĐÚNG (giống file shadowTopic)
const BASE_URL = 'http://26.94.144.5:5000';

// NOTE: sử dụng path file đã upload trong container theo yêu cầu
const LOCAL_FRAME_URI = require('../../../assets/images/bangthongbao.png');
const FINISH_FRAME_URI = require('../../../assets/images/banghoanthanh.png');

const ShadowSentencesScreen: React.FC = () => {
  const { topicId } = useLocalSearchParams<{ topicId: string }>();

  const [topic, setTopic] = useState<TopicDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [totalScore, setTotalScore] = useState(0);
  const [finished, setFinished] = useState(false);

  // Modal result state
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
    console.log('topicId param =', topicId);
    if (topicId) {
      fetchTopicDetail(String(topicId));
    } else {
      setLoading(false);
    }
  }, [topicId]);

  const fetchTopicDetail = async (id: string) => {
    try {
      setLoading(true);
      const res = await axios.get(`${BASE_URL}/api/shadow/${id}`);
      setTopic(res.data);
    } catch (err) {
      console.error('Error fetching topic detail:', err);
      Alert.alert('Lỗi', 'Không tải được dữ liệu topic.');
    } finally {
      setLoading(false);
    }
  };

  const currentSentence =
    topic && topic.sentences && topic.sentences.length > 0
      ? topic.sentences[currentIndex]
      : null;

  // === GHI ÂM ===
  const startRecording = async () => {
    try {
      // Trên web: expo-av ghi âm rất hạn chế → báo luôn
      if (Platform.OS === 'web') {
        Alert.alert(
          'Chưa hỗ trợ trên web',
          'Ghi âm bằng expo-av hoạt động ổn định trên thiết bị thật hoặc Expo Go. Hãy chạy app trên điện thoại để test ghi âm.'
        );
        return;
      }

      console.log('Bắt đầu xin quyền micro...');
      const { status } = await Audio.requestPermissionsAsync();
      console.log('Micro permission status =', status);

      if (status !== 'granted') {
        Alert.alert('Thông báo', 'Bạn cần cấp quyền micro để ghi âm.');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      console.log('Tạo recording...');
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      console.log('Recording created:', recording);
      setRecording(recording);
      setRecordingUri(null);
    } catch (err) {
      console.error('Lỗi khi bắt đầu ghi âm:', err);
      Alert.alert('Lỗi', 'Không thể bắt đầu ghi âm. Xem log console để biết chi tiết.');
    }
  };

  const stopRecording = async () => {
    try {
      if (!recording) return;
      console.log('Dừng ghi âm...');
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      console.log('Recording URI =', uri);
      setRecordingUri(uri || null);
      setRecording(null);
    } catch (err) {
      console.error('Lỗi khi dừng ghi âm:', err);
      Alert.alert('Lỗi', 'Không thể dừng ghi âm.');
    }
  };

  // === GỬI MODEL AI VÀ SANG CÂU TIẾP ===
  const submitAndNext = async () => {
    if (!currentSentence) return;
    if (!recordingUri) {
      Alert.alert('Thông báo', 'Bạn cần ghi âm trước khi chấm điểm.');
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();

      if (Platform.OS === 'web') {
        // Web: uri là blob URL → fetch -> blob
        const resp = await fetch(recordingUri);
        const blob = await resp.blob();
        formData.append('audio', blob, 'shadow.wav');
      } else {
        // Mobile
        formData.append('audio', {
          uri: recordingUri,
          name: 'shadow.wav',
          type: 'audio/wav',
        } as any);
      }

      formData.append('text', currentSentence.text);

      const res = await axios.post(`${BASE_URL}/api/shadow/predict`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const { score, errors } = res.data || {};
      const scoreNum = typeof score === 'number' ? score : 0;

      // Tính total mới ngay lập tức để hiển thị trong modal/finish
      const isLast = !!(topic && currentIndex === (topic.sentences.length - 1));
      const newTotal = +(totalScore + scoreNum);

      // Lưu điểm tạm và hiện modal thay vì Alert thô
      setTotalScore(newTotal);
      setResultData({
        score: scoreNum,
        errors: errors || [],
        sentenceNumber: currentSentence.number,
        totalAfter: newTotal,
        isLast,
      });
      setResultModalVisible(true);

      // Reset recording uri để người dùng ghi lại nếu muốn
      setRecordingUri(null);
    } catch (err: any) {
      console.error('Lỗi khi gửi AI:', err);
      if (err.response) {
        console.log('Status:', err.response.status);
        console.log('Data:', err.response.data);
      }
      Alert.alert('Lỗi', 'Không thể chấm điểm câu này. Thử lại sau.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const onResultOk = () => {
    // Đóng modal, chuyển câu tiếp hoặc kết thúc
    setResultModalVisible(false);
    if (resultData.isLast) {
      setFinished(true);
      // Hiển thị tổng điểm
     setFinishModalVisible(true);
    } else {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.full}>
        <View style={styles.center}>
          <ActivityIndicator size="large" />
          <Text style={{ marginTop: 8 }}>Đang tải dữ liệu...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!topic || !currentSentence) {
    return (
      <SafeAreaView style={styles.full}>
        <View style={styles.center}>
          <Text>Không tìm thấy dữ liệu topic.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const totalSentences = topic.sentences.length;

  return (
    <SafeAreaView style={styles.full}>
      <View style={styles.container}>
        <Text style={styles.topicTitle}>{topic.title}</Text>
        <Text style={styles.topicDesc}>{topic.description}</Text>

        <Text style={styles.progress}>
          Câu {currentIndex + 1}/{totalSentences}
        </Text>

        <View style={styles.sentenceBox}>
          <Text style={styles.sentenceNumber}>#{currentSentence.number}</Text>
          <Text style={styles.sentenceText}>{currentSentence.text}</Text>
        </View>

        <View style={styles.recordRow}>
          {!recording ? (
            <TouchableOpacity
              style={[styles.btn, styles.btnPrimary]}
              onPress={startRecording}
              disabled={isSubmitting || finished}
            >
              <Text style={styles.btnText}>🎙 Bắt đầu ghi</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.btn, styles.btnDanger]}
              onPress={stopRecording}
              disabled={isSubmitting}
            >
              <Text style={styles.btnText}>⏹ Dừng ghi</Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.recordStatus}>
          {recording
            ? 'Đang ghi...'
            : recordingUri
            ? 'Đã ghi âm xong, sẵn sàng chấm điểm.'
            : 'Chưa có bản ghi âm.'}
        </Text>

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
            {currentIndex === totalSentences - 1
              ? 'Chấm điểm & hoàn thành'
              : 'Chấm điểm & sang câu tiếp'}
          </Text>
        </TouchableOpacity>

        <View style={styles.totalBox}>
          <Text style={styles.totalText}>
            Tổng điểm tạm thời: {totalScore.toFixed(1)}
          </Text>
        </View>
         
         {/* ------------------ Finish Modal ------------------ */}
<Modal
  animationType="fade"
  transparent
  visible={finishModalVisible}
  onRequestClose={() => setFinishModalVisible(false)}
>
  <View style={styles.modalOverlay}>
    <View style={styles.modalWrapper}>
      
      {/* PNG frame hoàn thành */}
      <Image
        source={FINISH_FRAME_URI}
        style={styles.finishFrame}
        resizeMode="contain"
      />

      {/* Nội dung */}
      <View style={styles.finishContent}>
        <Text style={styles.finishTitle}>Hoàn thành!</Text>

        <Text style={styles.finishText}>
          Bạn đã hoàn thành {topic?.sentences.length} câu
        </Text>

        <Text style={styles.finishScore}>
          Tổng điểm: {totalScore.toFixed(1)}
        </Text>

        <TouchableOpacity
          style={styles.finishBtn}
          onPress={() => setFinishModalVisible(false)}
        >
          <Text style={styles.finishBtnText}>Đóng</Text>
        </TouchableOpacity>
      </View>

    </View>
  </View>
</Modal>
{/* ---------------------------------------------------- */}
          

        {/* ------------------ Result Modal with PNG frame ------------------ */}
        <Modal
          animationType="fade"
          transparent
          visible={resultModalVisible}
          onRequestClose={() => setResultModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalWrapper}>
              {/* Frame image (use uploaded local path) */}
              <Image
                source={LOCAL_FRAME_URI }
                style={styles.resultFrame}
                resizeMode="contain"
              />

              {/* Content placed to fit inside yellow area of the frame.
                  Tweak styles.resultContent margins/paddings if needed */}
              <View style={styles.resultContent}>
                <Text style={styles.modalTitle}>
                  Câu {resultData.sentenceNumber}
                </Text>

                <Text style={styles.modalScore}>
                  Điểm: {resultData.score.toFixed(1)}
                </Text>

                <Text style={styles.modalErrors}>
                  {resultData.errors.length > 0
                    ? 'Lỗi: ' + resultData.errors.join(', ')
                    : 'Không phát hiện lỗi!'}
                </Text>

                <TouchableOpacity style={styles.modalBtn} onPress={onResultOk}>
                  <Text style={styles.modalBtnText}>OK</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
        {/* ---------------------------------------------------------------- */}
      </View>
    </SafeAreaView>
    
  );
};

const styles = StyleSheet.create({
  full: {
    flex: 1,
    backgroundColor: '#0b1220',
  },
  container: {
    flex: 1,
    padding: 16,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topicTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#f9fafb',
  },
  topicDesc: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 4,
    marginBottom: 12,
  },
  progress: {
    fontSize: 14,
    color: '#e5e7eb',
    marginBottom: 8,
  },
  sentenceBox: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  sentenceNumber: {
    color: '#9ca3af',
    marginBottom: 6,
  },
  sentenceText: {
    fontSize: 20,
    color: '#f9fafb',
    fontWeight: '600',
  },
  recordRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 8,
  },
  btn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 200,
  },
  btnPrimary: {
    backgroundColor: '#22c55e',
  },
  btnSecondary: {
    marginTop: 8,
    backgroundColor: '#3b82f6',
  },
  btnDanger: {
    backgroundColor: '#ef4444',
  },
  btnDisabled: {
    opacity: 0.5,
  },
  btnText: {
    color: '#f9fafb',
    fontWeight: '600',
    fontSize: 15,
  },
  recordStatus: {
    textAlign: 'center',
    color: '#d1d5db',
    marginTop: 6,
    marginBottom: 12,
    fontSize: 13,
  },
  totalBox: {
    marginTop: 16,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  totalText: {
    color: '#f9fafb',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },

  /* Modal styles */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalWrapper: {
    width: '85%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultFrame: {
    width: '200%',
    height: undefined,
    aspectRatio: 1.6, // có thể tinh chỉnh tùy khung ảnh
    position: 'absolute',
    top: 0,
  },
  resultContent: {
    width: '72%',
    marginTop: 90, // đẩy xuống để tránh đè phải chim
    paddingVertical: 28,
    alignItems: 'center',
  },
  modalTitle: {
    color: '#000',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  modalScore: {
    color: '#b45309',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  modalErrors: {
    color: '#000',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 18,
  },
  modalBtn: {
    backgroundColor: '#ef4444',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  modalBtnText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 16,
  },
  finishFrame: {
  width: '250%',
  height: undefined,
  aspectRatio: 1.6,   // hoặc giữ 1.6 nếu PNG thuôn dài
  position: 'absolute',
  top: -90,     
},

finishContent: {
  width: '72%',
  marginTop: 120,
  alignItems: 'center',
},

finishTitle: {
  color: '#000000ff',
  fontSize: 26,
  fontWeight: '800',
  marginBottom: 10,
},

finishText: {
  color: '#000',
  fontSize: 18,
  marginBottom: 6,
},

finishScore: {
  color: '#b45309',
  fontSize: 22,
  fontWeight: '700',
  marginBottom: 20,
},

finishBtn: {
  backgroundColor: '#3b82f6',
  paddingVertical: 12,
  paddingHorizontal: 30,
  borderRadius: 12,
},

finishBtnText: {
  color: 'white',
  fontSize: 16,
  fontWeight: '700',
},

});

export default ShadowSentencesScreen;
