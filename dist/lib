/// <reference lib="dom" />

import Client from "./Client";
import { getPath, byCodes, byCode } from "./lib";
import { IncomingMessage } from "http";

// tslint:disable-next-line: no-namespace
declare namespace fhirclient {

    interface RequestWithSession extends IncomingMessage {
        session: fhirclient.JsonObject;
    }

    interface SMART {
        options: BrowserFHIRSettings;

        /**
         * This should be called on your `redirect_uri`. Returns a Promise that
         * will eventually be resolved with a Client instance that you can use
         * to query the fhir server.
         */
        ready(options?: fhirclient.ReadyOptions): Promise<Client>;

        /**
         * Starts the [SMART Launch Sequence](http://hl7.org/fhir/smart-app-launch/#smart-launch-sequence).
         *
         * > **IMPORTANT:** `authorize()` will end up redirecting you to the
         *   authorization server. This means that you should **not** add
         *   anything to the returned promise chain. Any code written directly
         *   after the `authorize()` call might not be executed due to that
         *   redirect!
         *
         * The options that you would typically pass for an EHR launch are just
         * `clientId` and `scope`. For standalone launch you should also provide
         * the `iss` option.
         * @param options
         */
        authorize(options: AuthorizeParams): Promise<string|void>;

        /**
         * This function can be used when you want to handle everything in one
         * page (no launch endpoint needed).
         *
         * 1. It will only work if your `launch_uri` is the same as your `redirect_uri`.
         *    While this should be valid, we can't promise that every EHR will allow you
         *    to register client with such settings.
         * 2. Internally, init() will be called twice. First it will redirect to the EHR,
         *  then the EHR will redirect back to the page where `init()` will be called
         *  again to complete the authorization. This is generally fine, because the
         *  returned promise will only be resolved once, after the second execution,
         *  but please also consider the following:
         *  - You should wrap all your app's code in a function that is only executed
         *      after init() resolves!
         *  - Since the page will be loaded twice, you must be careful if your code has
         *      global side effects that can persist between page reloads (for example
         *      writing to localStorage).
         * @param options
         */
        init(options: AuthorizeParams): Promise<never|Client>;

        /**
         * Creates and returns a Client instance that can be used to query the
         * FHIR server.
         */
        client(state: string | fhirclient.ClientState): Client;

        [key: string]: any
    }

    interface BrowserFHIRSettings extends Record<string, any> {

        /**
         * Replaces the browser's current URL using
         * `window.history.replaceState` API.
         *
         * ONLY RELEVANT IN BROWSERS!
         */
        replaceBrowserHistory?: boolean;

        /**
         * When set to true, this variable will fully utilize HTML5
         * sessionStorage API. This variable can be overridden to false by
         * setting `FHIR.oauth2.settings.fullSessionStorageSupport = false`.
         * When set to false, the sessionStorage will be keyed by a state
         * variable. This is to allow the embedded IE browser instances
         * instantiated on a single thread to continue to function without
         * having sessionStorage data shared across the embedded IE instances.
         */
        fullSessionStorageSupport?: boolean;

        /**
         * Do we want to send cookies while making a request to the token
         * endpoint in order to obtain new access token using existing
         * refresh token. In rare cases the auth server might require the
         * client to send cookies along with those requests. In this case
         * developers will have to change this before initializing the app
         * like so:
         * `FHIR.oauth2.settings.refreshTokenWithCredentials = "include";`
         * or
         * `FHIR.oauth2.settings.refreshTokenWithCredentials = "same-origin";`
         * Can be one of:
         * "include"     - always send cookies
         * "same-origin" - only send cookies if we are on the same domain (default)
         * "omit"        - do not send cookies
         */
        refreshTokenWithCredentials?: "omit" | "include" | "same-origin";

        // storage?: Storage | ((options?: JsonObject) => Storage);
    }

    interface CodeValue {
        code: string;
        value: number;
    }

    interface ObservationMap {
        [code: string]: FHIR.Observation[];
    }

    interface Adapter {

        /**
         * Environment-specific options
         */
        options: BrowserFHIRSettings;

        /**
         * Given the current environment, this method returns the current url
         * as URL instance
         */
        getUrl(): URL;

        /**
         * Given the current environment, this method must redirect to the given
         * path
         * @param path The relative path to redirect to
         */
        redirect(to: string): void | Promise<any>;

        /**
         * This must return a Storage object
         * @returns {fhirclient.Storage}
         */
        getStorage(): Storage;

        /**
         * Given a relative path, compute and return the full url, assuming that
         * it is relative to the current location
         * @param {String} path The path to convert to absolute
         */
        relative(path: string): string;

