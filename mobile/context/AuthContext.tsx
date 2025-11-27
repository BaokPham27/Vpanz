import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { createContext, ReactNode, useContext, useEffect, useState } from "react";

type User = {
  id: string;
  name: string;
  email: string;
  avatarURL?: string;
  token?: string; // ← THÊM DÒNG NÀY (tùy chọn, để tương thích cũ)
  role?: 'user' | 'teacher';
} | null;

type AuthContextType = {
  user: User;
  token: string | null;
  login: (token: string, userData: any) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
  updateUser: (newUserData: any) => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load từ storage khi app khởi động
  useEffect(() => {
    (async () => {
      try {
        const [storedToken, storedUser] = await Promise.all([
          AsyncStorage.getItem("token"),
          AsyncStorage.getItem("user")
        ]);

        if (storedToken && storedUser) {
          const parsedUser = JSON.parse(storedUser);
          setToken(storedToken);
          setUser(parsedUser);

          // QUAN TRỌNG: Gắn token vào user object để các nơi cũ vẫn dùng được (user.token)
          setUser({ ...parsedUser, token: storedToken });
        }
      } catch (e) {
        console.log("Lỗi load auth:", e);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = async (newToken: string, userData: any) => {
    setToken(newToken);

    const userWithToken = {
      ...userData,
      token: newToken,
      avatarURL: userData.avatarURL || null,  // ← ép lại cho chắc
      role: userData.role || 'user'
    };

    setUser(userWithToken);

    await AsyncStorage.setItem("token", newToken);
    await AsyncStorage.setItem("user", JSON.stringify(userWithToken));

    router.replace("/(auth)/(tabs)");
  };
  const updateUser = (newUserData: any) => {
    setUser(prev => {
      const updated = { ...prev, ...newUserData };

      // QUAN TRỌNG: Luôn giữ token và các field cần thiết
      if (token) updated.token = token;

      // Lưu lại vào AsyncStorage ngay lập tức
      AsyncStorage.setItem("user", JSON.stringify(updated)).catch(() => { });

      return updated;
    });
  };
  const logout = async () => {
    setUser(null);
    setToken(null);
    await AsyncStorage.multiRemove(["token", "user"]);
    router.replace("/login");
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth phải dùng trong AuthProvider");
  return context;
};