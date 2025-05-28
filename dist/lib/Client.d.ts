import { fhirclient } from "./types";
import FhirClient from "./FhirClient";
/**
 * This is a FHIR client that is returned to you from the `ready()` call of the
 * **SMART API**. You can also create it yourself if needed:
 *
 * ```js
 * // BROWSER
 * const client = FHIR.client("https://r4.smarthealthit.org");
 *
 * // SERVER
 * const client = smart(req, res).client("https://r4.smarthealthit.org");
 * ```
 */
export default class Client extends FhirClient {
    /**
     * The state of the client instance is an object with various properties.
     * It contains some details about how the client has been authorized and
     * determines the behavior of the client instance. This state is persisted
     * in `SessionStorage` in browsers or in request session on the servers.
     */
    readonly state: fhirclient.ClientState;
    /**
     * The adapter to use to connect to the current environment. Currently we have:
     * - BrowserAdapter - for browsers
     * - NodeAdapter - for Express or vanilla NodeJS servers
     * - HapiAdapter - for HAPI NodeJS servers
     */
    readonly environment: fhirclient.Adapter;
    /**
     * A SMART app is typically associated with a patient. This is a namespace
     * for the patient-related functionality of the client.
     */
    readonly patient: {
        /**
         * The ID of the current patient or `null` if there is no current patient
         */
        id: string | null;
        /**
         * A method to fetch the current patient resource from the FHIR server.
         * If there is no patient context, it will reject with an error.
         * @param {fhirclient.FetchOptions} [requestOptions] Any options to pass to the `fetch` call.
         * @category Request
         */
        read: fhirclient.RequestFunction<fhirclient.FHIR.Patient>;
        /**
         * This is similar to [[request]] but it makes requests in the
         * context of the current patient. For example, instead of doing
         * ```js
         * client.request("Observation?patient=" + client.patient.id)
         * ```
         * you can do
         * ```js
         * client.patient.request("Observation")
         * ```
         * The return type depends on the arguments. Typically it will be the
         * response payload JSON object. Can also be a string or the `Response`
         * object itself if we have received a non-json result, which allows us
         * to handle even binary responses. Can also be a [[CombinedFetchResult]]
         * object if the `requestOptions.includeResponse`s has been set to true.
         * @category Request
         */
        request: <R = fhirclient.FetchResult>(requestOptions: string | URL | fhirclient.RequestOptions, fhirOptions?: fhirclient.FhirOptions) => Promise<R>;
        /**
         * This is the FhirJS Patient API. It will ONLY exist if the `Client`
         * instance is "connected" to FhirJS.
         */
        api?: Record<string, any>;
    };
    /**
     * The client may be associated with a specific encounter, if the scopes
     * permit that and if the back-end server supports that. This is a namespace
     * for encounter-related functionality.
     */
    readonly encounter: {
        /**
         * The ID of the current encounter or `null` if there is no current
         * encounter
         */
        id: string | null;
        /**
         * A method to fetch the current encounter resource from the FHIR server.
         * If there is no encounter context, it will reject with an error.
         * @param [requestOptions] Any options to pass to the `fetch` call.
         * @category Request
         */
        read: fhirclient.RequestFunction<fhirclient.FHIR.Encounter>;
    };
    /**
     * The client may be associated with a specific user, if the scopes
     * permit that. This is a namespace for user-related functionality.
     */
    readonly user: {
        /**
         * The ID of the current user or `null` if there is no current user
         */
        id: string | null;
        /**
         * A method to fetch the current user resource from the FHIR server.
         * If there is no user context, it will reject with an error.
         * @param [requestOptions] Any options to pass to the `fetch` call.
         * @category Request
         */
        read: fhirclient.RequestFunction<fhirclient.FHIR.Patient | fhirclient.FHIR.Practitioner | fhirclient.FHIR.RelatedPerson>;
        /**
         * Returns the profile of the logged_in user (if any), or null if the
         * user is not available. This is a string having the shape
         * `{user type}/{user id}`. For example `Practitioner/abc` or
         * `Patient/xyz`.
         * @alias client.getFhirUser()
         */
        fhirUser: string | null;
        /**
         * Returns the type of the logged-in user or null. The result can be
         * `Practitioner`, `Patient` or `RelatedPerson`.
         * @alias client.getUserType()
         */
        resourceType: string | null;
    };
    /**
     * The [FhirJS](https://github.com/FHIR/fhir.js/blob/master/README.md) API.
     * **NOTE:** This will only be available if `fhir.js` is used. Otherwise it
     * will be `undefined`.
     */
    api: Record<string, any> | undefined;
    /**
     * Refers to the refresh task while it is being performed.
     * @see [[refresh]]
     */
    private _refreshTask;
    /**
     * Validates the parameters, creates an instance and tries to connect it to
     * FhirJS, if one is available globally.
     */
    constructor(environment: fhirclient.Adapter, state: fhirclient.ClientState | string);
    /**
     * This method is used to make the "link" between the `fhirclient` and the
     * `fhir.js`, if one is available.
     * **Note:** This is called by the constructor. If fhir.js is available in
     * the global scope as `fhir`, it will automatically be linked to any [[Client]]
     * instance. You should only use this method to connect to `fhir.js` which
     * is not global.
     */
    connect(fhirJs?: (options: Record<string, any>) => Record<string, any>): Client;
    /**
     * Returns the ID of the selected patient or null. You should have requested
     * "launch/patient" scope. Otherwise this will return null.
     */
    getPatientId(): string | null;
    /**
     * Returns the ID of the selected encounter or null. You should have
     * requested "launch/encounter" scope. Otherwise this will return null.
     * Note that not all servers support the "launch/encounter" scope so this
     * will be null if they don't.
     */
    getEncounterId(): string | null;
    /**
     * Returns the (decoded) id_token if any. You need to request "openid" and
     * "profile" scopes if you need to receive an id_token (if you need to know
     * who the logged-in user is).
     */
    getIdToken(): fhirclient.IDToken | null;
    /**
     * Returns the profile of the logged_in user (if any). This is a string
     * having the following shape `"{user type}/{user id}"`. For example:
     * `"Practitioner/abc"` or `"Patient/xyz"`.
     */
    getFhirUser(): string | null;
    /**
     * Returns the user ID or null.
     */
    getUserId(): string | null;
    /**
     * Returns the type of the logged-in user or null. The result can be
     * "Practitioner", "Patient" or "RelatedPerson".
     */
    getUserType(): string | null;
    /**
     * Builds and returns the value of the `Authorization` header that can be
     * sent to the FHIR server
     */
    getAuthorizationHeader(): string | null;
    /**
     * Used internally to clear the state of the instance and the state in the
     * associated storage.
     */
    private _clearState;
    /**
     * @param requestOptions Can be a string URL (relative to the serviceUrl),
     * or an object which will be passed to fetch()
     * @param fhirOptions Additional options to control the behavior
     * @param _resolvedRefs DO NOT USE! Used internally.
     * @category Request
     */
    request<T = any>(requestOptions: string | URL | fhirclient.RequestOptions, fhirOptions?: fhirclient.FhirOptions, _resolvedRefs?: fhirclient.JsonObject): Promise<T>;
    /**
     * Checks if access token and refresh token are present. If they are, and if
     * the access token is expired or is about to expire in the next 10 seconds,
     * calls `this.refresh()` to obtain new access token.
     * @param requestOptions Any options to pass to the fetch call. Most of them
     * will be overridden, bit it might still be useful for passing additional
     * request options or an abort signal.
     * @category Request
     */
    refreshIfNeeded(requestOptions?: RequestInit): Promise<fhirclient.ClientState>;
    /**
     * Use the refresh token to obtain new access token. If the refresh token is
     * expired (or this fails for any other reason) it will be deleted from the
     * state, so that we don't enter into loops trying to re-authorize.
     *
     * This method is typically called internally from [[request]] if
     * certain request fails with 401.
     *
     * @param requestOptions Any options to pass to the fetch call. Most of them
     * will be overridden, bit it might still be useful for passing additional
     * request options or an abort signal.
     * @category Request
     */
    refresh(requestOptions?: RequestInit): Promise<fhirclient.ClientState>;
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
     * @todo This should be deprecated and moved elsewhere. One should not have
     * to obtain an instance of [[Client]] just to use utility functions like this.
     * @deprecated
     * @category Utility
     */
    byCode(observations: fhirclient.FHIR.Observation | fhirclient.FHIR.Observation[], property: string): fhirclient.ObservationMap;
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
     * @todo This should be deprecated and moved elsewhere. One should not have
     * to obtain an instance of [[Client]] just to use utility functions like this.
     * @deprecated
     * @category Utility
     */
    byCodes(observations: fhirclient.FHIR.Observation | fhirclient.FHIR.Observation[], property: string): (...codes: string[]) => any[];
    /**
     * @category Utility
     */
    units: {
        cm({ code, value }: fhirclient.CodeValue): number;
        kg({ code, value }: fhirclient.CodeValue): number;
        any(pq: fhirclient.CodeValue): number;
    };
    /**
     * Walks through an object (or array) and returns the value found at the
     * provided path. This function is very simple so it intentionally does not
     * support any argument polymorphism, meaning that the path can only be a
     * dot-separated string. If the path is invalid returns undefined.
     * @param obj The object (or Array) to walk through
     * @param path The path (eg. "a.b.4.c")
     * @returns {*} Whatever is found in the path or undefined
     * @todo This should be deprecated and moved elsewhere. One should not have
     * to obtain an instance of [[Client]] just to use utility functions like this.
     * @deprecated
     * @category Utility
     */
    getPath(obj: Record<string, any>, path?: string): any;
    /**
     * Returns a copy of the client state. Accepts a dot-separated path argument
     * (same as for `getPath`) to allow for selecting specific properties.
     * Examples:
     * ```js
     * client.getState(); // -> the entire state object
     * client.getState("serverUrl"); // -> the URL we are connected to
     * client.getState("tokenResponse.patient"); // -> The selected patient ID (if any)
     * ```
     * @param path The path (eg. "a.b.4.c")
     * @returns {*} Whatever is found in the path or undefined
     */
    getState(path?: string): any;
}
