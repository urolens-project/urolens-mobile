const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

config.resolver.alias = {
  '@': path.resolve(__dirname, 'src'),
  '@db': path.resolve(__dirname, 'src/db'),
  '@features': path.resolve(__dirname, 'src/features'),
  '@lib': path.resolve(__dirname, 'src/lib'),
  '@components': path.resolve(__dirname, 'src/components'),
  '@hooks': path.resolve(__dirname, 'src/hooks'),
  '@types': path.resolve(__dirname, 'src/types'),
  '@mocks': path.resolve(__dirname, 'src/mocks'),
};

module.exports = config;
