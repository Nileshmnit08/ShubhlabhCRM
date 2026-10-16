/**
 * Cross-Browser Compatibility Polyfills
 * Guarantees that modern ECMAScript standard primitives are available
 * before any dependencies or application modules are parsed or evaluated.
 */

// 1. Promise.withResolvers (ECMAScript 2024 / required by PDF.js v4+ and modern async toolchains)
if (typeof Promise !== 'undefined' && typeof Promise.withResolvers === 'undefined') {
  Promise.withResolvers = function () {
    let resolve;
    let reject;
    const promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
}

// 2. Object.hasOwn (ECMAScript 2022)
if (typeof Object !== 'undefined' && typeof Object.hasOwn === 'undefined') {
  Object.hasOwn = function (object, property) {
    if (object == null) {
      throw new TypeError('Cannot convert undefined or null to object');
    }
    return Object.prototype.hasOwnProperty.call(Object(object), property);
  };
}

// 3. Array.prototype.at (ECMAScript 2022)
if (typeof Array !== 'undefined' && !Array.prototype.at) {
  Array.prototype.at = function (index) {
    const n = Math.trunc(index) || 0;
    const k = n >= 0 ? n : this.length + n;
    return k < 0 || k >= this.length ? undefined : this[k];
  };
}

// 4. String.prototype.at
if (typeof String !== 'undefined' && !String.prototype.at) {
  String.prototype.at = function (index) {
    const n = Math.trunc(index) || 0;
    const k = n >= 0 ? n : this.length + n;
    return k < 0 || k >= this.length ? undefined : this[k];
  };
}