        /**
         * Base64 to ASCII string
         */
        btoa(str: string): string;

        /**
         * ASCII string to Base64
         */
        atob(str: string): string;
        
        /**
         * ASCII string or Uint8Array to Base64URL
         */
        base64urlencode: (input: string | Uint8Array) => string

        /**
         * Base64Url to ASCII string
         */
        base64urldecode: (input: string) => string

        /**
         * Returns a reference to the AbortController class
         */
        getAbortController(): typeof AbortController;

        /**
         * Creates and returns adapter-aware SMART api. Not that while the shape of
         * the returned object is well known, the arguments to this function are not.
         * Those who override this method are free to require any environment-specific
         * arguments. For example in node we will need a request, a response and
         * optionally a storage or storage factory function.
         */
        getSmartApi(): SMART;

        security: {
            randomBytes: (count: number) => Uint8Array
            digestSha256: (payload: string) => Promise<Uint8Array>
            generatePKCEChallenge: (entropy?: number) => Promise<{ codeChallenge: string; codeVerifier: string }>
            importJWK: (jwk: JWK) => Promise<CryptoKey>
            signCompactJws: (alg: "ES384" | "RS384", privateKey: CryptoKey, header: any, payload: any) => Promise<string>
        }
    }

    /**
     * Simple key/value storage interface
     */
    interface Storage {

        /**
         * Sets the `value` on `key` and returns a promise that will be resolved
         * with the value that was set.
         */
        set: (key: string, value: any) => Promise<any>;

        /**
         * Gets the value at `key`. Returns a promise that will be resolved
         * with that value (or undefined for missing keys).
         */
        get: (key: string) => Promise<any>;

        /**
         * Deletes the value at `key`. Returns a promise that will be resolved
         * with true if the key was deleted or with false if it was not (eg. if
         * did not exist).
         */
        unset: (key: string) => Promise<boolean>;
    }

    // =========================================================================
    type WindowTargetVariable = "_self"|"_top"|"_parent"|"_blank"|"popup"|string|number|Window;
    function WindowTargetFunction(): WindowTargetVariable;
    function WindowTargetFunction(): Promise<WindowTargetVariable>;
    type WindowTarget = WindowTargetVariable | typeof WindowTargetFunction;

    type PkceMode = 'ifSupported' | 'required' | 'disabled' | 'unsafeV1';

    type storageFactory = (options?: Record<string, any>) => Storage;

    interface IncludeResponseHint {
        includeResponse?: boolean
        [k: string]: any
    }

    /**
     * A function or method that makes requests to the backend server. If the
     * `includeResponse` option is `true` resolves with `CombinedFetchResult`
     * where the `response` property is the `Response` object and the `body`
     * property is the result of type `R` (if any). Otherwise resolves with the
     * result as `R`.
     * @param R The expected return type
     * @param O May contain the `includeResponse` flag to signal that we also
     * want to receive the raw response object. Any other option will be passed
     * to the underlying `fetch` call.
     */
    type RequestFunction<R = any> = <O extends IncludeResponseHint = {}>(requestOptions?: O) => 
        Promise<O["includeResponse"] extends true ? CombinedFetchResult<R> : R>;

    /**
     * Options passed to the lib.request function
     */
    interface FetchOptions extends RequestInit {
        /**
         * If `true` the request function will be instructed to resolve with a
         * [[CombinedFetchResult]] object that contains the `Response` object
         * abd the parsed body (if any)
         */
        includeResponse?: boolean;
    }

    /**
     * If an `includeResponse` is set to true when calling the lib.request
     * function the returned object will include the Response object and the
     * parsed body if available
     */
    interface CombinedFetchResult<T = fhirclient.JsonObject | string> {
        body?: T
        response: Response
    } 
    
    /**
     * The return type of the lib.request function
     */
    type FetchResult = Response | fhirclient.JsonObject | string | CombinedFetchResult

    interface ES384JWK extends JsonWebKey {
        alg: "ES384"
        kty: "EC"
        crv: "P-384"
        kid: string
        key_ops?: KeyUsage[]
        [propName: string]: unknown
    }

    interface RS384JWK extends JsonWebKey {
        alg: "RS384"
        kty: "RSA"
        kid: string
        key_ops?: KeyUsage[]
        [propName: string]: unknown
    }

    type JWK = ES384JWK | RS384JWK;

    /**
     * Options that must contain an `url` property (String|URL).
     * A `includeResponse` boolean option might also be passed. Any other
     * properties will be passed to the underlying `fetch()` call.
     */
    interface RequestOptions extends RequestInit {
        /**
         * The URL to request
         */
        url: string | URL;

