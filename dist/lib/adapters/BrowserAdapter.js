"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const smart_1 = require("../smart");
const Client_1 = __importDefault(require("../Client"));
const BrowserStorage_1 = __importDefault(require("../storage/BrowserStorage"));
const security = __importStar(require("../security/browser"));
const browser_1 = require("../base64/browser");
/**
 * Browser Adapter
 */
class BrowserAdapter {
    /**
     * @param options Environment-specific options
     */
    constructor(options = {}) {
        /**
         * Stores the URL instance associated with this adapter
         */
        this._url = null;
        /**
         * Holds the Storage instance associated with this instance
         */
        this._storage = null;
        this.security = security;
        this.options = { ...options };
    }
    /**
     * Given a relative path, returns an absolute url using the instance base URL
     */
    relative(path) {
        return new URL(path, this.getUrl().href).href;
    }
    /**
     * Given the current environment, this method must return the current url
     * as URL instance
     */
    getUrl() {
        if (!this._url) {
            this._url = new URL(location + "");
        }
        return this._url;
    }
    /**
     * Given the current environment, this method must redirect to the given
     * path
     */
    redirect(to) {
        location.href = to;
    }
    /**
     * Returns a BrowserStorage object which is just a wrapper around
     * sessionStorage
     */
    getStorage() {
        if (!this._storage) {
            this._storage = new BrowserStorage_1.default();
        }
        return this._storage;
    }
    /**
     * ASCII string to Base64
     */
    base64encode(str) {
        return window.btoa(str);
    }
    /**
     * Base64 to ASCII string
     */
    base64decode(str) {
        return window.atob(str);
    }
    base64urlencode(input) {
        return (0, browser_1.base64urlencode)(input);
    }
    base64urldecode(input) {
        return (0, browser_1.base64urldecode)(input);
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
            client: (state) => new Client_1.default(this, state),
            options: this.options,
            utils: {
                security,
                base64urldecode: browser_1.base64urldecode,
                base64urlencode: browser_1.base64urlencode,
                base64decode: window.atob.bind(window),
                base64encode: window.btoa.bind(window)
            }
        };
    }
}
exports.default = BrowserAdapter;
