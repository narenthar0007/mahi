const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Block only project-root folders (not node_modules/.../dist, etc.). */
function blockProjectDir(name) {
  const abs = escapeRegExp(path.resolve(__dirname, name));
  return new RegExp(`${abs}(?:[\\\\/].*)?$`);
}

// Keep Metro from crawling native builds, export artifacts, and non-app folders.
// On OneDrive + large android/release trees this otherwise makes cold starts very slow.
const extraBlockList = [
  blockProjectDir('android'),
  blockProjectDir('ios'),
  blockProjectDir('release'),
  blockProjectDir('dist'),
  blockProjectDir('website'),
  blockProjectDir('electron'),
  blockProjectDir('docs'),
  blockProjectDir('table booker'),
  blockProjectDir('.cursor'),
  blockProjectDir('.claude'),
  blockProjectDir('.expo-bundle-test'),
  blockProjectDir('.expo-export-check'),
  blockProjectDir('.expo-export-test'),
  blockProjectDir('.expo-tmp-export'),
  new RegExp(`${escapeRegExp(path.resolve(__dirname))}[\\\\/].*\\.apk$`),
  new RegExp(`${escapeRegExp(path.resolve(__dirname))}[\\\\/].*\\.pptx$`),
];

const existingBlockList = config.resolver.blockList;
config.resolver.blockList = [
  ...(Array.isArray(existingBlockList)
    ? existingBlockList
    : existingBlockList
      ? [existingBlockList]
      : []),
  ...extraBlockList,
];

config.transformer.getTransformOptions = async () => ({
  transform: {
    experimentalImportSupport: false,
    inlineRequires: true,
  },
});

// Always chain through Expo's resolver — replacing it entirely breaks SDK 54
// internals (e.g. expo/src/async-require/*.ts).
const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'zustand' || moduleName.startsWith('zustand/')) {
    return {
      type: 'sourceFile',
      filePath: require.resolve(moduleName),
    };
  }

  // Native-only TCP server must not load on web.
  if (platform === 'web' && moduleName === 'react-native-tcp-socket') {
    return {
      type: 'sourceFile',
      filePath: path.resolve(__dirname, 'utils/deviceSync/emptyNativeModule.js'),
    };
  }

  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
