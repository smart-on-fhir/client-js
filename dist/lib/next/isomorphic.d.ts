import { fhirclient } from "../types";
export declare const debug: (...args: any[]) => void;
/**
 * A namespace with functions for converting between different measurement units
 */
export declare const units: {
    cm({ code, value }: fhirclient.CodeValue): number;
    kg({ code, value }: fhirclient.CodeValue): number;
    any(pq: fhirclient.CodeValue): number;
};
/**
 * Used in fetch Promise chains to reject if the "ok" property is not true
 */
export declare function checkResponse(resp: Response): Promise<Response>;
/**
 * Used in fetch Promise chains to return the JSON version of the response.
 * Note that `resp.json()` will throw on empty body so we use resp.text()
 * instead.
 */
export declare function responseToJSON(resp: Response): Promise<object | string>;
export declare function loweCaseKeys<T = Record<string, any> | any[] | undefined>(obj: T): T;
/**
 * This is our built-in request function. It does a few things by default
 * (unless told otherwise):
 * - Makes CORS requests
 * - Sets accept header to "application/json"
 * - Handles errors
 * - If the response is json return the json object
 * - If the response is text return the result text
 * - Otherwise return the response object on which we call stuff like `.blob()`
 * @param {string | Request} url
 * @param {FetchOptions} [requestOptions]
 */
export declare function request<T = fhirclient.FetchResult>(url: string | Request, requestOptions?: fhirclient.FetchOptions): Promise<T>;
/**
 * Makes a request using `fetch` and stores the result in internal memory cache.
 * The cache is cleared when the page is unloaded.
 * @param url The URL to request
 * @param requestOptions Request options
 * @param [force] If true, reload from source and update the cache, even if it
 * has already been cached.
 */
export declare function getAndCache(url: string, requestOptions?: RequestInit, force?: boolean): Promise<any>;
/**
 * Fetches the conformance statement from the given base URL.
 * Note that the result is cached in memory (until the page is reloaded in the
 * browser) because it might have to be re-used by the client
 * @param baseUrl The base URL of the FHIR server
 * @param [requestOptions] Any options passed to the fetch call
 */
export declare function fetchConformanceStatement(baseUrl?: string, requestOptions?: RequestInit): Promise<fhirclient.FHIR.CapabilityStatement>;
/**
 * Walks through an object (or array) and returns the value found at the
 * provided path. This function is very simple so it intentionally does not
 * support any argument polymorphism, meaning that the path can only be a
 * dot-separated string. If the path is invalid returns undefined.
 * @param obj The object (or Array) to walk through
 * @param path The path (eg. "a.b.4.c")
 * @returns {*} Whatever is found in the path or undefined
 */
export declare function getPath(obj: Record<string, any>, path?: string): any;
/**
 * Like getPath, but if the node is found, its value is set to @value
 * @param obj The object (or Array) to walk through
 * @param path The path (eg. "a.b.4.c")
 * @param value The value to set
 * @param createEmpty If true, create missing intermediate objects or arrays
 * @returns The modified object
 */
export declare function setPath(obj: Record<string, any>, path: string, value: any, createEmpty?: boolean): Record<string, any>;
/**
 * If the argument is an array returns it as is. Otherwise puts it in an array
 * (`[arg]`) and returns the result
 * @param arg The element to test and possibly convert to array
 * @category Utility
 */
export declare function makeArray<T = any>(arg: any): T[];
/**
 * Given a path, converts it to absolute url based on the `baseUrl`. If baseUrl
 * is not provided, the result would be a rooted path (one that starts with `/`).
 * @param path The path to convert
 * @param baseUrl The base URL
 */
export declare function absolute(path: string, baseUrl?: string): string;
/**
 * Generates random strings. By default this returns random 8 characters long
 * alphanumeric strings.
 * @param strLength The length of the output string. Defaults to 8.
 * @param charSet A string containing all the possible characters.
 *     Defaults to all the upper and lower-case letters plus digits.
 * @category Utility
 */
