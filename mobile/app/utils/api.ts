// utils/api.ts – CHẮN CHẮN CHẠY NGON
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Platform } from 'react-native';

const HOST = '26.94.144.5:5000';
const API_BASE = Platform.OS === 'web' ? 'https://vpanz-api.onrender.com' : `http://${HOST}`;

const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
});

api.interceptors.request.use(async (config) => {
  try {
    // THỬ TẤT CẢ CÁC KEY PHỔ BIẾN
    const keys = ['@user', '@auth_user', 'user', '@storage_user', 'vpan_user'];
    let token = null;

    for (const key of keys) {
      const data = await AsyncStorage.getItem(key);
      if (data) {
        const parsed = JSON.parse(data);
        if (parsed?.token) {
          token = parsed.token;
          console.log('Token found in key:', key);
          break;
        }
      }
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (e) {
    // ignore
  }
  return config;
});

export default api;
