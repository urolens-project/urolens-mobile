// polyfills.js — project root (same folder as package.json)
require('@abraham/reflection');

// Runtime patch for RN 0.83.6 + Hermes:
// The Event class constants (NONE, CAPTURING_PHASE, etc.) are sealed/frozen
// but the constructor tries to reassign them as instance properties.
const EVENT_PHASE_PROPS = ['NONE', 'CAPTURING_PHASE', 'AT_TARGET', 'BUBBLING_PHASE'];

if (typeof global.Event !== 'undefined') {
  EVENT_PHASE_PROPS.forEach((prop) => {
    const descriptor =
      Object.getOwnPropertyDescriptor(global.Event.prototype, prop) ||
      Object.getOwnPropertyDescriptor(global.Event, prop);
    if (descriptor && !descriptor.configurable) {
      Object.defineProperty(global.Event.prototype, prop, {
        configurable: true,
        writable: true,
        value: descriptor.value,
      });
    }
  });
}