// app/auth.tsx – FIX HOÀN TOÀN
import { useAuth } from "@/context/AuthContext";
import { FontAwesome } from "@expo/vector-icons";
import { useGoogleLogin } from "@react-oauth/google";
import axios from "axios";
import * as Facebook from "expo-auth-session/providers/facebook";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import React from "react";
import {
    Alert,
    Dimensions,
    ImageBackground,
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
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import FacebookSDK from "../components/FacebookSDK";
WebBrowser.maybeCompleteAuthSession();

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CONTAINER_WIDTH = Math.min(758, SCREEN_WIDTH - 32);
const PANEL_WIDTH = CONTAINER_WIDTH / 2;
const PANEL_HEIGHT = 420;

const BG_IMAGE =
    "https://images.unsplash.com/photo-1639580926953-1bbfdbc61591?q=80&w=1205&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D";

const API_URL = Platform.select({
    web: "https://vpanz-api.onrender.com/api/auth",
    ios: "https://vpanz-api.onrender.com/api/auth",
    android: "https://vpanz-api.onrender.com/api/auth",
});

const FB_APP_ID = "1501472567745202";

export default function AuthScreen() {
    const router = useRouter();
    const { login } = useAuth();
    const [loginEmail, setLoginEmail] = React.useState("");
    const [loginPass, setLoginPass] = React.useState("");
    const [regName, setRegName] = React.useState("");
    const [regEmail, setRegEmail] = React.useState("");
    const [regPass, setRegPass] = React.useState("");
    const [loading, setLoading] = React.useState(false);

    const panelActive = useSharedValue(0);

    // GOOGLE LOGIN
    const googleLogin = useGoogleLogin({
        onSuccess: async (response) => {
            try {
                setLoading(true);
                // gửi access_token về backend
                const res = await axios.post(`${API_URL}/google-login`, {
                    token: response.access_token,
                });
                await login(res.data.token, res.data.user);
            } catch (err: any) {
                Alert.alert("Lỗi", err.response?.data?.message || "Đăng nhập thất bại");
            } finally {
                setLoading(false);
            }
        },
        onError: () => Alert.alert("Hủy", "Đăng nhập Google bị hủy"),
    });


    // FACEBOOK LOGIN
    const redirectUri = window.location.origin;
    const [request, fbResponse, fbPromptAsync] = Facebook.useAuthRequest({
        clientId: FB_APP_ID,
        responseType: "token",
        redirectUri,
    });

    const handleFacebookPress = async () => {
        if (Platform.OS === "web") {
            if (!window.FB) return alert("Facebook SDK chưa load xong, vui lòng thử lại");
            window.FB.login(
                (response: any) => {
                    if (response.authResponse) {
                        handleFacebookLogin(response.authResponse.accessToken, response.authResponse.userID);
                    } else {
                        alert("Đăng nhập Facebook bị hủy");
                    }
                },
                { scope: "email,public_profile" }
            );
        } else {
            const result = await fbPromptAsync();
            if (result.type === "success" && result.params.access_token) {
                handleFacebookLogin(result.params.access_token, result.params.user_id || "");
            }
        }
    };

    const handleFacebookLogin = async (accessToken: string, userID: string) => {
        try {
            setLoading(true);
            const res = await axios.post(`${API_URL}/facebook-login`, { accessToken, userID });
            if (res.data.token && res.data.user) {
                await login(res.data.token, res.data.user); // Chỉ login, không redirect
            }
        } catch (err: any) {
            Alert.alert("Lỗi", err.response?.data?.message || "Đăng nhập Facebook thất bại");
        } finally {
            setLoading(false);
        }
    };

    const handleGooglePress = () => googleLogin();

    // ANIMATION
    const toggleToSignUp = () => {
        panelActive.value = withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) });
    };
    const toggleToSignIn = () => {
        panelActive.value = withTiming(0, { duration: 600, easing: Easing.inOut(Easing.ease) });
    };
    const signInStyle = useAnimatedStyle(() => ({ transform: [{ translateX: panelActive.value * PANEL_WIDTH }], zIndex: panelActive.value < 0.5 ? 2 : 1 }));
    const signUpStyle = useAnimatedStyle(() => ({ transform: [{ translateX: panelActive.value * PANEL_WIDTH }], opacity: panelActive.value < 0.5 ? 0 : panelActive.value, zIndex: panelActive.value > 0.5 ? 5 : 1 }));
    const overlayStyle = useAnimatedStyle(() => ({ transform: [{ translateX: -panelActive.value * PANEL_WIDTH }] }));
    const overlayInnerStyle = useAnimatedStyle(() => ({ transform: [{ translateX: panelActive.value * PANEL_WIDTH }] }));
    const overlayLeftStyle = useAnimatedStyle(() => ({ transform: [{ translateX: -PANEL_WIDTH * 0.2 + panelActive.value * PANEL_WIDTH * 0.2 }] }));
    const overlayRightStyle = useAnimatedStyle(() => ({ transform: [{ translateX: panelActive.value * PANEL_WIDTH * 0.2 }] }));

    const handleLogin = async () => {
        if (!loginEmail || !loginPass) return Alert.alert("Lỗi", "Vui lòng nhập đầy đủ");
        setLoading(true);
        try {
            const res = await axios.post(`${API_URL}/login`, { email: loginEmail, password: loginPass });
            await login(res.data.token, res.data.user); // Chỉ login, AuthProvider handle redirect
        } catch (err: any) {
            Alert.alert("Lỗi", err.response?.data?.message || "Sai email hoặc mật khẩu");
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async () => {
        if (!regName || !regEmail || !regPass) return Alert.alert("Lỗi", "Vui lòng nhập đầy đủ");
        setLoading(true);
        try {
            await axios.post(`${API_URL}/register`, { name: regName, email: regEmail, password: regPass });
            Alert.alert("Thành công", "Đăng ký thành công! Vui lòng đăng nhập.", [{ text: "OK", onPress: toggleToSignIn }]);
        } catch (err: any) {
            Alert.alert("Lỗi", err.response?.data?.message || "Email đã tồn tại");
        } finally {
            setLoading(false);
        }
    };

    return (
        <ImageBackground source={{ uri: BG_IMAGE }} style={styles.background} resizeMode="cover">
            <FacebookSDK />
            <StatusBar barStyle="light-content" />
            <SafeAreaView style={styles.safeArea}>
                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.keyboardView}>
                    <View style={styles.centerContainer}>
                        <ImageBackground source={{ uri: BG_IMAGE }} style={[styles.container, { width: CONTAINER_WIDTH }]} imageStyle={{ borderRadius: 24 }}>
                            <View style={styles.glassOverlay} />

                            {/* Sign In Panel */}
                            <Animated.View style={[styles.formPanel, styles.signInPanel, signInStyle]}>
                                <View style={styles.form}>
                                    <Text style={styles.formTitle}>Sign In</Text>
                                    <TextInput style={styles.input} placeholder="Email" placeholderTextColor="#ccc" value={loginEmail} onChangeText={setLoginEmail} keyboardType="email-address" autoCapitalize="none" />
                                    <TextInput style={styles.input} placeholder="Password" placeholderTextColor="#ccc" value={loginPass} onChangeText={setLoginPass} secureTextEntry />
                                    <TouchableOpacity style={styles.btn} onPress={handleLogin} disabled={loading} activeOpacity={0.8}>
                                        <Text style={styles.btnText}>{loading ? "SIGNING IN..." : "SIGN IN"}</Text>
                                    </TouchableOpacity>

                                    <View style={{ alignItems: "center" }}>
                                        <Text style={{ color: "#666", fontSize: 12, marginBottom: 10 }}>or continue with</Text>
                                        <View style={{ flexDirection: "row", gap: 16 }}>
                                            <TouchableOpacity style={[styles.iconBtn, loading && { opacity: 0.6 }]} onPress={handleFacebookPress} disabled={loading}>
                                                <FontAwesome name="facebook-f" size={24} color="#1877F2" />
                                            </TouchableOpacity>
                                            <TouchableOpacity style={[styles.iconBtn, loading && { opacity: 0.6 }]} onPress={handleGooglePress} disabled={loading}>
                                                <FontAwesome name="google" size={24} color="#DB4437" />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                </View>
                            </Animated.View>

                            {/* Sign Up Panel */}
                            <Animated.View style={[styles.formPanel, styles.signUpPanel, signUpStyle]}>
                                <View style={styles.form}>
                                    <Text style={styles.formTitle}>Sign Up</Text>
                                    <TextInput style={styles.input} placeholder="User" placeholderTextColor="#ccc" value={regName} onChangeText={setRegName} />
                                    <TextInput style={styles.input} placeholder="Email" placeholderTextColor="#ccc" value={regEmail} onChangeText={setRegEmail} keyboardType="email-address" autoCapitalize="none" />
                                    <TextInput style={styles.input} placeholder="Password" placeholderTextColor="#ccc" value={regPass} onChangeText={setRegPass} secureTextEntry />
                                    <TouchableOpacity style={styles.btn} onPress={handleRegister} disabled={loading} activeOpacity={0.8}>
                                        <Text style={styles.btnText}>{loading ? "CREATING..." : "SIGN UP"}</Text>
                                    </TouchableOpacity>
                                </View>
                            </Animated.View>

                            <Animated.View style={[styles.overlayContainer, overlayStyle]}>
                                <Animated.View style={[styles.overlay, overlayInnerStyle]}>
                                    <Animated.View style={[styles.overlayPanel, styles.overlayLeft, overlayLeftStyle]}>
                                        <TouchableOpacity style={styles.btnGhost} onPress={toggleToSignIn} activeOpacity={0.8}>
                                            <Text style={styles.btnGhostText}>SIGN IN</Text>
                                        </TouchableOpacity>
                                    </Animated.View>
                                    <Animated.View style={[styles.overlayPanel, styles.overlayRight, overlayRightStyle]}>
                                        <TouchableOpacity style={styles.btnGhost} onPress={toggleToSignUp} activeOpacity={0.8}>
                                            <Text style={styles.btnGhostText}>SIGN UP</Text>
                                        </TouchableOpacity>
                                    </Animated.View>
                                </Animated.View>
                            </Animated.View>
                        </ImageBackground>
                    </View>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </ImageBackground>
    );
}

