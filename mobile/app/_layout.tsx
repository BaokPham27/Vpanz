// app/_layout.tsx ← TÊN PHẢI LÀ _layout.tsx (có dấu gạch dưới)
import GoogleProvider from "@/components/GoogleProvider"; // điều chỉnh đường dẫn nếu cần
import { AuthProvider } from '@/context/AuthContext';
import { SocketProvider } from '@/context/SocketContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { NativeModules } from 'react-native';
const { DevSettings } = NativeModules;
SplashScreen.preventAutoHideAsync();

if (__DEV__) {
  DevSettings?.setIsDebuggingRemotely?.(false);   // tắt Remote JS Debugging
  DevSettings?.setProfilingEnabled?.(false);
  // DÒNG QUAN TRỌNG NHẤT: TẮT DEV MENU
  DevSettings?.setIsDevMenuEnabled?.(false);     // ← XÓA THANH ĐEN ĐEN
}
export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;

  return (
    <GoogleProvider>
      <AuthProvider>
        <SocketProvider>
          <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="login" />
              <Stack.Screen name="register" />
              <Stack.Screen name="(auth)" options={{ headerShown: false }} />
              <Stack.Screen name="+not-found" />
            </Stack>
          </ThemeProvider>
        </SocketProvider>
      </AuthProvider>
    </GoogleProvider>
  );
}