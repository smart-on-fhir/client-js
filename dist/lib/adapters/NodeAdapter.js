"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
const smart_1 = require("../smart");
const Client_1 = require("../Client");
const ServerStorage_1 = require("../storage/ServerStorage");
const cjs_ponyfill_1 = require("abortcontroller-polyfill/dist/cjs-ponyfill");
const security = require("../security/server");
const jose_1 = require("jose");
/**
 * Node Adapter - works with native NodeJS and with Express
 */
class NodeAdapter {
  /**
   * @param options Environment-specific options
   */
  constructor(options) {
    /**
     * Holds the Storage instance associated with this instance
     */
    this._storage = null;
    this.security = security;
    this.options = Object.assign({}, options);
  }
  /**
   * Given a relative path, returns an absolute url using the instance base URL
   */
  relative(path) {
    return new URL(path, this.getUrl().href).href;
  }
  /**
   * Returns the protocol of the current request ("http" or "https")
   */
  getProtocol() {
    const req = this.options.request;
    const proto = req.socket.encrypted ? "https" : "http";
    return req.headers["x-forwarded-proto"] || proto;
  }
  /**
   * Given the current environment, this method must return the current url
   * as URL instance. In Node we might be behind a proxy!
   */
  getUrl() {
    const req = this.options.request;
    let host = req.headers.host;
    if (req.headers["x-forwarded-host"]) {
      host = req.headers["x-forwarded-host"];
      if (req.headers["x-forwarded-port"] && host.indexOf(":") === -1) {
        host += ":" + req.headers["x-forwarded-port"];
      }
    }
    const protocol = this.getProtocol();
    const orig = String(req.headers["x-original-uri"] || req.url);
    return new URL(orig, protocol + "://" + host);
  }
  /**
   * Given the current environment, this method must redirect to the given
   * path
   * @param location The path to redirect to
   */
  redirect(location) {
    this.options.response.writeHead(302, {
      location
    });
    this.options.response.end();
  }
  /**
   * Returns a ServerStorage instance
   */
  getStorage() {
    if (!this._storage) {
      if (this.options.storage) {
        if (typeof this.options.storage == "function") {
          this._storage = this.options.storage(this.options);
        } else {
          this._storage = this.options.storage;
        }
      } else {
        this._storage = new ServerStorage_1.default(this.options.request);
      }
    }
    return this._storage;
  }
  /**
   * Base64 to ASCII string
   */
  btoa(str) {
    // The "global." makes Webpack understand that it doesn't have to
    // include the Buffer code in the bundle
    return global.Buffer.from(str).toString("base64");
  }
  /**
   * ASCII string to Base64
   */
  atob(str) {
    // The "global." makes Webpack understand that it doesn't have to
    // include the Buffer code in the bundle
    return global.Buffer.from(str, "base64").toString("ascii");
  }
  base64urlencode(input) {
    return jose_1.base64url.encode(input);
  }
  base64urldecode(input) {
    return jose_1.base64url.decode(input).toString();
  }
  /**
   * Returns a reference to the AbortController constructor. In browsers,
   * AbortController will always be available as global (native or polyfilled)
   */
  getAbortController() {
    return cjs_ponyfill_1.AbortController;
  }
  /**
   * Creates and returns adapter-aware SMART api. Not that while the shape of
   * the returned object is well known, the arguments to this function are not.
   * Those who override this method are free to require any environment-specific
   * arguments. For example in node we will need a request, a response and
   * optionally a storage or storage factory function.
   */
  getSmartApi() {
    return {
      ready: (...args) => (0, smart_1.ready)(this, ...args),
      authorize: options => (0, smart_1.authorize)(this, options),
      init: options => (0, smart_1.init)(this, options),
      client: state => new Client_1.default(this, state),
      options: this.options
    };
  }
}
exports.default = NodeAdapter;