        /**
         * If set to true the request function will resolve with an object
         * like `{ body: any, response: Response }` so that users have
         * access to the response object and it's properties like headers
         * status etc.
         */
        includeResponse?: boolean;
    }

    /**
     * The three security endpoints that SMART servers might declare in the
     * conformance statement
     */
    interface OAuthSecurityExtensions {

        /**
         * You could register new SMART client at this endpoint (if the server
         * supports dynamic client registration)
         */
        registrationUri: string;

        /**
         * You must call this endpoint to ask for authorization code
         */
        authorizeUri: string;

        /**
         * You must call this endpoint to exchange your authorization code
         * for an access token.
         */
        tokenUri: string;

        /**
         * Supported PKCE Code challenge methods
         */
         codeChallengeMethods: string[];
    }

    /**
     * Describes the state that should be passed to the Client constructor.
     * Everything except `serverUrl` is optional
     */
    interface ClientState {
        /**
         * The base URL of the Fhir server. The library should have detected it
         * at authorization time from request query params of from config options.
         */
        serverUrl: string;

        /**
         * The client_id that you should have obtained while registering your
         * app with the auth server or EHR (as set in the configuration options)
         */
        clientId?: string;

        /**
         * The URI to redirect to after successful authorization, as set in the
         * configuration options.
         */
        redirectUri?: string;

        /**
         * The access scopes that you requested in your options (or an empty string).
         * @see http://docs.smarthealthit.org/authorization/scopes-and-launch-context/
         */
        scope?: string;

        /**
         * Your client public JWKS url if you have one
         * (for asymmetric confidential clients that have registered a JWKS URL)
         */
        clientPublicKeySetUrl?:  AuthorizeParams['clientPublicKeySetUrl'];

        /**
         * Your client private JWK if you have one (for asymmetric confidential clients)
         */
        clientPrivateJwk?:  JWK;

        /**
         * Your client secret if you have one (for symmetric confidential clients)
         */
        clientSecret?: string;

        /**
         * The (encrypted) access token, in case you have completed the auth flow
         * already.
         */
        // access_token?: string;

        /**
         * The response object received from the token endpoint while trying to
         * exchange the auth code for an access token (if you have reached that point).
         */
        tokenResponse?: TokenResponse;

        /**
         * The username for basic auth. If present, `password` must also be provided.
         */
        username?: string;

        /**
         * The password for basic auth. If present, `username` must also be provided.
         */
        password?: string;

        /**
         * You could register new SMART client at this endpoint (if the server
         * supports dynamic client registration)
         */
        registrationUri?: string;

        /**
         * You must call this endpoint to ask for authorization code
         */
        authorizeUri?: string;

        /**
         * You must call this endpoint to exchange your authorization code
         * for an access token.
         */
        tokenUri?: string;

        /**
         * The key under which this state is persisted in the storage
         */
        key?: string;

        /**
         * If `true`, the app requested to be initialized in the specified [[AuthorizeParams.target]].
         * Otherwise, the app requested to be initialized in the window in which
         * [[authorize]] was called.
         */
        completeInTarget?: boolean;

        /**
         * An Unix timestamp (JSON numeric value representing the number of
         * seconds since 1970). This updated every time an access token is
         * received from the server.
         */
        expiresAt?: number;

        /**
         * PKCE code challenge base value.
         */
        codeChallenge?: string;

        /**
          * PKCE code verification, formatted with base64url-encode (RFC 4648 § 5) 
          * without padding, which is NOT the same as regular base64 encoding.
          */
        codeVerifier?: string;
    }

    /**
     * Authorization parameters that can be passed to `authorize` or `init`
     */
    interface AuthorizeParams {

        /**
         * This is the URL of the service you are connecting to.
         * For [EHR Launch](http://hl7.org/fhir/smart-app-launch/#ehr-launch-sequence)
         * you **MUST NOT** provide this option. It will be passed by the EHR as
         * url parameter instead. Using `iss` as an option will "lock" your app to
         * that service provider. In other words, passing an `iss` option is how
         * you can do [Standalone Launch](http://hl7.org/fhir/smart-app-launch/#standalone-launch-sequence).
         */
        iss?: string;

        /**
         * Can be used to verify that the app is being launched against certain 
         * servers. This is especially useful when working with multiple EHR
         * configurations. Can be a string (in which case it will be expected to
         * match the provided ISS exactly), a regular expression to test against
         * the current ISS, or a function that will be called with the current
         * ISS and should return true or false to signify if that ISS is acceptable.
         */
        issMatch?: string | RegExp | ((iss: string) => boolean);

