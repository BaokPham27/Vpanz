import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const API_URL = 'https://vpanz-api.onrender.com/api';

let getItemAsync: (key: string) => Promise<string | null>;
if (Platform.OS !== 'web') {
  try {
    const SecureStore = require('expo-secure-store');
    getItemAsync = SecureStore.getItemAsync;
  } catch {
    getItemAsync = AsyncStorage.getItem;
  }
} else {
  getItemAsync = AsyncStorage.getItem;
}

const getAuthToken = async () => {
  try {
    return await getItemAsync('token');
  } catch (error) {
    console.error('Error retrieving token:', error);
    return null;
  }
};

const getFileExtension = (uri: string) => {
  if (!uri) return '';
  const parts = uri.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toUpperCase() : '';
};

const styles = StyleSheet.create({
  // ... (giữ nguyên toàn bộ styles của bạn)
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#e0e0e0' },
  headerTitle: { flex: 1, marginLeft: 12 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  subtitle: { fontSize: 12, color: '#999', marginTop: 2 },
  addButton: { backgroundColor: '#007bff', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  listContainer: { padding: 16, paddingBottom: 32 },
  flashcardItem: { height: 250, marginBottom: 16 },
  flashcardInner: { width: '100%', height: '100%', position: 'absolute', backfaceVisibility: 'hidden', borderRadius: 12, borderWidth: 1, borderColor: '#e0e0e0', backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  flashcardFront: { justifyContent: 'space-between', alignItems: 'center' },
  flashcardBack: { justifyContent: 'center', alignItems: 'center', padding: 16 },
  imageContainer: { width: '100%', alignItems: 'center' },
  flashcardImage: { width: '100%', height: 180, borderTopLeftRadius: 12, borderTopRightRadius: 12, resizeMode: 'contain', backgroundColor: '#f0f0f0' },
  imageFormatText: { fontSize: 12, color: '#666', marginTop: 4 },
  flashcardContent: { padding: 16, flex: 1, alignItems: 'center', justifyContent: 'center' },
  vocabulary: { fontSize: 20, fontWeight: 'bold', color: '#333', textAlign: 'center' },
  phonetic: { fontSize: 14, color: '#666', fontStyle: 'italic', marginTop: 4, textAlign: 'center' },
  meaning: { fontSize: 18, color: '#333', textAlign: 'center', lineHeight: 24 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#999', marginTop: 16 },
  emptySubtext: { fontSize: 14, color: '#bbb', marginTop: 8, textAlign: 'center', paddingHorizontal: 32 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#e0e0e0' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  formContainer: { padding: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8, marginTop: 12 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12, fontSize: 14, color: '#333', backgroundColor: '#f9f9f9' },
  imagePickerButton: { borderWidth: 2, borderStyle: 'dashed', borderColor: '#007bff', borderRadius: 8, padding: 32, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f7ff' },
  imagePickerText: { marginTop: 12, fontSize: 14, color: '#007bff', fontWeight: '500' },
  imagePreviewContainer: { position: 'relative', borderRadius: 8, overflow: 'hidden', marginBottom: 12 },
  imagePreview: { width: '100%', height: 160, backgroundColor: '#f0f0f0' },
  removeImageButton: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 12, width: 24, height: 24, justifyContent: 'center', alignItems: 'center' },
  buttonContainer: { flexDirection: 'row', gap: 12, marginTop: 24, marginBottom: 32 },
  button: { flex: 1, paddingVertical: 12, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  cancelButton: { backgroundColor: '#e0e0e0' },
  cancelButtonText: { fontSize: 14, fontWeight: '600', color: '#333' },
  createButton: { backgroundColor: '#007bff' },
  createButtonText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  cardActions: { position: 'absolute', bottom: 10, right: 10, flexDirection: 'row' },
  cardButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, marginLeft: 8 },
  editButton: { backgroundColor: '#3498db' },
  deleteButton: { backgroundColor: '#e74c3c' },
  cardButtonText: { color: '#fff', marginLeft: 6, fontWeight: '600' },
});

const FlashcardItem = ({ item, onEdit, onDelete }: { item: any; onEdit: () => void; onDelete: () => void }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const flipAnimation = useRef(new Animated.Value(0)).current;

  const flipCard = () => {
    Animated.spring(flipAnimation, {
      toValue: isFlipped ? 0 : 180,
      friction: 8,
      tension: 10,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
    setIsFlipped(!isFlipped);
  };

  const frontStyle = { transform: [{ rotateY: flipAnimation.interpolate({ inputRange: [0, 180], outputRange: ['0deg', '1deg'] }) }] };
  const backStyle = { transform: [{ rotateY: flipAnimation.interpolate({ inputRange: [0, 180], outputRange: ['180deg', '360deg'] }) }] };

  return (
    <TouchableOpacity onPress={flipCard} activeOpacity={0.8}>
      <View style={styles.flashcardItem}>
        <Animated.View style={[styles.flashcardInner, styles.flashcardFront, frontStyle]}>
          {item.image && (
            <View style={styles.imageContainer}>
              <Image
                source={{ uri: item.image.startsWith('http') ? item.image : `https://vpanz-api.onrender.com${item.image}` }}
                style={styles.flashcardImage}
              />
              <Text style={styles.imageFormatText}>{getFileExtension(item.image)}</Text>
            </View>
          )}
          <View style={styles.flashcardContent}>
            <Text style={styles.vocabulary}>{item.vocabulary}</Text>
            {item.phonetic && <Text style={styles.phonetic}>/{item.phonetic}/</Text>}
          </View>
        </Animated.View>

        <Animated.View style={[styles.flashcardInner, styles.flashcardBack, backStyle]}>
          <View style={styles.flashcardContent}>
            <Text style={styles.meaning}>{item.meaning}</Text>
          </View>
          <View style={styles.cardActions}>
            <TouchableOpacity onPress={onEdit} style={[styles.cardButton, styles.editButton]}>
              <Ionicons name="pencil" size={20} color="#fff" />
              <Text style={styles.cardButtonText}>Sửa</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onDelete} style={[styles.cardButton, styles.deleteButton]}>
              <Ionicons name="trash" size={20} color="#fff" />
              <Text style={styles.cardButtonText}>Xóa</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </TouchableOpacity>
  );
};

export default function FlashcardDetailScreen() {
  const { setId } = useLocalSearchParams();
  const router = useRouter();
  const actualSetId = Array.isArray(setId) ? setId[0] : setId;

  const [setData, setSetData] = useState<any>(null);
  const [flashcards, setFlashcards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);

  const [vocabulary, setVocabulary] = useState('');
  const [phonetic, setPhonetic] = useState('');
  const [meaning, setMeaning] = useState('');
  const [imageUri, setImageUri] = useState('');

  useFocusEffect(
    useCallback(() => {
      if (!actualSetId || actualSetId === 'undefined') {
        setLoading(false);
        return;
      }
      fetchFlashcardSetData();
    }, [actualSetId])
  );

  const fetchFlashcardSetData = async () => {
    if (!actualSetId) return;
    try {
      setLoading(true);
      const token = await getAuthToken();
      if (!token) {
        Alert.alert('Lỗi', 'Phiên đăng nhập hết hạn');
        router.replace('/AuthScreen');
        return;
      }

      // fetch thông tin set
      const resSet = await fetch(`${API_URL}/flashcard-sets/${actualSetId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resSet.ok) throw new Error('Không lấy được set');

      const setData = await resSet.json();
      setSetData(setData);

      // fetch flashcards theo easeFactor = setId
      const resCards = await fetch(`${API_URL}/flashcards/sets/${actualSetId}/flashcards`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!resCards.ok) throw new Error('Không lấy được flashcards');

      const flashcardsData = await resCards.json();
      console.log('Fetched flashcards:', flashcardsData);

      setFlashcards(Array.isArray(flashcardsData) ? flashcardsData : flashcardsData.flashcards || []);


    } catch (err: any) {
      console.error(err);
      Alert.alert('Lỗi', err.message || 'Lỗi mạng');
    } finally {
      setLoading(false);
    }
  };


  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setImageUri(result.assets[0].uri);
    }
  };

  // HÀM CHÍNH – ĐÃ FIX HOÀN TOÀN CHO EXPO WEB
  const handleCreateFlashcard = async () => {
    if (!vocabulary.trim() || !meaning.trim()) {
      Alert.alert('Lỗi', 'Từ vựng và nghĩa là bắt buộc');
      return;
    }

    const token = await getAuthToken();
    if (!token) {
      Alert.alert('Lỗi', 'Phiên đăng nhập hết hạn');
      return;
    }

    const formData = new FormData();

    formData.append('vocabulary', vocabulary.trim());
    formData.append('phonetic', phonetic.trim());
    formData.append('meaning', meaning.trim());

    if (imageUri) {
      if (Platform.OS === 'web') {
        try {
          const response = await fetch(imageUri);
          const blob = await response.blob();
          const filename = imageUri.split('/').pop() || `image_${Date.now()}.jpg`;
          formData.append('image', blob, filename);
        } catch (err) {
          Alert.alert('Lỗi', 'Không thể xử lý ảnh trên web');
          return;
        }
      } else {
        const filename = imageUri.split('/').pop() || `image_${Date.now()}.jpg`;
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1].toLowerCase()}` : 'image/jpeg';

        formData.append('image', {
          uri: Platform.OS === 'ios' ? imageUri.replace('file://', '') : imageUri,
          name: filename,
          type,
        } as any);
      }
    }

    try {
      const res = await fetch(`${API_URL}/flashcards/sets/${actualSetId}/flashcards`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          // ĐỪNG ĐẶT Content-Type → để browser tự set boundary
        },
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        Alert.alert('Lỗi', data.message || 'Thêm flashcard thất bại');
        return;
      }

      await fetchFlashcardSetData();
      setVocabulary('');
      setPhonetic('');
      setMeaning('');
      setImageUri('');
      setIsModalVisible(false);
      Alert.alert('Thành công!', 'Đã thêm flashcard mới');
    } catch (err: any) {
      console.error('Lỗi mạng:', err);
      Alert.alert('Lỗi', 'Không thể kết nối server');
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007bff" />
      </View>
    );
  }

  if (!actualSetId || actualSetId === 'undefined') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={28} color="#333" />
          </TouchableOpacity>
          <View style={styles.headerTitle}>
            <Text style={styles.title}>Lỗi</Text>
          </View>
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>Không tìm thấy bộ flashcard</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color="#333" />
        </TouchableOpacity>
        <View style={styles.headerTitle}>
          <Text style={styles.title}>{setData?.title || 'Flashcard'}</Text>
          <Text style={styles.subtitle}>{flashcards.length} thẻ</Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={() => setIsModalVisible(true)}>
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={flashcards}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        renderItem={({ item }) => <FlashcardItem item={item} onEdit={() => { }} onDelete={() => { }} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="card-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>Chưa có flashcard</Text>
            <Text style={styles.emptySubtext}>Nhấn nút + để thêm thẻ đầu tiên</Text>
          </View>
        }
      />

      <Modal visible={isModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Thêm Flashcard</Text>
              <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                <Ionicons name="close" size={28} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formContainer}>
              <Text style={styles.label}>Từ vựng *</Text>
              <TextInput style={styles.input} value={vocabulary} onChangeText={setVocabulary} placeholder="Nhập từ" />

              <Text style={styles.label}>Phiên âm</Text>
              <TextInput style={styles.input} value={phonetic} onChangeText={setPhonetic} placeholder="/konnichiwa/" />

              <Text style={styles.label}>Nghĩa *</Text>
              <TextInput style={[styles.input, { height: 100, textAlignVertical: 'top' }]} value={meaning} onChangeText={setMeaning} multiline placeholder="Xin chào" />

              <Text style={styles.label}>Hình ảnh</Text>
              {imageUri ? (
                <View style={styles.imagePreviewContainer}>
                  <Image source={{ uri: imageUri }} style={styles.imagePreview} />
                  <TouchableOpacity style={styles.removeImageButton} onPress={() => setImageUri('')}>
                    <Ionicons name="close-circle" size={24} color="#fff" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={styles.imagePickerButton} onPress={pickImage}>
                  <Ionicons name="image" size={32} color="#007bff" />
                  <Text style={styles.imagePickerText}>Chọn ảnh</Text>
                </TouchableOpacity>
              )}

              <View style={styles.buttonContainer}>
                <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={() => setIsModalVisible(false)}>
                  <Text style={styles.cancelButtonText}>Hủy</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.button, styles.createButton]} onPress={handleCreateFlashcard}>
                  <Text style={styles.createButtonText}>Tạo</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
