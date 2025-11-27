import "@/services/config"
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  Alert,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getItemAsync } from 'expo-secure-store';
import { API_BASE_URL } from '@/services/config';
import { styles } from './id.style'; // I'll create this file next

const getAuthToken = async () => {
  return getItemAsync('token');
};

export default function FlashSetDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [setDetails, setSetDetails] = useState(null);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSetDetails = useCallback(async () => {
    try {
      setError(null);
      const token = await getAuthToken();
      if (!token) {
        Alert.alert('Authentication Error', 'You are not logged in.');
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/flashcard-sets/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        setSetDetails(data);
      } else {
        throw new Error(data.message || 'Failed to fetch set details');
      }
    } catch (err) {
      setError(err.message);
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    fetchSetDetails();
  }, [fetchSetDetails]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchSetDetails();
  }, [fetchSetDetails]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.linkText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {setDetails?.title || 'Flashcard Set'}
        </Text>
        <TouchableOpacity onPress={() => { /* Edit action */ }} style={styles.editButton}>
          <Ionicons name="ellipsis-horizontal" size={24} color="#111827" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Placeholder for flashcards list */}
        <View style={styles.centered}>
          <Text>Flashcards will be listed here.</Text>
        </View>

      </ScrollView>

      {/* Add Card Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => { /* Navigate to add card screen */ }}
      >
        <Ionicons name="add" size={32} color="white" />
      </TouchableOpacity>
    </View>
  );
}