        /**
         * Do not pass use this option, unless you want to test it. It should come
         * as url parameter from the SMART authorization server as part of the EHR
         * launch sequence
         */
        launch?: string;

        /**
         * The base URL of the FHIR server to use. This is just like the `iss`
         * option, except that it is designed to bypass the authentication. If
         * `fhirServiceUrl` is passed, the `authorize` function will NOT actually
         * attempt to authorize. It will skip that and redirect you to your
         * `redirect_uri`.
         */
        fhirServiceUrl?: string;

        /**
         * Defaults to the current directory (it's index file)
         * @alias redirect_uri
         */
        redirectUri?: string;

        /**
         * Same as redirectUri
         * @alias redirectUri
         * @deprecated
         */
        redirect_uri?: string;

        /**
         * 
         */
        noRedirect?: boolean;

        /**
         * The client_id that you have obtained while registering your app in the
         * EHR. This is not required if you only intend to communicate with open
         * FHIR servers. Note: For backwards compatibility reasons we also accept
         * `client_id` instead of `clientId`!
         * @alias client_id
         */
        clientId?: string;

        /**
         * The client_id that you have obtained while registering your app in the
         * EHR. This is not required if you only intend to communicate with open
         * FHIR servers. Note: For backwards compatibility reasons we accept
         * `client_id` as an alias of `clientId`!
         * @alias clientId
         * @deprecated
         */
        client_id?: string;

        /**
         * One or more space-separated scopes that you would like to request from
         * the EHR. [Learn more](http://hl7.org/fhir/smart-app-launch/scopes-and-launch-context/index.html)
         */
        scope?: string;

        /**
         * The ID of the selected patient. If you are launching against an open FHIR
         * server, there is no way to obtain the launch context that would include
         * the selected patient ID. This way you can "inject" that ID and make the
         * client behave as if that is the currently active patient.
         */
        patientId?: string;

        /**
         * The ID of the selected encounter. If you are launching against an open
         * FHIR server, there is no way to obtain the launch context that would
         * (in some EHRs) include the selected encounter ID. This way you can
         * "inject" that ID and make the client behave as if this is the currently
         * active encounter.
         */
        encounterId?: string;

        /**
         * If you have registered a confidential client, you should pass your
         * `clientSecret` here. **Note: ONLY use this on the server**, as the
         * browsers are considered incapable of keeping a secret.
         */
        clientSecret?: string;

        /**
         * If you have registered a confidential client and you host your public
         * key online, you can pass your JWKS URL here **Note: ONLY use this on the server**, as the
         * browsers are considered incapable of keeping a secret.
         */
        clientPublicKeySetUrl?: string; 

        /**
         * If you have registered a confidential client, you should pass your
         * `clientPrivateJwk` here. **Note: ONLY use this on the server**, as
         * the browsers are considered incapable of keeping a secret.
         */
        clientPrivateJwk?: JWK;


        /**
         * Useful for testing. This object can contain any properties that are
         * typically contained in an [access token response](http://hl7.org/fhir/smart-app-launch/#step-3-app-exchanges-authorization-code-for-access-token).
         * These properties will be stored into the client state, as if it has been
         * authorized.
         */
        fakeTokenResponse?: object;

        /**
         * Where to start the auth flow. This option is only applicable in
         * browsers and is ignored on the server. Can be one of:
         * - `_self`    Authorize in the same window (**default**)
         * - `_top`     Authorize in the topmost window
         * - `_parent`  Authorize in the parent window
         * - `_blank`   Authorize in new tab or window
         * - `"popup"`  Open a popup, authorize in it and close it when done
         * - `String`   Frame name (string index in window.frames)
         * - `Number`   Numeric index in `window.frames`
         * - `Object`   Window reference (must have the same `origin`)
         * - `Function` A function that returns one of the above values or a
         *   promise that will resolve to such value.
         */
        target?: WindowTarget;

        /**
         * The width of the authorization popup window. Only used in browsers
         * and if the [[AuthorizeParams.target]] option is set to "popup".
         */
        width?: number;

        /**
         * The height of the authorization popup window. Only used in browsers
         * and if the [[AuthorizeParams.target]] option is set to "popup".
         */
        height?: number;

        /**
         * If `true`, the app will be initialized in the specified [[AuthorizeParams.target]].
         * Otherwise, the app will be initialized in the window in which
         * [[authorize]] was called.
         */
        completeInTarget?: boolean;

