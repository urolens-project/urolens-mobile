function removeEventPhaseFields() {
  return {
    visitor: {
      // Remove the instance assignments inside the constructor
      AssignmentExpression(path, state) {
        const file = state.filename || '';
        if (!file.includes('Event.js') && !file.includes('EventTarget')) return;

        const { left } = path.node;
        // Match: this.NONE = ..., this.CAPTURING_PHASE = ..., etc.
        if (
          left.type === 'MemberExpression' &&
          left.object.type === 'ThisExpression' &&
          ['NONE', 'CAPTURING_PHASE', 'AT_TARGET', 'BUBBLING_PHASE'].includes(
            left.property.name
          )
        ) {
          path.remove();
        }
      },
      // Also remove class-level field declarations
      ClassProperty(path, state) {
        const file = state.filename || '';
        if (!file.includes('Event.js') && !file.includes('EventTarget')) return;
        const key = path.node.key;
        const name = key?.type === 'Identifier' ? key.name : null;
        if (['NONE', 'CAPTURING_PHASE', 'AT_TARGET', 'BUBBLING_PHASE'].includes(name)) {
          path.remove();
        }
      },
    },
  };
}

module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      [
        'babel-preset-expo',
        {
          jsxRuntime: 'automatic',
          onlyRemoveTypeImports: false,
          unstable_transformProfile: 'hermes-stable',
        },
      ],
    ],
    plugins: [
      removeEventPhaseFields,
      'react-native-reanimated/plugin',
    ],
    overrides: [
      {
        test: /[\\/]node_modules[\\/].*expo-file-system[\\/]/,
        plugins: [
          ['@babel/plugin-transform-typescript', { allowDeclareFields: true }],
        ],
      },
      {
        test: /\.(js|ts|tsx)$/,
        include: [
          /[\\/]src[\\/]/,
          /[\\/]app[\\/]/,
          /[\\/]@nozbe[\\/]/,           // ✅ regular node_modules path
          /[\\/]@nozbe\+watermelondb/,  // ✅ pnpm virtual store path
        ],
        plugins: [
          'babel-plugin-transform-typescript-metadata',
          ['@babel/plugin-proposal-decorators', { legacy: true }],
          ['@babel/plugin-transform-class-properties', { loose: true }],
          ['@babel/plugin-transform-private-methods', { loose: true }], // ✅ must match loose
        ],
      },
    ],
  };
};