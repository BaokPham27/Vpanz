// metro.config.js – FIX HOÀN TOÀN LỖI window.closed (Expo Web 2025)
const { getDefaultConfig } = require('expo/metro-config');

const defaultConfig = getDefaultConfig(__dirname);

// Cấu hình cũ của bạn (giữ nguyên)
defaultConfig.resolver.unstable_enablePackageExports = true;
defaultConfig.resolver.unstable_conditionNames = ['require', 'react-native', 'development'];

defaultConfig.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'tslib') {
    return { filePath: require.resolve('tslib/tslib.es6.js'), type: 'sourceFile' };
  }
  return context.resolveRequest(context, moduleName, platform);
};

// FIX COOP TRIỆT ĐỂ – CÁCH DUY NHẤT HOẠT ĐỘNG TRÊN EXPO WEB
defaultConfig.server ??= {};
defaultConfig.server.enhanceMiddleware = (middleware) => {
  return (req, res, next) => {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
    res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');
    middleware(req, res, next);
  };
};

module.exports = defaultConfig;