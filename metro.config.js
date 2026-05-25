const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// pnpm stores packages in a virtual store; Metro must watch the real paths
config.watchFolders = [
  path.resolve(__dirname, 'node_modules/.pnpm'),
  path.resolve(__dirname, 'node_modules'),
];

// Define your path mappings safely
const aliasMap = {
  '@': path.resolve(__dirname, 'src'),
  '@db': path.resolve(__dirname, 'src/db'),
  '@features': path.resolve(__dirname, 'src/features'),
  '@lib': path.resolve(__dirname, 'src/lib'),
  '@components': path.resolve(__dirname, 'src/components'),
  '@hooks': path.resolve(__dirname, 'src/hooks'),
  '@app-types': path.resolve(__dirname, 'src/types'),
  '@mocks': path.resolve(__dirname, 'src/mocks'),
};

// 2. 💡 Route aliases through Metro's functional resolveRequest pipeline
const defaultResolver = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Check if the current module import matches any of our alias keys
  for (const [alias, aliasPath] of Object.entries(aliasMap)) {
    if (moduleName === alias || moduleName.startsWith(`${alias}/`)) {
      const relativePath = moduleName.slice(alias.length);
      const targetPath = path.join(aliasPath, relativePath);
      
      // Redirect Metro to the true mapped file path directory
      return context.resolveRequest(context, targetPath, platform);
    }
  }
  
  // Fallback to traditional resolution for standard npm packages
  if (defaultResolver) {
    return defaultResolver(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

// FORCE METRO TO STUB DESKTOP/NODE DRIVERS DURING SSR/WEB BUNDLE REVIEWS
config.resolver.emptyModulesByHeaderName = {
  ...config.resolver.emptyModulesByHeaderName,
  '@nozbe/watermelondb/adapters/sqlite/sqlite-node/Database': true,
  'better-sqlite3': true,
};

module.exports = config;