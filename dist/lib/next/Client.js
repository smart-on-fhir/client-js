"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strings_1 = __importDefault(require("./strings"));
const settings_1 = require("./settings");
const settings_2 = require("../settings");
const isomorphic_1 = require("./isomorphic");
/**
 * Adds patient context to requestOptions object to be used with [[Client.request]]
 * @param requestOptions Can be a string URL (relative to the serviceUrl), or an
 * object which will be passed to fetch()
 * @param client Current FHIR client object containing patient context
 * @return requestOptions object contextualized to current patient
 */
async function contextualize(requestOptions, client) {
    const base = (0, isomorphic_1.absolute)("/", client.state.serverUrl);
    async function contextualURL(_url) {
        const resourceType = _url.pathname.split("/").pop();
        (0, isomorphic_1.assert)(resourceType, `Invalid url "${_url}"`);
        (0, isomorphic_1.assert)(settings_2.patientCompartment.indexOf(resourceType) > -1, `Cannot filter "${resourceType}" resources by patient`);
        const conformance = await (0, isomorphic_1.fetchConformanceStatement)(client.state.serverUrl);
        const searchParam = (0, isomorphic_1.getPatientParam)(conformance, resourceType);
        _url.searchParams.set(searchParam, client.patient.id);
        return _url.href;
    }
    if (typeof requestOptions == "string" || requestOptions instanceof URL) {
        return { url: await contextualURL(new URL(requestOptions + "", base)) };
    }
    requestOptions.url = await contextualURL(new URL(requestOptions.url + "", base));
    return requestOptions;
}
/**
 * Gets single reference by id. Caches the result.
 * @param refId
 * @param cache A map to store the resolved refs
 * @param client The client instance
 * @param requestOptions Only signal and headers are currently used if provided
 * @returns The resolved reference
 * @private
 */
async function getRef(refId, cache, client, requestOptions) {
    if (!cache[refId]) {
        const { signal, headers } = requestOptions;
        // Note that we set cache[refId] immediately! When the promise is
        // settled it will be updated. This is to avoid a ref being fetched
        // twice because some of these requests are executed in parallel.
        cache[refId] = client.request({
            url: refId,
            headers,
            signal
        }).then(res => {
            cache[refId] = res;
            return res;
        }, (error) => {
            delete cache[refId];
            throw error;
        });
    }
    return cache[refId];
}
/**
 * Resolves a reference in the given resource.
 * @param obj FHIR Resource
 */
function resolveRef(obj, path, graph, cache, client, requestOptions) {
    const node = (0, isomorphic_1.getPath)(obj, path);
    if (node) {
        const isArray = Array.isArray(node);
        return Promise.all((0, isomorphic_1.makeArray)(node).filter(Boolean).map((item, i) => {
            const ref = item.reference;
            if (ref) {
                return getRef(ref, cache, client, requestOptions).then(sub => {
                    if (graph) {
                        if (isArray) {
                            if (path.indexOf("..") > -1) {
                                (0, isomorphic_1.setPath)(obj, `${path.replace("..", `.${i}.`)}`, sub);
                            }
                            else {
                                (0, isomorphic_1.setPath)(obj, `${path}.${i}`, sub);
                            }
                        }
                        else {
                            (0, isomorphic_1.setPath)(obj, path, sub);
                        }
                    }
                }).catch((ex) => {
                    /* ignore missing references */
                    if (ex.status !== 404) {
                        throw ex;
                    }
                });
            }
        }));
    }
}
/**
 * Given a resource and a list of ref paths - resolves them all
 * @param obj FHIR Resource
 * @param fhirOptions The fhir options of the initiating request call
 * @param cache A map to store fetched refs
 * @param client The client instance
 * @private
 */
