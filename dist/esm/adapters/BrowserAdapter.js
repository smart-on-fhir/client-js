import { ready, authorize, init } from "../smart";
import Client from "../Client";
import BrowserStorage from "../storage/BrowserStorage";
import * as security from "../security/browser";
import { encodeURL, decode, fromUint8Array } from "js-base64";
/**
 * Browser Adapter
 */
export default class BrowserAdapter {
    /**
     * Stores the URL instance associated with this adapter
     */
    _url = null;
    /**
     * Holds the Storage instance associated with this instance
     */
    _storage = null;
    /**
     * Environment-specific options
     */
    options;
    security = security;
    /**
     * @param options Environment-specific options
     */
    constructor(options = {}) {
        this.options = {
            // Replaces the browser's current URL
            // using window.history.replaceState API or by reloading.
            replaceBrowserHistory: true,
            // When set to true, this variable will fully utilize
            // HTML5 sessionStorage API.
            // This variable can be overridden to false by setting
            // FHIR.oauth2.settings.fullSessionStorageSupport = false.
            // When set to false, the sessionStorage will be keyed
            // by a state variable. This is to allow the embedded IE browser
            // instances instantiated on a single thread to continue to
            // function without having sessionStorage data shared
            // across the embedded IE instances.
            fullSessionStorageSupport: true,
            // Do we want to send cookies while making a request to the token
            // endpoint in order to obtain new access token using existing
            // refresh token. In rare cases the auth server might require the
            // client to send cookies along with those requests. In this case
            // developers will have to change this before initializing the app
            // like so:
            // `FHIR.oauth2.settings.refreshTokenWithCredentials = "include";`
            // or
            // `FHIR.oauth2.settings.refreshTokenWithCredentials = "same-origin";`
            // Can be one of:
            // "include"     - always send cookies
            // "same-origin" - only send cookies if we are on the same domain (default)
            // "omit"        - do not send cookies
            refreshTokenWithCredentials: "same-origin",
            ...options
        };
    }
    /**
     * Given a relative path, returns an absolute url using the instance base URL
     */
    relative(path) {
        return new URL(path, this.getUrl().href).href;
    }
    /**
     * In browsers we need to be able to (dynamically) check if fhir.js is
     * included in the page. If it is, it should have created a "fhir" variable
     * in the global scope.
     */
    get fhir() {
        // @ts-ignore
        return typeof fhir === "function" ? fhir : null;
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
            this._storage = new BrowserStorage();
        }
        return this._storage;
    }
    /**
     * ASCII string to Base64
     */
    atob(str) {
        return window.atob(str);
    }
    /**
     * Base64 to ASCII string
     */
    btoa(str) {
        return window.btoa(str);
    }
    base64urlencode(input) {
        if (typeof input == "string") {
            return encodeURL(input);
        }
        return fromUint8Array(input, true);
    }
    base64urldecode(input) {
        return decode(input);
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
            options: this.options,
            utils: {
                security
            }
        };
    }
}
