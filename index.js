// index.js — project root
require('@abraham/reflection');

// We can't patch Event before it's defined, so we intercept it
// by overriding Object.defineProperty to catch when Event gets sealed,
// then immediately make the phase constants writable.
const originalDefineProperty = Object.defineProperty;
Object.defineProperty = function(obj, prop, descriptor) {
  // Intercept when RN tries to seal Event phase constants as non-writable
  if (
    typeof obj === 'function' &&
    obj.name === 'Event' &&
    ['NONE', 'CAPTURING_PHASE', 'AT_TARGET', 'BUBBLING_PHASE'].includes(prop) &&
    descriptor.writable === false
  ) {
    // Allow it to be defined but keep it writable
    return originalDefineProperty.call(this, obj, prop, {
      ...descriptor,
      writable: true,
      configurable: true,
    });
  }
  return originalDefineProperty.call(this, obj, prop, descriptor);
};

require('expo-router/entry');