// STYLE GIỮ NGUYÊN 100%
const COLORS = {
    white: "#e9e9e9",
    gray: "#333",
    blue: "#0367a6",
    lightblue: "#008997",
    red: " #ff4b2b",
    lightred: "#ff416c",
};

const styles = StyleSheet.create({
    background: { flex: 1 },
    safeArea: { flex: 1 },
    keyboardView: { flex: 1 },
    centerContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 16 },
    container: {
        height: PANEL_HEIGHT,
        borderRadius: 24,
        overflow: "hidden",
        position: "relative",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.35,
        shadowRadius: 30,
        elevation: 20,
    },
    glassOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(255, 255, 255, 0.12)",
        borderRadius: 24,
    },
    formPanel: { position: "absolute", top: 0, left: 0, width: PANEL_WIDTH, height: "100%", zIndex: 2 },
    signInPanel: { zIndex: 2 },
    signUpPanel: { zIndex: 1 },
    form: { flex: 1, backgroundColor: COLORS.white, justifyContent: "center", alignItems: "center", paddingHorizontal: 48, borderRadius: 20, margin: 20 },
    formTitle: { fontSize: 32, fontWeight: "300", color: COLORS.gray, marginBottom: 20 },
    input: { width: "100%", backgroundColor: "rgba(255, 255, 255, 0.7)", paddingVertical: 14, paddingHorizontal: 14, marginVertical: 8, borderRadius: 8, fontSize: 14, color: COLORS.gray },
    btn: { backgroundColor: COLORS.blue, paddingVertical: 14, paddingHorizontal: 64, borderRadius: 30, marginTop: 20 },
    btnText: { color: "#fff", fontSize: 13, fontWeight: "700", letterSpacing: 1.6 },
    overlayContainer: { position: "absolute", top: 0, left: PANEL_WIDTH, width: PANEL_WIDTH, height: "100%", overflow: "hidden", zIndex: 100 },
    overlay: { position: "absolute", left: -PANEL_WIDTH, width: PANEL_WIDTH * 2, height: "100%", flexDirection: "row" },
    overlayPanel: { width: PANEL_WIDTH, height: "100%", justifyContent: "center", alignItems: "center", paddingHorizontal: 40 },
    overlayLeft: { position: "absolute", left: 0 },
    overlayRight: { position: "absolute", right: 0 },
    btnGhost: { borderWidth: 2, borderColor: "#fff", paddingVertical: 14, paddingHorizontal: 64, borderRadius: 30, backgroundColor: COLORS.lightblue + "88" },
    btnGhostText: { color: COLORS.white, fontSize: 13, fontWeight: "700", letterSpacing: 1.6 },
    iconBtn: { width: 35, height: 35, borderRadius: 25, backgroundColor: "rgba(255,255,255,0.85)", justifyContent: "center", alignItems: "center", shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 5 },
});
