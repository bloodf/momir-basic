const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");
const { withRorkMetro } = require("@rork-ai/toolkit-sdk/metro");

const config = getDefaultConfig(__dirname);

// Follow symlinks for locally-linked packages (react-native-thermal-printer-driver)
const thermalPrinterPath = path.resolve(__dirname, "../../expo-thermal-printer-driver");
config.watchFolders = [thermalPrinterPath];
config.resolver.unstable_enableSymlinks = true;

module.exports = withRorkMetro(config);