export declare function randomString(strLength?: number, charSet?: string): string;
/**
 * Add a supplied number of seconds to the supplied Date, returning an integer
 * number of seconds since the epoch
 * @param secondsAhead How far ahead, in seconds (defaults to 120 seconds)
 * @param [from] Initial time (defaults to current time)
 */
export declare function getTimeInFuture(secondsAhead?: number, from?: Date | number): number;
/**
 * Groups the observations by code. Returns a map that will look like:
 * ```js
 * const map = client.byCodes(observations, "code");
 * // map = {
 * //     "55284-4": [ observation1, observation2 ],
 * //     "6082-2": [ observation3 ]
 * // }
 * ```
 * @param observations Array of observations
 * @param property The name of a CodeableConcept property to group by
 */
export declare function byCode(observations: fhirclient.FHIR.Observation | fhirclient.FHIR.Observation[], property: string): fhirclient.ObservationMap;
/**
 * First groups the observations by code using `byCode`. Then returns a function
 * that accepts codes as arguments and will return a flat array of observations
 * having that codes. Example:
 * ```js
 * const filter = client.byCodes(observations, "category");
 * filter("laboratory") // => [ observation1, observation2 ]
 * filter("vital-signs") // => [ observation3 ]
 * filter("laboratory", "vital-signs") // => [ observation1, observation2, observation3 ]
 * ```
 * @param observations Array of observations
 * @param property The name of a CodeableConcept property to group by
 */
export declare function byCodes(observations: fhirclient.FHIR.Observation | fhirclient.FHIR.Observation[], property: string): (...codes: string[]) => any[];
/**
 * Given a conformance statement and a resource type, returns the name of the
 * URL parameter that can be used to scope the resource type by patient ID.
 */
export declare function getPatientParam(conformance: fhirclient.FHIR.CapabilityStatement, resourceType: string): string;
export declare function assert(condition: any, message: string): asserts condition;
export declare function assertJsonPatch(patch: fhirclient.JsonPatch): asserts patch;
/**
 * Fetches the well-known json file from the given base URL.
 * Note that the result is cached in memory (until the page is reloaded in the
 * browser) because it might have to be re-used by the client
 * @param baseUrl The base URL of the FHIR server
 */
export declare function fetchWellKnownJson(baseUrl?: string, requestOptions?: RequestInit): Promise<fhirclient.WellKnownSmartConfiguration>;
/**
 * Fetch a "WellKnownJson" and extract the SMART endpoints from it
 */
export declare function getSecurityExtensionsFromWellKnownJson(baseUrl?: string, requestOptions?: RequestInit): Promise<fhirclient.OAuthSecurityExtensions>;
/**
 * Fetch a `CapabilityStatement` and extract the SMART endpoints from it
 */
export declare function getSecurityExtensionsFromConformanceStatement(baseUrl?: string, requestOptions?: RequestInit): Promise<fhirclient.OAuthSecurityExtensions>;
/**
 * Given a FHIR server, returns an object with it's Oauth security endpoints
 * that we are interested in. This will try to find the info in both the
 * `CapabilityStatement` and the `.well-known/smart-configuration`. Whatever
 * Arrives first will be used and the other request will be aborted.
 * @param [baseUrl = "/"] Fhir server base URL
 */
export declare function getSecurityExtensions(baseUrl?: string): Promise<fhirclient.OAuthSecurityExtensions>;
export declare function base64encode(input: string): string;
export declare function base64decode(input: string): string;
export declare function shouldIncludeChallenge(S256supported: boolean, pkceMode?: string): boolean;
/**
 * Decodes a JWT token and returns it's body.
 * @param token The token to read
 * @category Utility
 */
export declare function jwtDecode(token: string): Record<string, any> | null;
/**
 * Given a token response, computes and returns the expiresAt timestamp.
 * Note that this should only be used immediately after an access token is
 * received, otherwise the computed timestamp will be incorrect.
 * @param tokenResponse
 */
export declare function getAccessTokenExpiration(tokenResponse: fhirclient.TokenResponse): number;
