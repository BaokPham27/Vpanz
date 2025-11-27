// app/(books)/list.tsx
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import api from '../../../utils/api'; // ← ĐÚNG ĐƯỜNG DẪN TỚI FILE BÊN TRÊN

type Book = {
  id: string;
  title: string;
  author: string;
  level: string;
  chapters: number;
  coverImage?: string;
};

export default function BooksList() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBooks = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/books'); // ← ĐÃ TỰ ĐỘNG CHỌN localhost HOẶC 192.168.2.6
      setBooks(response.data);
    } catch (error: any) {
      Alert.alert('Lỗi', 'Không thể tải danh sách sách. Vui lòng kiểm tra kết nối.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooks();
  }, []);

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#60a5fa" />
        <Text style={{ color: '#fff', marginTop: 16 }}>Đang tải sách...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sách Song Ngữ Nhật - Việt</Text>
      <ScrollView style={styles.list}>
        {books.length === 0 ? (
          <Text style={styles.emptyText}>Chưa có sách nào</Text>
        ) : (
          books.map(book => (
            <TouchableOpacity
              key={book.id}
              style={styles.bookCard}
              onPress={() => router.push(`/books/${book.id}/1`)}
            >
              <View style={styles.bookCover}>
                {book.coverImage ? (
                  <Image source={{ uri: book.coverImage }} style={styles.coverImage} resizeMode="cover" />
                ) : (
                  <Text style={styles.bookEmoji}>Book</Text>
                )}
              </View>
              <View style={styles.bookInfo}>
                <Text style={styles.bookTitle}>{book.title}</Text>
                <Text style={styles.bookAuthor}>Tác giả: {book.author}</Text>
                <Text style={styles.bookLevel}>Cấp độ: {book.level}</Text>
                <Text style={styles.bookChapters}>{book.chapters} chương</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b1220', padding: 16 },
  center: { justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 20, textAlign: 'center' },
  list: { flex: 1 },
  emptyText: { color: '#94a3b8', textAlign: 'center', marginTop: 50, fontSize: 16 },
  bookCard: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  bookCover: {
    width: 90,
    height: 130,
    backgroundColor: '#334155',
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 16,
  },
  coverImage: { width: '100%', height: '100%' },
  bookEmoji: { fontSize: 48, color: '#64748b' },
  bookInfo: { flex: 1 },
  bookTitle: { color: '#fff', fontSize: 19, fontWeight: 'bold' },
  bookAuthor: { color: '#cbd5e1', fontSize: 15, marginTop: 4 },
  bookLevel: { color: '#60a5fa', fontSize: 15, marginTop: 4, fontWeight: '600' },
  bookChapters: { color: '#94a3b8', fontSize: 14, marginTop: 6 },
});