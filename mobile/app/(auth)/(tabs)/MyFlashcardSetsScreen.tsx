// File: screens/MyFlashcardSetsScreen.tsx
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import axios from 'axios';
import { router } from 'expo-router'; // ← thêm dòng này vào đầu file (nếu chưa có)
import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

// Thay bằng URL backend của bạn
const API_URL = 'https://vpanz-api.onrender.com/api';

interface FlashcardSet {
    _id: string;
    title: string;
    description?: string;
    flashcards: any[];
    playCount?: number;
    highScore?: number;
    createdAt: string;
}

interface Stats {
    totalSets: number;
    totalCards: number;
    avgScore: number;
}

export default function MyFlashcardSetsScreen({ navigation }: any) {
    const [sets, setSets] = useState<FlashcardSet[]>([]);
    const [stats, setStats] = useState<Stats>({ totalSets: 0, totalCards: 0, avgScore: 0 });
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchSets = async () => {
        try {
            const token = await AsyncStorage.getItem('token');
            const response = await axios.get(`${API_URL}/flashcard-sets`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            const fetchedSets = response.data;

            // Tính thống kê
            const totalCards = fetchedSets.reduce((sum: number, set: FlashcardSet) => sum + (set.flashcards?.length || 0), 0);
            const avgScore = fetchedSets.length > 0
                ? fetchedSets.reduce((sum: number, set: FlashcardSet) => sum + (set.highScore || 0), 0) / fetchedSets.length
                : 0;

            setStats({
                totalSets: fetchedSets.length,
                totalCards,
                avgScore: Math.round(avgScore * 10) / 10,
            });

            setSets(fetchedSets);
        } catch (err: any) {
            Alert.alert('Lỗi', err.response?.data?.message || 'Không thể tải dữ liệu');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchSets();
        }, [])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchSets();
    };

    const deleteSet = (id: string) => {
        Alert.alert(
            'Xóa bộ flashcard',
            'Bạn có chắc muốn xóa bộ này?',
            [
                { text: 'Hủy', style: 'cancel' },
                {
                    text: 'Xóa',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const token = await AsyncStorage.getItem('userToken');
                            await axios.delete(`${API_URL}/flashcard-sets/${id}`, {
                                headers: { Authorization: `Bearer ${token}` },
                            });
                            setSets(prev => prev.filter(s => s._id !== id));
                            Alert.alert('Thành công', 'Đã xóa bộ flashcard');
                        } catch (err) {
                            Alert.alert('Lỗi', 'Không thể xóa');
                        }
                    },
                },
            ],
            { cancelable: true }
        );
    };

    const renderSet = ({ item }: { item: FlashcardSet }) => (
        <View style={styles.projectBox}>
            <View style={styles.projectBoxHeader}>
                <Text style={styles.setDate}>
                    {new Date(item.createdAt).toLocaleDateString('vi-VN')}
                </Text>
                <TouchableOpacity onPress={() => deleteSet(item._id)}>
                    <Ionicons name="trash-outline" size={20} color="#999" />
                </TouchableOpacity>
            </View>

            <TouchableOpacity
                style={{ flex: 1 }}
            >
                <Text style={styles.boxContentHeader} numberOfLines={2}>
                    {item.title}
                </Text>
                {item.description ? (
                    <Text style={styles.boxContentSubheader} numberOfLines={2}>
                        {item.description}
                    </Text>
                ) : null}

                <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                        <Ionicons name="card-outline" size={16} color="#666" />
                        <Text style={styles.statText}>{item.flashcards?.length || 0} thẻ</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Ionicons name="play-circle-outline" size={16} color="#666" />
                        <Text style={styles.statText}>{item.playCount || 0} lượt</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Ionicons name="trophy-outline" size={16} color="#666" />
                        <Text style={styles.statText}>{item.highScore || 0}%</Text>
                    </View>
                </View>
            </TouchableOpacity>

            <View style={styles.projectBoxFooter}>
                <TouchableOpacity
                    style={styles.editBtn}
                    onPress={() => router.push(`/flashcards/${item._id}`)}
                >
                    <Ionicons name="create-outline" size={18} color="#4f3ff0" />
                    <Text style={styles.editText}>Sửa</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.studyBtn}
                    onPress={() => router.push(`/speed/${item._id}`)}
                >
                    <Text style={styles.studyText}>Luyện thi</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#4f3ff0" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header thống kê tổng quan */}
            <View style={styles.projectsSectionHeader}>
                <Text style={styles.headerTitle}>Bộ flashcard của tôi</Text>
            </View>

            <View style={styles.statsContainer}>
                <View style={styles.statBig}>
                    <Text style={styles.statNumber}>{stats.totalSets}</Text>
                    <Text style={styles.statLabel}>Bộ thẻ</Text>
                </View>
                <View style={styles.statBig}>
                    <Text style={styles.statNumber}>{stats.totalCards}</Text>
                    <Text style={styles.statLabel}>Tổng thẻ</Text>
                </View>
                <View style={styles.statBig}>
                    <Text style={styles.statNumber}>{stats.avgScore}%</Text>
                    <Text style={styles.statLabel}>Điểm trung bình</Text>
                </View>
            </View>

            {/* Danh sách */}
            <FlatList
                data={sets}
                keyExtractor={(item) => item._id}
                renderItem={renderSet}
                numColumns={1}  // <-- ĐÚNG: dùng = và bọc trong {}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }

                contentContainerStyle={{ padding: 16 }}  // <-- ĐÚNG: bọc trong {}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f3f6fd' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f3f6fd' },

    projectsSectionHeader: {
        padding: 20,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderColor: '#eee',
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#1f1c2e',
    },

    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        padding: 20,
        backgroundColor: '#fff',
    },
    statBig: {
        alignItems: 'center',
    },
    statNumber: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#4f3ff0',
    },
    statLabel: {
        fontSize: 14,
        color: '#666',
        marginTop: 4,
    },

    projectBox: {
        backgroundColor: '#e9e7fd',
        borderRadius: 30,
        padding: 20,
        marginBottom: 16,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    projectBoxHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    setDate: {
        fontSize: 13,
        color: '#888',
    },
    boxContentHeader: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1f1c2e',
        marginBottom: 6,
    },
    boxContentSubheader: {
        fontSize: 14,
        color: '#666',
        marginBottom: 12,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10,
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statText: {
        marginLeft: 6,
        fontSize: 14,
        color: '#666',
    },
    projectBoxFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderColor: 'rgba(255,255,255,0.4)',
    },
    editBtn: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    editText: {
        marginLeft: 6,
        color: '#4f3ff0',
        fontWeight: '600',
    },
    studyBtn: {
        backgroundColor: '#4f3ff0',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
    },
    studyText: {
        color: '#fff',
        fontWeight: 'bold',
    },

    emptyContainer: {
        alignItems: 'center',
        marginTop: 60,
    },
    emptyText: {
        marginTop: 16,
        fontSize: 18,
        color: '#999',
    },
    createBtn: {
        marginTop: 20,
        backgroundColor: '#4f3ff0',
        paddingHorizontal: 30,
        paddingVertical: 12,
        borderRadius: 25,
    },
    createBtnText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
});
