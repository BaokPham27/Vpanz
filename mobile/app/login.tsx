import { useSocket } from '@/context/SocketContext';
import axios from "axios";
import { Link } from "expo-router";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../context/AuthContext";

// TẠO AXIOS INSTANCE CÓ BASEURL → QUAN TRỌNG NHẤT!
const api = axios.create({
  baseURL:
    Platform.OS === "web"
      ? "http://localhost:5000/api/auth"
      : "http://26.94.144.5:5000/api/auth", // ← ĐÚNG IP MÁY BẠN HIỆN TẠI
  timeout: 10000,
});

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { socket } = useSocket(); // ← lấy socket từ context
  const handleLogin = async () => {
    if (!email || !password) {
      return Alert.alert("Lỗi", "Vui lòng nhập đầy đủ email và mật khẩu");
    }

    setLoading(true);
    console.log("Bắt đầu đăng nhập:", email);

    try {
      // CHỈ CẦN GỌI "/login" → axios tự thêm baseURL
      const res = await api.post("/login", { email, password });

      console.log("Đăng nhập thành công! Token:", res.data.token);
      console.log("User:", res.data.user);

      // Gọi hàm login từ AuthContext
      await login(res.data.token, res.data.user);
      Alert.alert("Thành công", "Đăng nhập thành công!");
    } catch (err: any) {
      console.error("ĐĂNG NHẬP THẤT BẠI:", err);

      if (err.response) {
        // Server trả lỗi (400, 500,...)
        const msg = err.response.data?.message || "Sai email hoặc mật khẩu";
        Alert.alert("Đăng nhập thất bại", msg);
      } else if (err.request) {
        // Không kết nối được server
        Alert.alert("Lỗi mạng", "Không thể kết nối đến server. Kiểm tra IP và backend!");
      } else {
        // Lỗi khác (axios config,...)
        Alert.alert("Lỗi", err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <View style={styles.inner}>
          {/* Logo */}
          <View style={styles.logoContainer}>
            <View style={styles.logo}>
              <Text style={styles.logoText}>V</Text>
            </View>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Đăng nhập để tiếp tục</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#94a3b8"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TextInput
              style={styles.input}
              placeholder="Mật khẩu"
              placeholderTextColor="#94a3b8"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <TouchableOpacity
              style={styles.button}
              onPress={handleLogin}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? "Đang đăng nhập..." : "Đăng nhập"}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Chưa có tài khoản? </Text>
            <Link href="/register" style={styles.linkText}>
              Đăng ký ngay
            </Link>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a" },
  inner: { flex: 1, justifyContent: "center", padding: 30 },
  logoContainer: { alignItems: "center", marginBottom: 50 },
  logo: {
    width: 100,
    height: 100,
    backgroundColor: "#6366f1",
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#6366f1",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
  },
  logoText: { color: "white", fontSize: 60, fontWeight: "bold" },
  title: { color: "white", fontSize: 36, fontWeight: "bold", marginTop: 20 },
  subtitle: { color: "#94a3b8", fontSize: 18, marginTop: 8 },
  form: { marginTop: 20 },
  input: {
    backgroundColor: "#1e293b",
    color: "white",
    padding: 18,
    borderRadius: 16,
    marginBottom: 16,
    fontSize: 16,
  },
  button: {
    backgroundColor: "#6366f1",
    padding: 18,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#6366f1",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 10,
  },
  buttonText: { color: "white", fontSize: 18, fontWeight: "600" },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: 30 },
  footerText: { color: "#94a3b8", fontSize: 16 },
  linkText: { color: "#6366f1", fontSize: 16, fontWeight: "bold" },
});