import { fhirclient } from "../types";
import ServerStorage from "../storage/ServerStorage";
import { IncomingMessage, ServerResponse } from "http";
import * as security from "../security/server";
export interface NodeAdapterOptions {
    request: IncomingMessage;
    response: ServerResponse;
    storage?: ServerStorage | ((options: {
        request: IncomingMessage;
    }) => ServerStorage);
}
/**
 * Node Adapter - works with native NodeJS and with Express
 */
export default class NodeAdapter implements fhirclient.Adapter {
    /**
     * Holds the Storage instance associated with this instance
     * @type {ServerStorage | null}
     */
    protected _storage: ServerStorage | null;
    /**
     * Environment-specific options
     */
    options: NodeAdapterOptions;
    /**
     * Security-related methods
     */
    security: typeof security;
    /**
     * @param {any} options Environment-specific options
     */
    constructor(options: NodeAdapterOptions);
    /**
     * Given a relative path, returns an absolute url using the instance base URL
     * @param {string} path The path to convert to absolute
     */
    relative(path: string): string;
    /**
     * Returns the protocol of the current request ("http" or "https")
     */
    getProtocol(): string;
    /**
     * Given the current environment, this method must return the current url
     * as URL instance. In Node we might be behind a proxy!
     */
    getUrl(): URL;
    /**
     * Given the current environment, this method must redirect to the given
     * path
     * @param {string} location The path to redirect to
     */
    redirect(location: string): void;
    /**
     * Returns a ServerStorage instance
     */
    getStorage(): ServerStorage;
    /**
     * ASCII string to Base64
     * @param {string} str The ascii string
     */
    btoa(str: string): string;
    /**
     * Base64 to ASCII string
     * @param {string} str The base64 encoded string
     */
    atob(str: string): string;
    /**
     * Encodes a string or Uint8Array to Base64 URL format
     * @param {string | Uint8Array} input The input string or Uint8Array
     * @returns The Base64 URL encoded string
     */
    base64urlencode(input: string | Uint8Array): string;
    /**
     * Decodes a Base64 URL encoded string
     * @param {string} input The Base64 URL encoded string
     * @returns The decoded string
     */
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
