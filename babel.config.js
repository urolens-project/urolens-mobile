/**
 * The `removeEventPhaseFields` plugin fixes a crash on iOS 26 with RN 0.83.6:
 *
 * RN's Event.js declares `+NONE: 0`, `+CAPTURING_PHASE: 1`, etc. as both
 * static and INSTANCE class fields (Flow read-only type annotations).
 * Babel compiles the instance declarations (with loose:true, required by
 * WatermelonDB's legacy decorators) into `this.NONE = void 0` inside the
 * constructor. Later, Object.defineProperty sets Event.prototype.NONE as
 * non-writable (writable defaults to false). So every `new Event(...)` call
 * throws "Cannot assign to read-only property 'NONE'" in strict mode.
 *
 * Fix: strip those four instance field declarations from Event.js BEFORE
 * @babel/plugin-proposal-class-properties turns them into assignments.
 * The runtime values are set correctly by the Object.defineProperty calls
 * that already exist at the bottom of Event.js — no behaviour change.
 */
function removeEventPhaseFields() {
  return {
    visitor: {
      ClassProperty(path, state) {
        const file = state.filename || '';
        // Only target RN's DOM Event class
        if (!file.includes('dom/events/Event')) return;
        const key = path.node.key;
        const name = key && key.type === 'Identifier' ? key.name : null;
        const isPhaseConst = ['NONE', 'CAPTURING_PHASE', 'AT_TARGET', 'BUBBLING_PHASE'].includes(name);
        // Remove instance (non-static) declarations only; static ones are harmless
        if (isPhaseConst && !path.node.static) {
          path.remove();
        }
      },
    },
  };
}

module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Must run FIRST — strips the instance field declarations from Event.js
      // before class-properties converts them to `this.NONE = void 0`
      removeEventPhaseFields,
      // WatermelonDB decorator support — decorators must come before class-properties
      ['@babel/plugin-proposal-decorators', { legacy: true }],
      ['@babel/plugin-proposal-class-properties', { loose: true }],
      // Reanimated plugin MUST be last
      'react-native-reanimated/plugin',
    ],
  };
};
