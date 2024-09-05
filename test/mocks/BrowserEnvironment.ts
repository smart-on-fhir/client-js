import EventEmitter   from "events"
import { base64url }  from "jose"
import BrowserStorage from "./MemoryStorage"
import { fhirclient } from "../../src/types"
import * as security  from "../../src/security/server"


export default class BrowserEnvironment extends EventEmitter implements fhirclient.Adapter
{
    options: any;

    security = security;

    protected _storage?: BrowserStorage;

    constructor(options = {})
    {
        super();
        this.options = {
            window: globalThis.window,
            ...options
        };
    }

    get fhir()
    {
        return null;
    }

    getUrl()
    {
        return new URL(this.options.window.location.href);
    }

    redirect(to: string)
    {
        this.options.window.location.href = to;
        this.emit("redirect");
    }

    getStorage()
    {
        if (!this._storage) {
            this._storage = new BrowserStorage();
        }
        return this._storage;
    }

    relative(url: string)
    {
        return new URL(url, this.options.window.location.href).href;
    }

    getSmartApi(): any
    {
        return false;
    }

    base64encode(str: string): string
    {
        return Buffer.from(str).toString("base64");
    }

    base64decode(str: string): string
    {
        return Buffer.from(str, "base64").toString("ascii");
    }

    base64urlencode(input: string | Uint8Array)
    {
        return base64url.encode(input);
    }

    base64urldecode(input: string)
    {
        return base64url.decode(input).toString();
    }
}
