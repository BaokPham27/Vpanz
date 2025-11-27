import axios from "axios";
import { Link, router } from "expo-router";
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

const API_URL = 
  Platform.OS === "web" 
    ? "http://localhost:5000/api/auth"
    : "http://26.94.144.5:5000/api/auth";

export default function RegisterScreen() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name || !email || !password) {
      console.log("Validation failed: thiếu field");
      return Alert.alert("Lỗi", "Vui lòng nhập đầy đủ");
    }

    console.log("Bắt đầu đăng ký:", { name, email });
    setLoading(true);

    try {
      console.log("Gửi request đến:", `${API_URL}/register`);
      const res = await axios.post(`${API_URL}/register`, {
        name,
        email,
        password,
      });

      console.log("ĐĂNG KÝ THÀNH CÔNG:", res.data);
      Alert.alert("Thành công!", "Đăng ký thành công! Giờ bạn có thể đăng nhập", [
        { text: "OK", onPress: () => {
          console.log("Chuyển về trang login");
          router.replace("/login");
        }},
      ]);
    } catch (err: any) {
      console.error("ĐĂNG KÝ THẤT BẠI:");
      if (err.response) {
        console.error("Status:", err.response.status);
        console.error("Server message:", err.response.data);
        Alert.alert("Lỗi", err.response.data?.message || "Email đã tồn tại");
      } else if (err.request) {
        console.error("Không kết nối được server:", err.request);
        Alert.alert("Lỗi mạng", "Không kết nối được server");
      } else {
        console.error("Lỗi khác:", err.message);
      }
    } finally {
      setLoading(false);
      console.log("Kết thúc đăng ký");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <View style={styles.inner}>
          <View style={styles.logoContainer}>
            <View style={styles.logo}>
              <Text style={styles.logoText}>V</Text>
            </View>
            <Text style={styles.title}>Tạo tài khoản</Text>
            <Text style={styles.subtitle}>Tham gia Vpan ngay hôm nay</Text>
          </View>

          <View style={styles.form}>
            <TextInput style={styles.input} placeholder="Họ tên" placeholderTextColor="#94a3b8" value={name} onChangeText={setName} />
            <TextInput style={styles.input} placeholder="Email" placeholderTextColor="#94a3b8" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
            <TextInput style={styles.input} placeholder="Mật khẩu" placeholderTextColor="#94a3b8" value={password} onChangeText={setPassword} secureTextEntry />

            <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
              <Text style={styles.buttonText}>
                {loading ? "Đang tạo..." : "Đăng ký"}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Đã có tài khoản? </Text>
            <Link href="/login" style={styles.linkText}>
              Đăng nhập
            </Link>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// Dùng chung styles với Login (copy nguyên)
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