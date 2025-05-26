// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require("expo/metro-config");
const { wrapWithReanimatedMetroConfig } = require("react-native-reanimated/metro-config");
const path = require("path");


const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");
const monorepoPackages = {
    "@nabto/signaling": path.resolve(monorepoRoot, "sdk/js"),
    "@nabto/signaling-util": path.resolve(monorepoRoot, "sdk/js-util"),
    "@nabto/react-demo-common": path.resolve(monorepoRoot, "examples/common")
};

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);
config.watchFolders = [projectRoot, ...Object.values(monorepoPackages)];
config.resolver.extraNodeModules = monorepoPackages;
config.resolver.nodeModulesPaths = [
    path.resolve(projectRoot, "node_modules")
];

module.exports = wrapWithReanimatedMetroConfig(config);
