// app/(tabs)/_layout.tsx ← CHỈ CÒN ProtectedRoute, KHÔNG CẦN AuthProvider NỮA!
import { Tabs } from "expo-router";
import { NativeModules } from 'react-native';
import ProtectedRoute from "../../../components/ProtectedRoute";
const { DevSettings } = NativeModules;
if (__DEV__) {
  DevSettings?.setIsDebuggingRemotely?.(false);   // tắt Remote JS Debugging
  DevSettings?.setProfilingEnabled?.(false);
  // DÒNG QUAN TRỌNG NHẤT: TẮT DEV MENU
  DevSettings?.setIsDevMenuEnabled?.(false);     // ← XÓA THANH ĐEN ĐEN
}
export default function TabsLayout() {
  return (
    <ProtectedRoute>
      
      <Tabs screenOptions={{ headerShown: false }}>
        
        <Tabs.Screen name="index" options={{ title: "Home" }} />
        <Tabs.Screen name="explore" options={{ title: "Explore" }} />
        {/* các tab khác */}
      </Tabs>
    </ProtectedRoute>
  );
}