        /**
         * Client expectations for PKCE (Proof Key for Code Exchange). Can be
         * one of:
         * - `ifSupported` Use if a matching code challenge method is available (**default**)
         * - `required`    Do not attempt authorization to servers without support
         * - `disabled`    Do not use PKCE
         * - `unsafeV1` Use against Smart v1 servers. Smart v1 does not define
         *    conformance, so validate your server supports PKCE before using
         *    this setting
         */
        pkceMode?: PkceMode;
    }

    interface ReadyOptions {
        privateKey?: JWK | {
            key: CryptoKey
            alg: "RS384" | "ES384"
            kid: string
        };
        clientPublicKeySetUrl?: string; // for jku
        // [key: string]: any; // Other options TBD
    }

    /**
     * Additional options that can be passed to `client.request` to control its
     * behavior
     */
    interface FhirOptions {

        /**
         * When you request a Bundle, the result will typically come back in pages
         * and you will only get the first page. You can use `pageLimit` greater
         * than `1` to request multiple pages. For example `pageLimit: 3` will fetch
         * the first 3 pages as array. To fetch all the available pages you can set
         * this to `0`.
         * - Defaults to `1`.
         * - Ignored if the response is not a `Bundle`.
         */
        pageLimit?: number;

        /**
         * When you fetch multiple pages the resulting array may be very large,
         * requiring a lot of time and memory. It is often better if you specify a
         * page callback instead. The `onPage` callback will be called once for each
         * page with the page Bundle as it's argument. If you use `resolveReferences`
         * and `graph: false`, the references will be passed to `onPage` as second
         * argument.
         * - If `onPage` returns a promise it will be awaited for, meaning that no
         *   more pages will be fetched until the `onPage` promise is resolved.
         * - If `onPage` returns a rejected promise or throws an error, the client
         *   will not continue fetching more pages.
         * - If you use `onPage` callback, the promise returned by `request()` will
         *   be resolved with `null`. This is to avoid building that huge array in
         *   memory. By using the `onPage` option you are stating that you will
         *   handle the result one page at a time, instead of expecting to receive
         *   the big combined result.
         * @param data Depending in the other options can be `Bundle`, `Bundle[]`,
         *  `Resource[]`
         * @param references Map of resolved references. Only available if the `graph`
         *  option is set to `false`
         */
        onPage?: (data: JsonObject | JsonObject[], references?: JsonObject) => any;

        /**
         * When fetching a `Bundle`, you are typically only interested in the
         * included resources which are located at `{response}.entry[N].resource`.
         * If this option is set to `true`, the returned result will be an array of
         * resources instead of the whole bundle. This is especially useful when
         * multiple pages are fetched, because an array of page bundles is not that
         * useful and will often have to be converted to array of resources that is
         * easier to iterate.
         * - This option is ignored if the response is not a bundle.
         * - If you use `onPage` callback with `flat: true`, it will receive that
         *   array of resources instead of the page bundle.
         * - Resources from multiple pages are flattened into single array (unless
         *   you use `onPage`, which will be called with one array for each page).
         * - Defaults to `false`.
         * - Finally, `Bundle.entry` is optional in FHIR and that leads to bugs in
         *   apps that assume that it is always present. With `flat: true`, you will
         *   always get an array, even if it is empty, and even if no `entry` is
         *   found in the response bundle.
         */
        flat?: boolean;

        /**
         * Only applicable if you use `resolveReferences`. If `false`, the resolved
         * references will not be "mounted" in the result tree, but will be returned
         * as separate map object instead. **Defaults to `true`**.
         */
        graph?: boolean;

        /**
         * One or more references to resolve. Single item can be specified as a
         * string or as an array of one string. Multiple items must be specified as
         * array.
         * - Each item is a dot-separated path to the desired reference within the
         *   result object, excluding the "reference" property. For example
         *   `context.serviceProvider` will look for `{Response}.context.serviceProvider.reference`.
         * - If the target is an array of references (E.g.
         *   [Patient.generalPractitioner](http://hl7.org/fhir/R4/patient-definitions.html#Patient.generalPractitioner)), you can request one or more of them by index (E.g. `generalPractitioner.0`).
         *   If the index is not specified, all the references in the array will be
         *   resolved.
         * - The order in which the reference paths are specified does not matter.
         *   For example, if you use `["subject", "encounter.serviceProvider", "encounter"]`,
         *   the library should figure out that `encounter.serviceProvider` must be
         *   fetched after `encounter`. In fact, in this case it will first fetch
         *   subject and encounter in parallel, and then proceed to encounter.serviceProvider.
         * - This option does not work with contained references (they are "already
         *   resolved" anyway).
         */
        resolveReferences?: string|string[];

