const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const localThermalPrinterPackage = path.resolve(projectRoot, '../expo-thermal-printer-driver');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [...(config.watchFolders ?? []), localThermalPrinterPackage];
config.resolver = {
  ...(config.resolver ?? {}),
  extraNodeModules: {
    ...((config.resolver && config.resolver.extraNodeModules) || {}),
    'react-native-thermal-printer-driver': localThermalPrinterPackage,
  },
};

module.exports = config;
