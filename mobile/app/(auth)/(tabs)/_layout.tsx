// app/(tabs)/_layout.tsx ← CHỈ CÒN ProtectedRoute, KHÔNG CẦN AuthProvider NỮA!
import { Tabs } from "expo-router";
import ProtectedRoute from "../../../components/ProtectedRoute";

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