        /**
         * If the client is authorized, it will possess an access token and pass it
         * with the requests it makes. When that token expires, you should get back
         * a `401 Unauthorized` response. When that happens, if the client also has
         * a refresh token and if `useRefreshToken` is `true` (default), the client
         * will attempt to automatically re-authorize itself and then it will re-run
         * the failed request and eventually resolve it's promise with the final
         * result. This means that your requests should never fail with `401`,
         * unless the refresh token is also expired. If you don't want this, you can
         * set `useRefreshToken` to `false`. There is a `refresh` method on the
         * client that can be called manually to renew the access token.
         * - **Defaults to `true`**.
         */
        useRefreshToken?: boolean;
    }

    /**
     * The response object received from the token endpoint while trying to
     * exchange the auth code for an access token. This object has a well-known
     * base structure but the auth servers are free to augment it with
     * additional properties.
     * @see http://docs.smarthealthit.org/authorization/
     */
    interface TokenResponse {

        /**
         * If present, this tells the app that it is being rendered within an
         * EHR frame and the UI outside that frame already displays the selected
         * patient's name, age, gender etc. The app can decide to hide those
         * details to prevent the UI from duplicated information.
         */
        need_patient_banner?: boolean;

        /**
         * This could be a public location of some style settings that the EHR
         * would like to suggest. The app might look it up and optionally decide
         * to apply some or all of it.
         * @see https://launch.smarthealthit.org/smart-style.json
         */
        smart_style_url?: string;

        /**
         * If you have requested that require it (like `launch` or `launch/patient`)
         * the selected patient ID will be available here.
         */
        patient?: string;

        /**
         * If you have requested that require it (like `launch` or `launch/encounter`)
         * the selected encounter ID will be available here.
         * **NOTE:** This is not widely supported as of 2018.
         */
        encounter?: string;

        /**
         * If you have requested `openid` and `profile` scopes the profile of
         * the active user will be available as `client_id`.
         * **NOTE:** Regardless of it's name, this property does not store an ID
         * but a token that also suggests the user type like `Patient/123`,
         * `Practitioner/xyz` etc.
         */
        client_id?: string;

        /**
         * Fixed value: bearer
         */
        token_type?: "bearer" | "Bearer";

        /**
         * Scope of access authorized. Note that this can be different from the
         * scopes requested by the app.
         */
        scope?: string;

        /**
         * Lifetime in seconds of the access token, after which the token SHALL NOT
         * be accepted by the resource server
         */
        expires_in ?: number;

        /**
         * The access token issued by the authorization server
         */
        access_token?: string;

        /**
         * Authenticated patient identity and profile, if requested
         */
        id_token ?: string;

        /**
         * Token that can be used to obtain a new access token, using the same or a
         * subset of the original authorization grants
         */
        refresh_token ?: string;

        /**
         * Other properties might be passed by the server
         */
        [key: string]: any;
    }

    interface IDToken {
        profile: string;
        aud: string;
        sub: string;
        iss: string;
        iat: number;
        exp: number;
        [key: string]: any;
    }

    // JSON objects
    interface JsonObject { [key: string]: JsonValue; }
    type JsonPrimitive = string | number | boolean | null
    type JsonValue = JsonPrimitive|JsonArray|JsonObject
    type JsonArray = JsonValue[]
    
    // JSON Patch - https://datatracker.ietf.org/doc/html/rfc6902
    interface JsonPatchAdd     { op: "add"    ; path: string; value: JsonValue; }
    interface JsonPatchReplace { op: "replace"; path: string; value: JsonValue; }
    interface JsonPatchTest    { op: "test"   ; path: string; value: JsonValue; }
    interface JsonPatchMove    { op: "move"   ; path: string; from: string; }
    interface JsonPatchCopy    { op: "copy"   ; path: string; from: string; }
    interface JsonPatchRemove  { op: "remove" ; path: string; }
    type JsonPatchOperation = JsonPatchAdd|JsonPatchRemove|JsonPatchReplace|JsonPatchMove|JsonPatchCopy|JsonPatchTest;
    type JsonPatch = JsonPatchOperation[]

    // Capabilities ------------------------------------------------------------

    type codeChallengeMethod = "S256";

    type SMARTAuthenticationMethod = "client_secret_post" | "client_secret_basic" | "private_key_jwt";

    type launchMode = "launch-ehr" | "launch-standalone";

    type clientType = "client-public" | "client-confidential-symmetric";

    type singleSignOn = "sso-openid-connect";

    type launchContext = "context-banner" | "context-style";

    type launchContextEHR = "context-ehr-patient" | "context-ehr-encounter";

    type launchContextStandalone = "context-standalone-patient" | "context-standalone-encounter";

