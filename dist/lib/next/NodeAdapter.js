"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ServerStorage_1 = __importDefault(require("./ServerStorage"));
const server_1 = require("./server");
const smart_1 = require("./smart");
const Client_1 = __importDefault(require("./Client"));
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
        this.security = {
            randomBytes: server_1.randomBytes,
            digestSha256: server_1.digestSha256,
            generatePKCEChallenge: server_1.generatePKCEChallenge,
            importJWK: server_1.importJWK,
            signCompactJws: server_1.signCompactJws
        };
        this.options = { ...options };
    }
    relative(path) {
        return new URL(path, this.getUrl().href).href;
    }
    getProtocol() {
        const req = this.options.request;
        const proto = req.socket.encrypted ? "https" : "http";
        return req.headers["x-forwarded-proto"] || proto;
    }
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
    redirect(location) {
        this.options.response.writeHead(302, { location });
        this.options.response.end();
    }
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
    base64urlencode(input) {
        return (0, server_1.base64urlencode)(input);
    }
    base64urldecode(input) {
        return (0, server_1.base64urldecode)(input);
    }
    getSmartApi() {
        return {
            ready: (...args) => (0, smart_1.ready)(this, ...args),
            authorize: options => (0, smart_1.authorize)(this, options),
            init: options => (0, smart_1.init)(this, options),
            client: (state) => new Client_1.default(state, this.getStorage()),
            options: this.options
        };
    }
}
exports.default = NodeAdapter;
