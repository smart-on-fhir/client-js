import { fhirclient }             from "."
import { ready, authorize, init } from "./smart"
import Client                     from "./Client"
import BrowserStorage             from "./BrowserStorage"
import * as browserLib            from "./browser"

/**
 * Browser Adapter
 */
export default class BrowserAdapter implements fhirclient.Adapter
{
    /**
     * Stores the URL instance associated with this adapter
     */
    private _url: URL | null = null;

    /**
     * Holds the Storage instance associated with this instance
     */
    private _storage: fhirclient.Storage | null = null;

    /**
     * Environment-specific options
     */
    options: fhirclient.BrowserFHIRSettings;

    security = {
        randomBytes          : browserLib.randomBytes,
        digestSha256         : browserLib.digestSha256,
        generatePKCEChallenge: browserLib.generatePKCEChallenge,
        importJWK            : browserLib.importJWK,
        signCompactJws       : browserLib.signCompactJws
    };

    /**
     * @param options Environment-specific options
     */
    constructor(options: fhirclient.BrowserFHIRSettings = {})
    {
        this.options = { ...options };
    }

    /**
     * Given a relative path, returns an absolute url using the instance base URL
     */
    relative(path: string): string {
        return new URL(path, this.getUrl().href).href;
    }

    /**
     * Given the current environment, this method must return the current url
     * as URL instance
     */
    getUrl(): URL {
        if (!this._url) {
            this._url = new URL(location + "");
        }
        return this._url;
    }

    /**
     * Given the current environment, this method must redirect to the given
     * path
     */
    redirect(to: string): void {
        location.href = to;
    }

    /**
     * Returns a BrowserStorage object which is just a wrapper around
     * sessionStorage
     */
    getStorage(): BrowserStorage {
        if (!this._storage) {
            this._storage = new BrowserStorage();
        }
        return this._storage;
    }

    base64urlencode(input: string | Uint8Array) {
        return browserLib.base64urlencode(input);
    }

    base64urldecode(input: string) {
        return browserLib.base64urldecode(input);
    }

    /**
     * Creates and returns adapter-aware SMART api. Not that while the shape of
     * the returned object is well known, the arguments to this function are not.
     * Those who override this method are free to require any environment-specific
     * arguments. For example in node we will need a request, a response and
     * optionally a storage or storage factory function.
     */
    getSmartApi(): fhirclient.SMART_API
    {
        return {
            ready    : (...args: any[]) => ready(this, ...args),
            authorize: options => authorize(this, options),
            init     : options => init(this, options),
            client   : (state: string | fhirclient.ClientState) => new Client(state, this.getStorage()),
            options  : this.options,
            utils: {
                security: this.security
            }
        };
    }
}
