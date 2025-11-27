// metro.config.js – Đặt ở gốc project mobile
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// BẬT CÁC TÍNH NĂNG CẦN THIẾT
config.resolver.unstable_enablePackageExports = true;
config.resolver.unstable_conditionNames = ['require', 'react-native', 'development'];

// FIX CHẾT NGƯỜI CHO autolinker + tslib (100% hiệu quả)
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Nếu module yêu cầu là "tslib", ép nó load đúng file
  if (moduleName === 'tslib') {
    return {
      filePath: require.resolve('tslib/tslib.es6.js'),
      type: 'sourceFile',
    };
  }

  // Các alias khác nếu cần (ví dụ autolinker nếu bạn vẫn dùng)
  // if (moduleName.startsWith('autolinker')) {
  //   return { filePath: require.resolve('autolinker'), type: 'sourceFile' };
  // }

  // Mặc định thì để Metro xử lý bình thường
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;