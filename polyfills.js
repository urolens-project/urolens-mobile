// polyfills.js — project root (same folder as package.json)
require('@abraham/reflection');

// Runtime patch for RN 0.83.6 + Hermes: the Event class constants (NONE,
// CAPTURING_PHASE, etc.) get sealed as non-writable, but the constructor
// tries to reassign them as instance properties. We can't patch Event
// before it's defined, so we intercept Object.defineProperty to catch the
// moment RN seals the phase constants and keep them writable.
const EVENT_PHASE_PROPS = ['NONE', 'CAPTURING_PHASE', 'AT_TARGET', 'BUBBLING_PHASE'];

const originalDefineProperty = Object.defineProperty;
Object.defineProperty = function (obj, prop, descriptor) {
  if (
    typeof obj === 'function' &&
    obj.name === 'Event' &&
    EVENT_PHASE_PROPS.includes(prop) &&
    descriptor.writable === false
  ) {
    return originalDefineProperty.call(this, obj, prop, {
      ...descriptor,
      writable: true,
      configurable: true,
    });
  }
  return originalDefineProperty.call(this, obj, prop, descriptor);
};
