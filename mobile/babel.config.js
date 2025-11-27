// babel.config.js
module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Đảm bảo không có plugin nào liên quan đến routing hay animation ở đây
      // ... các plugin khác (Ví dụ: tailwind-rn, module-resolver)
      
      // DÒNG NÀY PHẢI LUÔN LÀ CUỐI CÙNG trong mảng plugins
      'react-native-reanimated/plugin',
    ],
  };
};