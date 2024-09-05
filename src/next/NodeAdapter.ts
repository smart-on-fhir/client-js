import { TLSSocket }                        from "tls"
import { IncomingMessage, ServerResponse }  from "http"
import { fhirclient }                       from "."
import ServerStorage                        from "./ServerStorage"
import {
    base64urldecode,
    base64urlencode,
    digestSha256,
    generatePKCEChallenge,
    importJWK,
    randomBytes,
    signCompactJws
} from "./server"
import { authorize, init, ready } from "./smart"
import Client from "./Client"


interface NodeAdapterOptions {
    request : IncomingMessage;
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

    options: NodeAdapterOptions;

    security = {
        randomBytes,
        digestSha256,
        generatePKCEChallenge,
        importJWK,
        signCompactJws
    };

    /**
     * @param options Environment-specific options
     */
    constructor(options: NodeAdapterOptions) {
        this.options = { ...options };
    }

    relative(path: string) {
        return new URL(path, this.getUrl().href).href;
    }

    getProtocol() {
        const req = this.options.request;
        const proto = (req.socket as TLSSocket).encrypted ? "https" : "http";
        return req.headers["x-forwarded-proto"] as string || proto;
    }

    getUrl() {
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

    redirect(location: string) {
        this.options.response.writeHead(302, { location });
        this.options.response.end();
    }

    getStorage() {
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

    base64urlencode(input: string | Uint8Array) {
        return base64urlencode(input);
    }

    base64urldecode(input: string) {
        return base64urldecode(input);
    }

    getSmartApi(): fhirclient.SMART_API
    {
        return {
            ready    : (...args: any[]) => ready(this, ...args),
            authorize: options => authorize(this, options),
            init     : options => init(this, options),
            client   : (state: string | fhirclient.ClientState) => new Client(state, this.getStorage()),
            options  : this.options
        };
    }
}
