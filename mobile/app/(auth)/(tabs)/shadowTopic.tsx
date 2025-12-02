import axios from 'axios';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

interface Topic {
  _id: string;
  title: string;
  description: string;
}

// ĐỔI IP NÀY CHO ĐÚNG
const BASE_URL = 'http://10.249.2.233:5000';

// ⭐ ảnh linh vật
const MASCOT = require('../../../assets/images/linhvat.png');

const ShadowTopicScreen = () => {
  const router = useRouter();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTopics();
  }, []);

  const fetchTopics = async () => {
    try {
      setError(null);
      console.log('Fetching topics...');
      const res = await axios.get(`${BASE_URL}/api/shadow`);
      setTopics(res.data);
    } catch (err) {
      console.error('Error fetching topics:', err);
      setError('Không tải được danh sách topic. Kiểm tra server / mạng.');
    } finally {
      setLoading(false);
    }
  };

  const handlePress = (id: string) => {
    router.push({
      pathname: '/(auth)/(tabs)/shadowSentences',
      params: { topicId: id },
    });
  };

  const renderItem = ({ item }: { item: Topic }) => (
    <TouchableOpacity style={styles.card} onPress={() => handlePress(item._id)}>
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.description} numberOfLines={2}>
        {item.description}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.full}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000" />
          <Text style={{ marginTop: 8 }}>Đang tải topic...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.full}>
      
      {/* ⭐ BANNER CHÀO MỪNG */}
      <View style={styles.banner}>
        <View style={{ flex: 1 }}>
          <Text style={styles.bannerTitle}>Chào mừng bạn</Text>
          <Text style={styles.bannerSubtitle}>đến với lớp luyện nói của Pan</Text>
        </View>

        <Image source={MASCOT} style={styles.mascot} resizeMode="contain" />
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}

      {!error && topics.length === 0 && (
        <View style={styles.loadingContainer}>
          <Text>Không có topic nào.</Text>
        </View>
      )}

      {topics.length > 0 && (
        <FlatList
          data={topics}
          renderItem={renderItem}
          keyExtractor={(item) => item._id}
          numColumns={2}
          contentContainerStyle={styles.container}
          columnWrapperStyle={styles.columnWrapper}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  full: {
    flex: 1,
    backgroundColor: '#f1dff7ff',
  },

  /* ⭐ Banner */
  banner: {
    flexDirection: 'row',
    backgroundColor: '#0d5cdcff',
    margin: 12,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    elevation: 4,
  },
  bannerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
  },
  bannerSubtitle: {
    color: 'white',
    fontSize: 14,
    marginTop: 4,
  },
  mascot: {
    width: 120,
    height: 120,
    marginLeft: 1,
  },

  container: {
    padding: 10,
    paddingTop: 0, // tránh bị đụng banner
  },
  columnWrapper: {
    justifyContent: 'space-between',
  },

  /* Thẻ topic */
  card: {
    flex: 1,
    backgroundColor: '#fececeff',
    marginBottom: 10,
    padding: 14,
    borderRadius: 12,
    elevation: 3,
    marginHorizontal: 5,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
    color: '#1f2937',
  },
  description: {
    fontSize: 14,
    color: '#6b7280',
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  errorText: {
    color: 'red',
    paddingHorizontal: 12,
    paddingTop: 12,
  },
});

export default ShadowTopicScreen;