function resolveRefs(obj, fhirOptions, cache, client, requestOptions) {
    // 1. Sanitize paths, remove any invalid ones
    let paths = (0, isomorphic_1.makeArray)(fhirOptions.resolveReferences)
        .filter(Boolean) // No false, 0, null, undefined or ""
        .map(path => String(path).trim())
        .filter(Boolean); // No space-only strings
    // 2. Remove duplicates
    paths = paths.filter((p, i) => {
        const index = paths.indexOf(p, i + 1);
        if (index > -1) {
            (0, isomorphic_1.debug)("client: Duplicated reference path \"%s\"", p);
            return false;
        }
        return true;
    });
    // 3. Early exit if no valid paths are found
    if (!paths.length) {
        return Promise.resolve();
    }
    // 4. Group the paths by depth so that child refs are looked up
    // after their parents!
    const groups = {};
    paths.forEach(path => {
        const len = path.split(".").length;
        if (!groups[len]) {
            groups[len] = [];
        }
        groups[len].push(path);
    });
    // 5. Execute groups sequentially! Paths within same group are
    // fetched in parallel!
    let task = Promise.resolve();
    Object.keys(groups).sort().forEach(len => {
        const group = groups[len];
        task = task.then(() => Promise.all(group.map((path) => {
            return resolveRef(obj, path, !!fhirOptions.graph, cache, client, requestOptions);
        })));
    });
    return task;
}
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
class Client {
    /**
     * Validates the parameters and creates an instance.
     */
    constructor(state, storage) {
        const _state = typeof state == "string" ? { serverUrl: state } : state;
        // Valid serverUrl is required!
        (0, isomorphic_1.assert)(_state.serverUrl && _state.serverUrl.match(/https?:\/\/.+/), "A \"serverUrl\" option is required and must begin with \"http(s)\"");
        this.storage = storage;
        this.state = _state;
        this._refreshTask = null;
        const client = this;
        // patient api ---------------------------------------------------------
        this.patient = {
            get id() { return client.getPatientId(); },
            read: (requestOptions) => {
                const id = this.patient.id;
                return id ?
                    this.request({ ...requestOptions, url: `Patient/${id}` }) :
                    Promise.reject(new Error("Patient is not available"));
            },
            request: (requestOptions, fhirOptions = {}) => {
                if (this.patient.id) {
                    return (async () => {
                        const options = await contextualize(requestOptions, this);
                        return this.request(options, fhirOptions);
                    })();
                }
                else {
                    return Promise.reject(new Error("Patient is not available"));
                }
            }
        };
        // encounter api -------------------------------------------------------
        this.encounter = {
            get id() { return client.getEncounterId(); },
            read: requestOptions => {
                const id = this.encounter.id;
                return id ?
                    this.request({ ...requestOptions, url: `Encounter/${id}` }) :
                    Promise.reject(new Error("Encounter is not available"));
            }
        };
        // user api ------------------------------------------------------------
        this.user = {
            get fhirUser() { return client.getFhirUser(); },
            get id() { return client.getUserId(); },
            get resourceType() { return client.getUserType(); },
            read: requestOptions => {
                const fhirUser = this.user.fhirUser;
                return fhirUser ?
                    this.request({ ...requestOptions, url: fhirUser }) :
                    Promise.reject(new Error("User is not available"));
            }
        };
    }
    getPatientId() {
        const tokenResponse = this.state.tokenResponse;
        if (tokenResponse) {
            // We have been authorized against this server but we don't know
            // the patient. This should be a scope issue.
            if (!tokenResponse.patient) {
                if (!(this.state.scope || "").match(/\blaunch(\/patient)?\b/)) {
                    (0, isomorphic_1.debug)("client: " + strings_1.default.noScopeForId, "patient", "patient");
                }
                else {
                    // The server should have returned the patient!
                    (0, isomorphic_1.debug)("client: The ID of the selected patient is not available. Please check if your server supports that.");
                }
                return null;
            }
            return tokenResponse.patient;
        }
        if (this.state.authorizeUri) {
            (0, isomorphic_1.debug)("client: " + strings_1.default.noIfNoAuth, "the ID of the selected patient");
        }
        else {
            (0, isomorphic_1.debug)("client: " + strings_1.default.noFreeContext, "selected patient");
        }
        return null;
    }
    getEncounterId() {
        const tokenResponse = this.state.tokenResponse;
        if (tokenResponse) {
            // We have been authorized against this server but we don't know
            // the encounter. This should be a scope issue.
            if (!tokenResponse.encounter) {
                if (!(this.state.scope || "").match(/\blaunch(\/encounter)?\b/)) {
                    (0, isomorphic_1.debug)("client: " + strings_1.default.noScopeForId, "encounter", "encounter");
                }
                else {
                    // The server should have returned the encounter!
                    (0, isomorphic_1.debug)("client: The ID of the selected encounter is not available. Please check if your server supports that, and that the selected patient has any recorded encounters.");
                }
                return null;
            }
            return tokenResponse.encounter;
        }
        if (this.state.authorizeUri) {
            (0, isomorphic_1.debug)("client: " + strings_1.default.noIfNoAuth, "the ID of the selected encounter");
        }
        else {
            (0, isomorphic_1.debug)("client: " + strings_1.default.noFreeContext, "selected encounter");
        }
        return null;
    }
    getIdToken() {
        const tokenResponse = this.state.tokenResponse;
        if (tokenResponse) {
            const idToken = tokenResponse.id_token;
            const scope = this.state.scope || "";
            // We have been authorized against this server but we don't have
            // the id_token. This should be a scope issue.
            if (!idToken) {
                const hasOpenid = scope.match(/\bopenid\b/);
                const hasProfile = scope.match(/\bprofile\b/);
                const hasFhirUser = scope.match(/\bfhirUser\b/);
                if (!hasOpenid || !(hasFhirUser || hasProfile)) {
                    (0, isomorphic_1.debug)("client: You are trying to get the id_token but you are not " +
                        "using the right scopes. Please add 'openid' and " +
                        "'fhirUser' or 'profile' to the scopes you are " +
                        "requesting.");
                }
                else {
                    // The server should have returned the id_token!
                    (0, isomorphic_1.debug)("client: The id_token is not available. Please check if your server supports that.");
                }
                return null;
            }
            return (0, isomorphic_1.jwtDecode)(idToken);
        }
        if (this.state.authorizeUri) {
            (0, isomorphic_1.debug)("client: " + strings_1.default.noIfNoAuth, "the id_token");
        }
        else {
            (0, isomorphic_1.debug)("client: " + strings_1.default.noFreeContext, "id_token");
        }
        return null;
    }
    getFhirUser() {
        const idToken = this.getIdToken();
        if (idToken) {
            // Epic may return a full url
            // @see https://github.com/smart-on-fhir/client-js/issues/105
            if (idToken.fhirUser) {
                return idToken.fhirUser.split("/").slice(-2).join("/");
            }
            return idToken.profile;
        }
        return null;
    }
    getUserId() {
        const profile = this.getFhirUser();
        if (profile) {
            return profile.split("/")[1];
        }
        return null;
    }
    getUserType() {
        const profile = this.getFhirUser();
        if (profile) {
            return profile.split("/")[0];
        }
        return null;
    }
    getAuthorizationHeader() {
        const accessToken = this.getState("tokenResponse.access_token");
        if (accessToken) {
            return "Bearer " + accessToken;
        }
        const { username, password } = this.state;
        if (username && password) {
            return "Basic " + (0, isomorphic_1.base64encode)(username + ":" + password);
        }
        return null;
    }
    /**
     * Used internally to clear the state of the instance and the state in the
     * associated storage.
     */
    async _clearState() {
        const key = await this.storage.get("SMART_KEY");
        if (key) {
            await this.storage.unset(key);
        }
        await this.storage.unset("SMART_KEY");
        this.state.tokenResponse = {};
    }
    create(resource, requestOptions) {
        return this.request({
            ...requestOptions,
            url: `${resource.resourceType}`,
            method: "POST",
            body: JSON.stringify(resource),
            headers: {
                // TODO: Do we need to alternate with "application/json+fhir"?
                "content-type": "application/json",
                ...(requestOptions || {}).headers
            }
        });
    }
    update(resource, requestOptions) {
        return this.request({
            ...requestOptions,
            url: `${resource.resourceType}/${resource.id}`,
            method: "PUT",
            body: JSON.stringify(resource),
            headers: {
                // TODO: Do we need to alternate with "application/json+fhir"?
                "content-type": "application/json",
                ...(requestOptions || {}).headers
            }
        });
    }
    delete(url, requestOptions = {}) {
        return this.request({
            ...requestOptions,
            url,
            method: "DELETE"
        });
    }
    patch(url, patch, requestOptions = {}) {
        (0, isomorphic_1.assertJsonPatch)(patch);
        return this.request({
            ...requestOptions,
            url,
            method: "PATCH",
            body: JSON.stringify(patch),
            headers: {
                "prefer": "return=presentation",
                "content-type": "application/json-patch+json; charset=UTF-8",
                ...requestOptions.headers,
            }
        });
    }
    async request(requestOptions, fhirOptions = {}, _resolvedRefs = {}) {
        var _a;
        (0, isomorphic_1.assert)(requestOptions, "request requires an url or request options as argument");
        // url -----------------------------------------------------------------
        let url;
        if (typeof requestOptions == "string" || requestOptions instanceof URL) {
            url = String(requestOptions);
            requestOptions = {};
        }
        else {
            url = String(requestOptions.url);
        }
        url = (0, isomorphic_1.absolute)(url, this.state.serverUrl);
        const options = {
            graph: fhirOptions.graph !== false,
            flat: !!fhirOptions.flat,
            pageLimit: (_a = fhirOptions.pageLimit) !== null && _a !== void 0 ? _a : 1,
            resolveReferences: (fhirOptions.resolveReferences || []),
            useRefreshToken: fhirOptions.useRefreshToken !== false,
            onPage: typeof fhirOptions.onPage == "function" ?
                fhirOptions.onPage :
                undefined
        };
        const signal = requestOptions.signal || undefined;
        // Refresh the access token if needed
        const job = options.useRefreshToken ?
            this.refreshIfNeeded({ signal }).then(() => requestOptions) :
            Promise.resolve(requestOptions);
        let response;
        return job
            // Add the Authorization header now, after the access token might
            // have been updated
            .then(requestOptions => {
            const authHeader = this.getAuthorizationHeader();
            if (authHeader) {
                requestOptions.headers = {
                    ...requestOptions.headers,
                    authorization: authHeader
                };
            }
            return requestOptions;
        })
            // Make the request
            .then(requestOptions => {
            (0, isomorphic_1.debug)("client:request: %s, options: %O, fhirOptions: %O", url, requestOptions, options);
            return (0, isomorphic_1.request)(url, requestOptions).then(result => {
                if (requestOptions.includeResponse) {
                    response = result.response;
                    return result.body;
                }
                return result;
            });
        })
            // Handle 401 ------------------------------------------------------
            .catch(async (error) => {
            if (error.status == 401) {
                // !accessToken -> not authorized -> No session. Need to launch.
                if (!this.getState("tokenResponse.access_token")) {
                    error.message += "\nThis app cannot be accessed directly. Please launch it as SMART app!";
                    throw error;
                }
                // auto-refresh not enabled and Session expired.
                // Need to re-launch. Clear state to start over!
                if (!options.useRefreshToken) {
                    (0, isomorphic_1.debug)("client:request: Your session has expired and the useRefreshToken option is set to false. Please re-launch the app.");
                    await this._clearState();
                    error.message += "\n" + strings_1.default.expired;
                    throw error;
                }
                // In rare cases we may have a valid access token and a refresh
                // token and the request might still fail with 401 just because
                // the access token has just been revoked.
                // otherwise -> auto-refresh failed. Session expired.
                // Need to re-launch. Clear state to start over!
                (0, isomorphic_1.debug)("client:request: Auto-refresh failed! Please re-launch the app.");
                await this._clearState();
                error.message += "\n" + strings_1.default.expired;
                throw error;
            }
            throw error;
        })
            // Handle 403 ------------------------------------------------------
            .catch((error) => {
            if (error.status == 403) {
                (0, isomorphic_1.debug)("client:request: Permission denied! Please make sure that you have requested the proper scopes.");
            }
            throw error;
        })
            .then((data) => {
            // At this point we don't know what `data` actually is!
            // We might get an empty or falsy result. If so return it as is
            // Also handle raw responses
            if (!data || typeof data == "string" || data instanceof Response) {
                if (requestOptions.includeResponse) {
                    return {
                        body: data,
                        response
                    };
                }
                return data;
            }
            // Resolve References ------------------------------------------
            return (async (_data) => {
                if (_data.resourceType == "Bundle") {
                    await Promise.all((_data.entry || []).map(item => resolveRefs(item.resource, options, _resolvedRefs, this, requestOptions)));
                }
                else {
                    await resolveRefs(_data, options, _resolvedRefs, this, requestOptions);
                }
                return _data;
            })(data)
                // Pagination ----------------------------------------------
                .then(async (_data) => {
                if (_data && _data.resourceType == "Bundle") {
                    const links = (_data.link || []);
                    if (options.flat) {
                        _data = (_data.entry || []).map((entry) => entry.resource);
                    }
                    if (options.onPage) {
                        await options.onPage(_data, { ..._resolvedRefs });
                    }
                    if (--options.pageLimit) {
                        const next = links.find(l => l.relation == "next");
                        _data = (0, isomorphic_1.makeArray)(_data);
                        if (next && next.url) {
                            const nextPage = await this.request({
                                url: next.url,
                                // Aborting the main request (even after it is complete)
                                // must propagate to any child requests and abort them!
                                // To do so, just pass the same AbortSignal if one is
                                // provided.
                                signal
                            }, options, _resolvedRefs);
                            if (options.onPage) {
                                return null;
                            }
                            if (options.resolveReferences.length) {
                                Object.assign(_resolvedRefs, nextPage.references);
                                return _data.concat((0, isomorphic_1.makeArray)(nextPage.data || nextPage));
                            }
                            return _data.concat((0, isomorphic_1.makeArray)(nextPage));
                        }
                    }
                }
                return _data;
            })
                // Finalize ------------------------------------------------
                .then(_data => {
                if (options.graph) {
                    _resolvedRefs = {};
                }
                else if (!options.onPage && options.resolveReferences.length) {
                    return {
                        data: _data,
                        references: _resolvedRefs
                    };
                }
                return _data;
            })
                .then(_data => {
                if (requestOptions.includeResponse) {
                    return {
                        body: _data,
                        response
                    };
                }
                return _data;
            });
        });
    }
    refreshIfNeeded(requestOptions = {}) {
        const accessToken = this.getState("tokenResponse.access_token");
        const refreshToken = this.getState("tokenResponse.refresh_token");
        const expiresAt = this.state.expiresAt || 0;
        if (accessToken && refreshToken && expiresAt - 10 < Date.now() / 1000) {
            return this.refresh(requestOptions);
        }
        return Promise.resolve(this.state);
    }
    refresh(requestOptions = {}) {
        var _a, _b;
        (0, isomorphic_1.debug)("client:refresh: Attempting to refresh with refresh_token...");
        const refreshToken = (_b = (_a = this.state) === null || _a === void 0 ? void 0 : _a.tokenResponse) === null || _b === void 0 ? void 0 : _b.refresh_token;
        (0, isomorphic_1.assert)(refreshToken, "Unable to refresh. No refresh_token found.");
        const tokenUri = this.state.tokenUri;
        (0, isomorphic_1.assert)(tokenUri, "Unable to refresh. No tokenUri found.");
        const scopes = this.getState("tokenResponse.scope") || "";
        const hasOfflineAccess = scopes.search(/\boffline_access\b/) > -1;
        const hasOnlineAccess = scopes.search(/\bonline_access\b/) > -1;
        (0, isomorphic_1.assert)(hasOfflineAccess || hasOnlineAccess, "Unable to refresh. No offline_access or online_access scope found.");
        // This method is typically called internally from `request` if certain
        // request fails with 401. However, clients will often run multiple
        // requests in parallel which may result in multiple refresh calls.
        // To avoid that, we keep a reference to the current refresh task (if any).
        if (!this._refreshTask) {
            const refreshRequestOptions = {
                credentials: this.state.refreshTokenWithCredentials || "same-origin",
                ...requestOptions,
                method: "POST",
                mode: "cors",
                headers: {
                    ...(requestOptions.headers || {}),
                    "content-type": "application/x-www-form-urlencoded"
                },
                body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(refreshToken)}`
            };
            // custom authorization header can be passed on manual calls
            if (!("authorization" in refreshRequestOptions.headers)) {
                const { clientSecret, clientId } = this.state;
                if (clientSecret) {
                    // @ts-ignore
                    refreshRequestOptions.headers.authorization = "Basic " + (0, isomorphic_1.base64encode)(clientId + ":" + clientSecret);
                }
            }
            this._refreshTask = (0, isomorphic_1.request)(tokenUri, refreshRequestOptions)
                .then(data => {
                (0, isomorphic_1.assert)(data.access_token, "No access token received");
                (0, isomorphic_1.debug)("client:refresh: Received new access token response %O", data);
                this.state.tokenResponse = { ...this.state.tokenResponse, ...data };
                this.state.expiresAt = (0, isomorphic_1.getAccessTokenExpiration)(data);
                return this.state;
            })
                .catch((error) => {
                var _a, _b;
                if ((_b = (_a = this.state) === null || _a === void 0 ? void 0 : _a.tokenResponse) === null || _b === void 0 ? void 0 : _b.refresh_token) {
                    (0, isomorphic_1.debug)("client:refresh: Deleting the expired or invalid refresh token.");
                    delete this.state.tokenResponse.refresh_token;
                }
                throw error;
            })
                .finally(() => {
                this._refreshTask = null;
                const key = this.state.key;
                if (key) {
                    return this.storage.set(key, this.state);
                }
                else {
                    (0, isomorphic_1.debug)("client:refresh: No 'key' found in Clint.state. Cannot persist the instance.");
                }
            });
        }
        return this._refreshTask;
    }
    // utils -------------------------------------------------------------------
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
    getPath(obj, path = "") {
        return (0, isomorphic_1.getPath)(obj, path);
    }
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
    getState(path = "") {
        return (0, isomorphic_1.getPath)({ ...this.state }, path);
    }
    /**
     * Returns a promise that will be resolved with the fhir version as defined
     * in the CapabilityStatement.
     */
    getFhirVersion() {
        return (0, isomorphic_1.fetchConformanceStatement)(this.state.serverUrl)
            .then((metadata) => metadata.fhirVersion);
    }
    /**
     * Returns a promise that will be resolved with the numeric fhir version
     * - 2 for DSTU2
     * - 3 for STU3
     * - 4 for R4
     * - 0 if the version is not known
     */
    getFhirRelease() {
        return this.getFhirVersion().then(v => { var _a; return (_a = settings_1.fhirVersions[v]) !== null && _a !== void 0 ? _a : 0; });
    }
}
exports.default = Client;
