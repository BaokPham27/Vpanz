// mobile/app/(auth)/(tabs)/profile/edit.tsx
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { Edit2, Eye, EyeOff, Lock, Shield, User, X } from 'lucide-react-native';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useAuth } from '../../../../context/AuthContext';
import api from '../../../utils/api';

const IMGBB_API_KEY =
  process.env.EXPO_PUBLIC_IMGBB_API_KEY ||
  'c2a81e7e8b9f82bcca3e0daaf7762721';

export default function EditProfile() {
  const { user, updateUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [avatar, setAvatar] = useState<string | null>(user?.avatarURL || null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'user' | 'teacher'>((user?.role as any) || 'user');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // === GIỮ NGUYÊN HOÀN TOÀN CODE CỦA BẠN ===
  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Quyền truy cập', 'Cần cấp quyền để chọn ảnh!');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        setLoading(true);
        await uploadToImgBB(result.assets[0].uri);
      }
    } catch (err: any) {
      console.error('pickImage error:', err);
      Alert.alert('Lỗi', 'Không thể chọn ảnh');
      setLoading(false);
    }
  };

  const uriToBase64Web = async (uri: string): Promise<string> => {
    if (uri.startsWith('data:')) {
      const parts = uri.split(',');
      return parts[1] ?? '';
    }

    const resp = await fetch(uri);
    const blob = await resp.blob();

    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => {
        reader.abort();
        reject(new Error('Failed to convert blob to base64'));
      };
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const base64 = dataUrl.split(',')[1];
        resolve(base64);
      };
      reader.readAsDataURL(blob);
    });
  };

  const uploadToImgBB = async (uri: string) => {
    try {
      let base64 = '';

      if (Platform.OS === 'web') {
        base64 = await uriToBase64Web(uri);
      } else {
        const nativeUri = uri.startsWith('file://') ? uri.replace('file://', '') : uri;
        base64 = await FileSystem.readAsStringAsync(nativeUri, {
          encoding: (FileSystem as any).Encoding?.Base64 ?? 'base64',
        });
      }

      if (!base64) throw new Error('Không chuyển được ảnh sang base64');

      const res = await fetch(
        `https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ image: base64 }).toString(),
        }
      );

      const json = await res.json();

      if (json.success) {
        setAvatar(json.data.url);
        Alert.alert('Thành công', 'Ảnh đại diện đã được tải lên!');
      } else {
        console.error('imgbb error response:', json);
        Alert.alert('Lỗi', json.error?.message || 'Upload thất bại');
      }
    } catch (err: any) {
      console.error('Upload error:', err);
      if (Platform.OS === 'web' && err?.message?.includes('Failed to fetch')) {
        Alert.alert(
          'Lỗi',
          'Không thể truy xuất ảnh trên web (có thể do CORS). Thử upload bằng cách chọn file cục bộ hoặc chuyển sang môi trường native.'
        );
      } else {
        Alert.alert('Lỗi', err.message || 'Không thể tải ảnh lên');
      }
    } finally {
      setLoading(false);
    }
  };
  // === KẾT THÚC GIỮ NGUYÊN CODE CỦA BẠN ===

  const handleSave = async () => {
    if (!name.trim()) return Alert.alert('Lỗi', 'Tên không được để trống');
    if (newPassword && newPassword.length < 6) return Alert.alert('Lỗi', 'Mật khẩu mới phải từ 6 ký tự');
    if (newPassword !== confirmPassword) return Alert.alert('Lỗi', 'Mật khẩu xác nhận không khớp');

    setLoading(true);
    try {
      const payload: any = {
        name: name.trim(),
        avatarURL: avatar || null,
        role,
      };
      if (newPassword) payload.password = newPassword;

      const res = await api.patch(
        '/api/users/me',
        payload,
        {
          headers: { Authorization: `Bearer ${(user as any)?.token}` },
        }
      );

      updateUser(res.data.user);
      Alert.alert('Thành công', 'Cập nhật hồ sơ thành công!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      console.error('save error:', err);
      Alert.alert('Lỗi', err.response?.data?.message || 'Cập nhật thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0b1220' }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              padding: 16,
              borderBottomWidth: 1,
              borderColor: '#334155',
            }}
          >
            <TouchableOpacity onPress={() => router.back()}>
              <X color="#fff" size={28} />
            </TouchableOpacity>
            <Text style={{ color: '#fff', fontSize: 20, fontWeight: '700', marginLeft: 16 }}>
              Chỉnh sửa hồ sơ
            </Text>
          </View>

          <View style={{ padding: 20, alignItems: 'center' }}>
            {/* Avatar - GIỮ NGUYÊN CỦA BẠN */}
            <TouchableOpacity onPress={pickImage} disabled={loading}>
              {loading ? (
                <View
                  style={{
                    width: 120,
                    height: 120,
                    borderRadius: 60,
                    backgroundColor: '#1e293b',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <ActivityIndicator size="large" color="#3b82f6" />
                </View>
              ) : (
                <Image
                  source={{ uri: avatar || `https://i.pravatar.cc/300?u=${user?.email}` }}
                  style={{
                    width: 120,
                    height: 120,
                    borderRadius: 60,
                    borderWidth: 4,
                    borderColor: '#3b82f6',
                  }}
                />
              )}
              <View
                style={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  backgroundColor: '#3b82f6',
                  borderRadius: 20,
                  padding: 8,
                }}
              >
                <Edit2 color="#fff" size={20} />
              </View>
            </TouchableOpacity>

            <Text style={{ color: '#94a3b8', marginTop: 12 }}>Nhấn để đổi ảnh đại diện</Text>

            {/* Form - ĐÃ LÀM ĐẸP HƠN RẤT NHIỀU */}
            <View style={{ width: '100%', marginTop: 32, gap: 24 }}>

              {/* Tên hiển thị */}
              <View>
                <Text style={{ color: '#e2e8f0', marginBottom: 8, fontSize: 16, fontWeight: '600' }}>
                  Tên hiển thị
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e293b', borderRadius: 12, borderWidth: 1, borderColor: '#334155', paddingHorizontal: 14 }}>
                  <User color="#64748b" size={20} />
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    placeholder="Nhập tên của bạn"
                    placeholderTextColor="#64748b"
                    style={{ flex: 1, color: '#fff', paddingVertical: 14, marginLeft: 10, fontSize: 16 }}
                  />
                </View>
              </View>

              {/* Vai trò */}
              <View>
                <Text style={{ color: '#e2e8f0', marginBottom: 8, fontSize: 16, fontWeight: '600' }}>
                  Vai trò của bạn
                </Text>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  {(['user', 'teacher'] as const).map((r) => (
                    <TouchableOpacity
                      key={r}
                      onPress={() => setRole(r)}
                      style={{
                        flex: 1,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        paddingVertical: 14,
                        borderRadius: 12,
                        backgroundColor: role === r ? '#3b82f6' : '#1e293b',
                        borderWidth: 1,
                        borderColor: role === r ? '#3b82f6' : '#334155',
                      }}
                    >
                      <Shield color={role === r ? '#fff' : '#64748b'} size={18} style={{ marginRight: 8 }} />
                      <Text style={{ color: role === r ? '#fff' : '#94a3b8', fontWeight: '600' }}>
                        {r === 'teacher' ? 'Giáo viên' : 'Học sinh'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Đổi mật khẩu */}
              <View>
                <Text style={{ color: '#e2e8f0', marginBottom: 8, fontSize: 16, fontWeight: '600' }}>
                  Đổi mật khẩu (để trống nếu không đổi)
                </Text>
                <View style={{ gap: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e293b', borderRadius: 12, borderWidth: 1, borderColor: '#334155', paddingHorizontal: 14 }}>
                    <Lock color="#64748b" size={20} />
                    <TextInput
                      value={newPassword}
                      onChangeText={setNewPassword}
                      placeholder="Mật khẩu mới"
                      placeholderTextColor="#64748b"
                      secureTextEntry={!showPassword}
                      style={{ flex: 1, color: '#fff', paddingVertical: 14, marginLeft: 10, fontSize: 16 }}
                    />
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff color="#64748b" size={20} /> : <Eye color="#64748b" size={20} />}
                    </TouchableOpacity>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e293b', borderRadius: 12, borderWidth: 1, borderColor: '#334155', paddingHorizontal: 14 }}>
                    <Lock color="#64748b" size={20} />
                    <TextInput
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      placeholder="Xác nhận mật khẩu"
                      placeholderTextColor="#64748b"
                      secureTextEntry={!showPassword}
                      style={{ flex: 1, color: '#fff', paddingVertical: 14, marginLeft: 10, fontSize: 16 }}
                    />
                  </View>
                </View>
              </View>

              {/* Nút lưu - ĐẸP HƠN */}
              <TouchableOpacity
                onPress={handleSave}
                disabled={loading}
                style={{
                  marginTop: 20,
                  backgroundColor: '#3b82f6',
                  paddingVertical: 18,
                  borderRadius: 16,
                  alignItems: 'center',
                  shadowColor: '#3b82f6',
                  shadowOpacity: 0.4,
                  shadowRadius: 10,
                  elevation: 8,
                }}
              >
                <Text style={{ color: '#fff', fontSize: 18, fontWeight: '800' }}>
                  {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}