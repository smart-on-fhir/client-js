import { fhirclient } from ".";
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
export default class Client implements fhirclient.ClientInterface {
    /**
     * The state of the client instance is an object with various properties.
     * It contains some details about how the client has been authorized and
     * determines the behavior of the client instance. This state is persisted
     * in `SessionStorage` in browsers or in request session on the servers.
     */
    readonly state: fhirclient.ClientState;
    /**
     * The Storage to use
     */
    readonly storage: fhirclient.Storage;
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
     * Refers to the refresh task while it is being performed.
     * @see [[refresh]]
     */
    private _refreshTask;
    /**
     * Validates the parameters and creates an instance.
     */
    constructor(state: fhirclient.ClientState | string, storage: fhirclient.Storage);
    getPatientId(): string | null;
    getEncounterId(): string | null;
    getIdToken(): fhirclient.IDToken | null;
    getFhirUser(): any;
    getUserId(): any;
    getUserType(): any;
    getAuthorizationHeader(): string | null;
    /**
     * Used internally to clear the state of the instance and the state in the
     * associated storage.
     */
    private _clearState;
    create<R = fhirclient.FHIR.Resource, O extends fhirclient.FetchOptions = {}>(resource: fhirclient.FHIR.Resource, requestOptions?: O): Promise<O["includeResponse"] extends true ? fhirclient.CombinedFetchResult<R> : R>;
    update<R = fhirclient.FHIR.Resource, O extends fhirclient.FetchOptions = {}>(resource: fhirclient.FHIR.Resource, requestOptions?: O): Promise<O["includeResponse"] extends true ? fhirclient.CombinedFetchResult<R> : R>;
    delete<R = unknown>(url: string, requestOptions?: fhirclient.FetchOptions): Promise<R>;
    patch<ResolveType = fhirclient.FHIR.Resource>(url: string, patch: fhirclient.JsonPatch, requestOptions?: fhirclient.FetchOptions): Promise<ResolveType>;
    request<T = any>(requestOptions: string | URL | fhirclient.RequestOptions, fhirOptions?: fhirclient.FhirOptions, _resolvedRefs?: fhirclient.JsonObject): Promise<T>;
    refreshIfNeeded(requestOptions?: RequestInit): Promise<any>;
    refresh(requestOptions?: RequestInit): Promise<any>;
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
    /**
     * Returns a promise that will be resolved with the fhir version as defined
     * in the CapabilityStatement.
     */
    getFhirVersion(): Promise<string>;
    /**
     * Returns a promise that will be resolved with the numeric fhir version
     * - 2 for DSTU2
     * - 3 for STU3
     * - 4 for R4
     * - 0 if the version is not known
     */
    getFhirRelease(): Promise<number>;
}