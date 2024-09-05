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
const jose_1 = require("jose");
const smart_1 = require("../smart");
const Client_1 = __importDefault(require("../Client"));
const ServerStorage_1 = __importDefault(require("../storage/ServerStorage"));
const security = __importStar(require("../security/server"));
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
        this.options = { ...options };
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
        this.options.response.writeHead(302, { location });
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
                }
                else {
                    this._storage = this.options.storage;
                }
            }
            else {
                this._storage = new ServerStorage_1.default(this.options.request);
            }
        }
        return this._storage;
    }
    /**
     * Base64 to ASCII string
     */
    base64encode(str) {
        return Buffer.from(str).toString("base64");
    }
    /**
     * ASCII string to Base64
     */
    base64decode(str) {
        return Buffer.from(str, "base64").toString("ascii");
    }
    base64urlencode(input) {
        return jose_1.base64url.encode(input);
    }
    base64urldecode(input) {
        return jose_1.base64url.decode(input).toString();
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
            options: this.options
        };
    }
}
exports.default = NodeAdapter;
