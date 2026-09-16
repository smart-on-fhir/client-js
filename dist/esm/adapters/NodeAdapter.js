import { ready, authorize, init } from "../smart";
import Client from "../Client";
import ServerStorage from "../storage/ServerStorage";
import * as security from "../security/server";
import { base64url } from "jose";
/**
 * Node Adapter - works with native NodeJS and with Express
 */
export default class NodeAdapter {
    /**
     * Holds the Storage instance associated with this instance
     * @type {ServerStorage | null}
     */
    _storage = null;
    /**
     * Environment-specific options
     */
    options;
    /**
     * Security-related methods
     */
    security = security;
    /**
     * @param {any} options Environment-specific options
     */
    constructor(options) {
        this.options = { ...options };
    }
    /**
     * Given a relative path, returns an absolute url using the instance base URL
     * @param {string} path The path to convert to absolute
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
     * @param {string} location The path to redirect to
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
                this._storage = new ServerStorage(this.options.request);
            }
        }
        return this._storage;
    }
    /**
     * ASCII string to Base64
     * @param {string} str The ascii string
     */
    btoa(str) {
        return Buffer.from(str).toString("base64");
    }
    /**
     * Base64 to ASCII string
     * @param {string} str The base64 encoded string
     */
    atob(str) {
        return Buffer.from(str, "base64").toString("ascii");
    }
    /**
     * Encodes a string or Uint8Array to Base64 URL format
     * @param {string | Uint8Array} input The input string or Uint8Array
     * @returns The Base64 URL encoded string
     */
    base64urlencode(input) {
        return base64url.encode(input);
    }
    /**
     * Decodes a Base64 URL encoded string
     * @param {string} input The Base64 URL encoded string
     * @returns The decoded string
     */
    base64urldecode(input) {
        return base64url.decode(input).toString();
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
            ready: (...args) => ready(this, ...args),
            authorize: options => authorize(this, options),
            init: options => init(this, options),
            client: (state) => new Client(this, state),
            options: this.options
        };
    }
}
