const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// pnpm stores packages in a virtual store; Metro must watch the real paths
config.watchFolders = [
  path.resolve(__dirname, 'node_modules/.pnpm'),
  path.resolve(__dirname, 'node_modules'),
];

// Follow pnpm symlinks so Metro can resolve packages through the virtual store
//config.resolver.unstable_enableSymlinks = true;

config.resolver.alias = {
  '@': path.resolve(__dirname, 'src'),
  '@db': path.resolve(__dirname, 'src/db'),
  '@features': path.resolve(__dirname, 'src/features'),
  '@lib': path.resolve(__dirname, 'src/lib'),
  '@components': path.resolve(__dirname, 'src/components'),
  '@hooks': path.resolve(__dirname, 'src/hooks'),
  '@app-types': path.resolve(__dirname, 'src/types'),
  '@mocks': path.resolve(__dirname, 'src/mocks'),
};

module.exports = config;
