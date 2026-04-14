const path = require('path');

module.exports = {
  dependencies: {
    'react-native-thermal-printer-driver': {
      root: path.join(__dirname, '../expo-thermal-printer-driver'),
      platforms: {
        ios: {},
        android: {},
      },
    },
  },
};
