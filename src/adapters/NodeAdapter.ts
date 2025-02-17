import { fhirclient } from "../types";
import { ready, authorize, init } from "../smart";
import Client from "../Client";
import ServerStorage from "../storage/ServerStorage";
import { AbortController } from "abortcontroller-polyfill/dist/cjs-ponyfill";
import { IncomingMessage, ServerResponse } from "http";
import { TLSSocket } from "tls";
import * as security from "../security/server"
import { base64url } from "jose"


interface NodeAdapterOptions {
    request: IncomingMessage;
    response: ServerResponse;
    storage?: fhirclient.Storage | fhirclient.storageFactory;
}

/**
 * Node Adapter - works with native NodeJS and with Express
 */
export default class NodeAdapter implements fhirclient.Adapter
{
    /**
     * Holds the Storage instance associated with this instance
     */
    protected _storage: fhirclient.Storage | null = null;

    /**
     * Environment-specific options
     */
    options: NodeAdapterOptions;

    security = security;

    /**
     * @param options Environment-specific options
     */
    constructor(options: NodeAdapterOptions)
    {
        this.options = { ...options };
    }

    /**
     * Given a relative path, returns an absolute url using the instance base URL
     */
    relative(path: string): string
    {
        return new URL(path, this.getUrl().href).href;
    }

    /**
     * Returns the protocol of the current request ("http" or "https")
     */
    getProtocol(): string
    {
        const req = this.options.request;
        const proto = (req.socket as TLSSocket).encrypted ? "https" : "http";
        return req.headers["x-forwarded-proto"] as string || proto;
    }

    /**
     * Given the current environment, this method must return the current url
     * as URL instance. In Node we might be behind a proxy!
     */
    getUrl(): URL
    {
        const req = this.options.request;

        let host = req.headers.host;
        if (req.headers["x-forwarded-host"]) {
            host = req.headers["x-forwarded-host"] as string;
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
    redirect(location: string): void
    {
        this.options.response.writeHead(302, { location });
        this.options.response.end();
    }

    /**
     * Returns a ServerStorage instance
     */
    getStorage(): fhirclient.Storage
    {
        if (!this._storage) {
            if (this.options.storage) {
                if (typeof this.options.storage == "function") {
                    this._storage = this.options.storage(this.options);
                } else {
                    this._storage = this.options.storage;
                }
            } else {
                this._storage = new ServerStorage(this.options.request as fhirclient.RequestWithSession);
            }
        }
        return this._storage;
    }

    /**
     * Base64 to ASCII string
     */
    btoa(str: string): string
    {
        // The "global." makes Webpack understand that it doesn't have to
        // include the Buffer code in the bundle
        return global.Buffer.from(str).toString("base64");
    }

    /**
     * ASCII string to Base64
     */
    atob(str: string): string
    {
        // The "global." makes Webpack understand that it doesn't have to
        // include the Buffer code in the bundle
        return global.Buffer.from(str, "base64").toString("ascii");
    }

    base64urlencode(input: string | Uint8Array)
    {
        return base64url.encode(input);
    }

    base64urldecode(input: string)
    {
        return base64url.decode(input).toString();
    }

    /**
     * Returns a reference to the AbortController constructor. In browsers,
     * AbortController will always be available as global (native or polyfilled)
     */
    getAbortController()
    {
        return AbortController;
    }

    /**
     * Creates and returns adapter-aware SMART api. Not that while the shape of
     * the returned object is well known, the arguments to this function are not.
     * Those who override this method are free to require any environment-specific
     * arguments. For example in node we will need a request, a response and
     * optionally a storage or storage factory function.
     */
    getSmartApi(): fhirclient.SMART
    {
        return {
            ready    : (...args: any[]) => ready(this, ...args),
            authorize: options => authorize(this, options),
            init     : options => init(this, options),
            client   : (state: string | fhirclient.ClientState) => new Client(this, state),
            options  : this.options
        };
    }
}
