// components/admin/StatsRow.tsx
import { sharedStyles } from '@/styles/sharedStyles';
import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { Text, View } from 'react-native';

interface Stats {
  totalBooks: number;
  totalFlashcards: number;
  totalUsers: number;
}

export default function StatsRow({ stats }: { stats: Stats }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 16, marginBottom: 24 }}>
      <View style={sharedStyles.statCard}>
        <MaterialIcons name="book" size={40} color="#4a00e0" />
        <Text style={sharedStyles.statNumber}>{stats.totalBooks}</Text>
        <Text style={sharedStyles.statLabel}>Sách</Text>
      </View>

      <View style={sharedStyles.statCard}>
        <MaterialIcons name="credit-card" size={40} color="#00bcd4" />
        <Text style={sharedStyles.statNumber}>{stats.totalFlashcards}</Text>
        <Text style={sharedStyles.statLabel}>Flashcard</Text>
      </View>

      <View style={sharedStyles.statCard}>
        <MaterialIcons name="people" size={40} color="#ff9800" />
        <Text style={sharedStyles.statNumber}>{stats.totalUsers}</Text>
        <Text style={sharedStyles.statLabel}>Người dùng</Text>
      </View>
    </View>
  );
}