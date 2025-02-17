"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
class Storage {
  /**
   * Gets the value at `key`. Returns a promise that will be resolved
   * with that value (or undefined for missing keys).
   */
  async get(key) {
    const value = sessionStorage[key];
    if (value) {
      return JSON.parse(value);
    }
    return null;
  }
  /**
   * Sets the `value` on `key` and returns a promise that will be resolved
   * with the value that was set.
   */
  async set(key, value) {
    sessionStorage[key] = JSON.stringify(value);
    return value;
  }
  /**
   * Deletes the value at `key`. Returns a promise that will be resolved
   * with true if the key was deleted or with false if it was not (eg. if
   * did not exist).
   */
  async unset(key) {
    if (key in sessionStorage) {
      delete sessionStorage[key];
      return true;
    }
    return false;
  }
}
exports.default = Storage;