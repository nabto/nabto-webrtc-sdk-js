// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require("expo/metro-config");
const { wrapWithReanimatedMetroConfig } = require("react-native-reanimated/metro-config");
const path = require("path");


const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");
const packageRoot = path.resolve(monorepoRoot, "packages");
const examplesRoot = path.resolve(monorepoRoot, "examples");

const packages = {
    "@nabto/webrtc-signaling-common": path.resolve(packageRoot, "nabto/webrtc-signaling-common"),
    "@nabto/webrtc-signaling-client": path.resolve(packageRoot, "nabto/webrtc-signaling-client"),
    "@nabto/webrtc-signaling-device": path.resolve(packageRoot, "nabto/webrtc-signaling-device"),
    "@nabto/webrtc-signaling-util": path.resolve(packageRoot, "nabto/webrtc-signaling-util"),
    "@nabto/react-demo-common": path.resolve(examplesRoot, "react-demo-common")
};

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);
config.watchFolders = [projectRoot, ...Object.values(packages)];
config.resolver.extraNodeModules = packages;
config.resolver.nodeModulesPaths = [
    path.resolve(projectRoot, "node_modules")
];

module.exports = wrapWithReanimatedMetroConfig(config);