    type permissions = "permission-offline" | "permission-patient" | "permission-user";

    interface WellKnownSmartConfiguration {
        /**
         * URL to the OAuth2 authorization endpoint.
         */
        authorization_endpoint: string;

        /**
         * URL to the OAuth2 token endpoint.
         */
        token_endpoint: string;

        /**
         * If available, URL to the OAuth2 dynamic registration endpoint for the
         * FHIR server.
         */
        registration_endpoint?: string;

        /**
         * RECOMMENDED! URL where an end-user can view which applications currently
         * have access to data and can make adjustments to these access rights.
         */
        management_endpoint?: string;

        /**
         * RECOMMENDED! URL to a server’s introspection endpoint that can be used
         * to validate a token.
         */
        introspection_endpoint?: string;

        /**
         * RECOMMENDED! URL to a server’s revoke endpoint that can be used to
         * revoke a token.
         */
        revocation_endpoint?: string;

        /**
         * RECOMMENDED! PKCE challenge methods the server supports.
         */
        code_challenge_methods_supported?: codeChallengeMethod[];

        /**
         * Array of client authentication methods supported by the token endpoint.
         * The options are “client_secret_post” and “client_secret_basic”.
         */
        token_endpoint_auth_methods?: SMARTAuthenticationMethod[];

        /**
         * Array of scopes a client may request.
         */
        scopes_supported?: string[];

        /**
         * Array of OAuth2 response_type values that are supported
         */
        response_types_supported?: string[];

        /**
         * Array of strings representing SMART capabilities (e.g., single-sign-on
         * or launch-standalone) that the server supports.
         */
        capabilities: Array<
            SMARTAuthenticationMethod |
            launchMode |
            clientType |
            singleSignOn |
            launchContext |
            launchContextEHR |
            launchContextStandalone |
            permissions
        >;
    }

    namespace FHIR {

        /**
         * Any combination of upper or lower case ASCII letters ('A'..'Z', and
         * 'a'..'z', numerals ('0'..'9'), '-' and '.', with a length limit of 64
         * characters. (This might be an integer, an un-prefixed OID, UUID or any
         * other identifier pattern that meets these constraints.)
         * Regex: `[A-Za-z0-9\-\.]{1,64}`
         */
        type id = string;

        /**
         * A Uniform Resource Identifier Reference (RFC 3986 ). Note: URIs are case
         * sensitive. For UUID (urn:uuid:53fefa32-fcbb-4ff8-8a92-55ee120877b7) use
         * all lowercase. URIs can be absolute or relative, and may have an optional
         * fragment identifier.
         */
        type uri = string;

        /**
         * Indicates that the value is taken from a set of controlled strings
         * defined elsewhere. Technically,  a code is restricted to a string which
         * has at least one character and no leading or trailing whitespace, and
         * where there is no whitespace other than single spaces in the contents
         * Regex: [^\s]+([\s]?[^\s]+)*
         */
        type code = string;

        /**
         * An instant in time - known at least to the second and always includes a
         * time zone. Note: This is intended for precisely observed times (typically
         * system logs etc.), and not human-reported times - for them, use date and
         * dateTime. instant is a more constrained dateTime.
         *
         * Patterns:
         * - `YYYY-MM-DDTHH:mm:ss.SSSSZ`
         * - `YYYY-MM-DDTHH:mm:ss.SSSZ`
         * - `YYYY-MM-DDTHH:mm:ssZ`
         */
        type instant = string;  // "2018-04-30T13:31:44.140-04:00"

        /**
         * A date, date-time or partial date (e.g. just year or year + month) as
         * used in human communication. If hours and minutes are specified, a time
         * zone SHALL be populated. Seconds must be provided due to schema type
         * constraints but may be zero-filled and may be ignored. Dates SHALL be
         * valid dates. The time "24:00" is not allowed.
         *
         * Patterns:
         * - `YYYY-MM-DDTHH:mm:ss.SSSSZ`
         * - `YYYY-MM-DDTHH:mm:ss.SSSZ`
         * - `YYYY-MM-DDTHH:mm:ssZ`
         * - `YYYY-MM-DD`
         * - `YYYY-MM`
         * - `YYYY`
         *
         * Regex:
         * -?[0-9]{4}(-(0[1-9]|1[0-2])(-(0[0-9]|[1-2][0-9]|3[0-1])(T([01]
         * [0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](\.[0-9]+)?(Z|(\+|-)((0[0-9]|1[0-3]):
         * [0-5][0-9]|14:00)))?)?)?
         */
        type dateTime = string;

