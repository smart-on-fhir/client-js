import { fhirclient } from ".";
import Client from "./Client";
/**
 * Starts the SMART Launch Sequence.
 * > **IMPORTANT**:
 *   `authorize()` will end up redirecting you to the authorization server.
 *    This means that you should not add anything to the returned promise chain.
 *    Any code written directly after the authorize() call might not be executed
 *    due to that redirect!
 * @param env
 * @param [params]
 */
export declare function authorize(env: fhirclient.Adapter, params?: fhirclient.AuthorizeParams | fhirclient.AuthorizeParams[]): Promise<string | void>;
/**
 * The ready function should only be called on the page that represents
 * the redirectUri. We typically land there after a redirect from the
 * authorization server, but this code will also be executed upon subsequent
 * navigation or page refresh.
 */
export declare function ready(env: fhirclient.Adapter, options?: fhirclient.ReadyOptions): Promise<Client>;
/**
 * Builds the token request options. Does not make the request, just
 * creates it's configuration and returns it in a Promise.
 */
export declare function buildTokenRequest(env: fhirclient.Adapter, { code, state, clientPublicKeySetUrl, privateKey }: {
    /**
     * The `code` URL parameter received from the auth redirect
     */
    code: string;
    /**
     * The app state
     */
    state: fhirclient.ClientState;
    /**
     * If provided overrides the `clientPublicKeySetUrl` from the authorize
     * options (if any). Used for `jku` token header in case of asymmetric auth.
     */
    clientPublicKeySetUrl?: string;
    /**
     * Can be a private JWK, or an object with alg, kid and key properties,
     * where `key` is an un-extractable private CryptoKey object.
     */
    privateKey?: fhirclient.JWK | {
        key: CryptoKey;
        alg: "RS384" | "ES384";
        kid: string;
    };
}): Promise<RequestInit>;
/**
 * This function can be used when you want to handle everything in one page
 * (no launch endpoint needed). You can think of it as if it does:
 * ```js
 * authorize(options).then(ready)
 * ```
 *
 * **Be careful with init()!** There are some details you need to be aware of:
 *
 * 1. It will only work if your launch_uri is the same as your redirect_uri.
 *    While this should be valid, we can’t promise that every EHR will allow you
 *    to register client with such settings.
 * 2. Internally, `init()` will be called twice. First it will redirect to the
 *    EHR, then the EHR will redirect back to the page where init() will be
 *    called again to complete the authorization. This is generally fine,
 *    because the returned promise will only be resolved once, after the second
 *    execution, but please also consider the following:
 *    - You should wrap all your app’s code in a function that is only executed
 *      after `init()` resolves!
 *    - Since the page will be loaded twice, you must be careful if your code
 *      has global side effects that can persist between page reloads
 *      (for example writing to localStorage).
 * 3. For standalone launch, only use init in combination with offline_access
 *    scope. Once the access_token expires, if you don’t have a refresh_token
 *    there is no way to re-authorize properly. We detect that and delete the
 *    expired access token, but it still means that the user will have to
 *    refresh the page twice to re-authorize.
 * @param env The adapter
 * @param authorizeOptions The authorize options
 * @param [readyOptions]
 */
export declare function init(env: fhirclient.Adapter, authorizeOptions: fhirclient.AuthorizeParams, readyOptions?: fhirclient.ReadyOptions): Promise<Client | never>;