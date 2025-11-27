// app/notifications.tsx
import { router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { SafeAreaView, ScrollView, Text, View } from 'react-native';

export default function NotificationsScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0b1220' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderColor: '#333' }}>
        <ChevronLeft color="#fff" size={28} onPress={() => router.back()} />
        <Text style={{ color: '#fff', fontSize: 20, fontWeight: 'bold', marginLeft: 16 }}>
          Tất cả thông báo
        </Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text style={{ color: '#aaa', textAlign: 'center', marginTop: 50 }}>
          Sắp có nhé
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}