import BrowserStorage from "../storage/BrowserStorage";
import { fhirclient } from "../types";
import * as security from "../security/browser";
/**
 * Browser Adapter
 */
export default class BrowserAdapter implements fhirclient.Adapter {
    /**
     * Stores the URL instance associated with this adapter
     */
    private _url;
    /**
     * Holds the Storage instance associated with this instance
     */
    private _storage;
    /**
     * Environment-specific options
     */
    options: fhirclient.BrowserFHIRSettings;
    security: typeof security;
    /**
     * @param options Environment-specific options
     */
    constructor(options?: fhirclient.BrowserFHIRSettings);
    /**
     * Given a relative path, returns an absolute url using the instance base URL
     */
    relative(path: string): string;
    /**
     * In browsers we need to be able to (dynamically) check if fhir.js is
     * included in the page. If it is, it should have created a "fhir" variable
     * in the global scope.
     */
    get fhir(): any;
    /**
     * Given the current environment, this method must return the current url
     * as URL instance
     */
    getUrl(): URL;
    /**
     * Given the current environment, this method must redirect to the given
     * path
     */
    redirect(to: string): void;
    /**
     * Returns a BrowserStorage object which is just a wrapper around
     * sessionStorage
     */
    getStorage(): BrowserStorage;
    /**
     * ASCII string to Base64
     */
    atob(str: string): string;
    /**
     * Base64 to ASCII string
     */
    btoa(str: string): string;
    base64urlencode(input: string | Uint8Array): string;
    base64urldecode(input: string): string;
    /**
     * Creates and returns adapter-aware SMART api. Not that while the shape of
     * the returned object is well known, the arguments to this function are not.
     * Those who override this method are free to require any environment-specific
     * arguments. For example in node we will need a request, a response and
     * optionally a storage or storage factory function.
     */
    getSmartApi(): fhirclient.SMART;
}