        /**
         * Any non-negative integer (e.g. >= 0)
         * Regex: [0]|([1-9][0-9]*)
         */
        type unsignedInt = number;

        type valueX = "valueInteger" | "valueUnsignedInt" | "valuePositiveInt" |
            "valueDecimal"|"valueDateTime"|"valueDate"|"valueTime"|"valueInstant"|
            "valueString"|"valueUri"|"valueOid"|"valueUuid"|"valueId"|
            "valueBoolean"|"valueCode"|"valueMarkdown"|"valueBase64Binary"|
            "valueCoding"|"valueCodeableConcept"|"valueAttachment"|
            "valueIdentifier"|"valueQuantity"|"valueSampledData"|"valueRange"|
            "valuePeriod"|"valueRatio"|"valueHumanName"|"valueAddress"|
            "valueContactPoint"|"valueTiming"|"valueReference"|"valueAnnotation"|
            "valueSignature"|"valueMeta";

        interface Element {
            id?: id;
            extension?: Array<Extension<valueX>>;
        }

        interface Extension<T = "valueX"> extends Element {
            /**
             * identifies the meaning of the extension
             */
            url: uri;

            [T: string]: any;
        }

        interface CapabilityStatement {
            resourceType: string;
            fhirVersion: string;
            rest: Array<{
                security?: {
                    cors?: boolean;
                    extension?: Array<{
                        url: string;
                        extension: Array<Extension<"valueUri">>
                    }>
                };
                resource: Array<{
                    type: string
                }>
            }>;
        }

        interface Resource extends Record<string, any> {
            /**
             * Logical id of this artifact
             */
            id ?: id;

            resourceType?: string;

            /**
             * Metadata about the resource
             */
            meta ?: Meta;

            /**
             * A set of rules under which this content was created
             */
            implicitRules ?: uri;

            /**
             * Language of the resource content
             */
            language ?: code;
        }

        interface Meta extends Element {

            /**
             * When the resource version last changed
             */
            lastUpdated: instant;
        }

        interface Observation extends Resource {
            resourceType: "Observation";
        }

        interface Patient extends Resource {
            resourceType: "Patient";
        }

        interface Practitioner extends Resource {
            resourceType: "Practitioner";
        }

        interface RelatedPerson extends Resource {
            resourceType: "RelatedPerson";
        }

        interface Encounter extends Resource {
            resourceType: "Encounter";
        }

        interface Period extends Element {
            /**
             * Starting time with inclusive boundary
             */
            start ?: dateTime;

            /**
             * End time with inclusive boundary, if not ongoing
             */
            end ?: dateTime;
        }

        interface BackboneElement extends Element {
            modifierExtension ?: Extension[];
        }

        interface CodeableConcept extends Element {
            /**
             * Code defined by a terminology system
             */
            coding?: Coding[];

            /**
             * Plain text representation of the concept
             */
            text?: string;
        }

        interface Coding extends Element {
            /**
             * Identity of the terminology system
             */
            system ?: uri;

            /**
             * Version of the system - if relevant
             */
            version ?: string;

            /**
             * Symbol in syntax defined by the system
             */
            code ?: code;

            /**
             * Representation defined by the system
             */
            display ?: string;

            /**
             * If this coding was chosen directly by the user
             */
            userSelected ?: boolean;
        }

        interface Identifier extends Element {
            use ?: "usual" | "official" | "temp" | "secondary";
            /**
             * Description of identifier
             */
            type ?: CodeableConcept;

            /**
             * The namespace for the identifier value
             */
            system ?: uri;

            /**
             * The value that is unique
             */
            value ?: string;

            /**
             * Time period when id is/was valid for use
             */
            period ?: Period;

            /**
             * Organization that issued id (may be just text)
             */
            assigner ?: Reference;
        }

        interface Reference extends Element {

            /**
             * Literal reference, Relative, internal or absolute URL
             */
            reference ?: string;

            /**
             * Logical reference, when literal reference is not known
             */
            identifier ?: Identifier;

            /**
             * Text alternative for the resource
             */
            display ?: string;
        }

        interface BundleLink extends BackboneElement {
            relation: string;
            url: uri;
        }

        interface BundleEntry extends BackboneElement {
            fullUrl: string; // This is optional on POSTs
            resource: Resource;
        }

        interface Bundle extends Resource {
            /**
             * Persistent identifier for the bundle
             */
            identifier ?: Identifier;

            type: "document" | "message" | "transaction" | "transaction-response"
                | "batch" | "batch-response" | "history" | "searchset" | "collection";

            total ?: unsignedInt;

            link: BundleLink[];
            entry?: BundleEntry[];
        }
    }
}
