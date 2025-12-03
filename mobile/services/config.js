import { Platform } from 'react-native';

const getBaseUrl = () => {
  if (Platform.OS === 'android') {
    // Android emulator
    return 'http://10.0.2.2:5000';
  } else if (Platform.OS === 'ios') {
    // iOS simulator
    return 'http://26.94.144.5:5000';
  } else {
    // Web hoặc thiết bị thật - đổi IP này thành IP máy tính của bạn
    return 'http://localhost:5000';
  }
};

export const API_BASE_URL = getBaseUrl();