// Expo's default Metro set-up, plus one web-only swap: react-native-web's
// RefreshControl renders nothing (pull-to-refresh did nothing in the web
// app), so on web it's replaced by src/platform/RefreshControl.web.tsx.
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
const WEB_REFRESH = path.join(__dirname, 'src/platform/RefreshControl.web.tsx');
const RNW_REFRESH = `${path.sep}react-native-web${path.sep}dist${path.sep}exports${path.sep}RefreshControl${path.sep}index.js`;

const upstream = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const resolved = upstream ? upstream(context, moduleName, platform) : context.resolveRequest(context, moduleName, platform);
  if (platform === 'web' && resolved && resolved.type === 'sourceFile' && resolved.filePath.endsWith(RNW_REFRESH)) {
    return { type: 'sourceFile', filePath: WEB_REFRESH };
  }
  return resolved;
};

module.exports = config;
