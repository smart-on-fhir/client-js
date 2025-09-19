/* global fhir */
const EventEmitter = require("events");
import BrowserStorage      from "../../src/storage/BrowserStorage";
import { fhirclient }      from "../../src/types";
import * as security       from "../../src/security/server"
import { base64url }       from "jose"


export default class BrowserEnvironment extends EventEmitter implements fhirclient.Adapter
{
    options: any;

    security = security;

    constructor(options = {})
    {
        super();
        this.options = {
            replaceBrowserHistory: true,
            fullSessionStorageSupport: true,
            refreshTokenWithCredentials: "same-origin",
            ...options
        };
    }

    get fhir()
    {
        return null;
    }

    getUrl()
    {
        return new URL(window.location.href);
    }

    redirect(to: string)
    {
        window.location.href = to;
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
        return new URL(url, window.location.href).href;
    }

    getSmartApi(): any
    {
        return false;
    }

    btoa(str: string): string
    {
        return Buffer.from(str).toString("base64");
    }

    atob(str: string): string
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
