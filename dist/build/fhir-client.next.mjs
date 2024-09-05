// This map contains reusable debug messages (only those used in multiple places)
var str = {
    expired: "Session expired! Please re-launch the app",
    noScopeForId: "Trying to get the ID of the selected %s. Please add 'launch' or 'launch/%s' to the requested scopes and try again.",
    noIfNoAuth: "You are trying to get %s but the app is not authorized yet.",
    noFreeContext: "Please don't use open fhir servers if you need to access launch context items like the %S."
};

/**
 * Combined list of FHIR resource types accepting patient parameter in FHIR R2-R4
 */
/**
 * Map of FHIR releases and their abstract version as number
 */
const fhirVersions = {
    "0.4.0": 2,
    "0.5.0": 2,
    "1.0.0": 2,
    "1.0.1": 2,
    "1.0.2": 2,
    "1.1.0": 3,
    "1.4.0": 3,
    "1.6.0": 3,
    "1.8.0": 3,
    "3.0.0": 3,
    "3.0.1": 3,
    "3.3.0": 4,
    "3.5.0": 4,
    "4.0.0": 4,
    "4.0.1": 4
};
/**
 * The name of the sessionStorage entry that contains the current key
 */
const SMART_KEY = "SMART_KEY";

/**
 * Combined list of FHIR resource types accepting patient parameter in FHIR R2-R4
 */
const patientCompartment = [
    "Account",
    "AdverseEvent",
    "AllergyIntolerance",
    "Appointment",
    "AppointmentResponse",
    "AuditEvent",
    "Basic",
    "BodySite",
    "BodyStructure",
    "CarePlan",
    "CareTeam",
    "ChargeItem",
    "Claim",
    "ClaimResponse",
    "ClinicalImpression",
    "Communication",
    "CommunicationRequest",
    "Composition",
    "Condition",
    "Consent",
    "Coverage",
    "CoverageEligibilityRequest",
    "CoverageEligibilityResponse",
    "DetectedIssue",
    "DeviceRequest",
    "DeviceUseRequest",
    "DeviceUseStatement",
    "DiagnosticOrder",
    "DiagnosticReport",
    "DocumentManifest",
    "DocumentReference",
    "EligibilityRequest",
    "Encounter",
    "EnrollmentRequest",
    "EpisodeOfCare",
    "ExplanationOfBenefit",
    "FamilyMemberHistory",
    "Flag",
    "Goal",
    "Group",
    "ImagingManifest",
    "ImagingObjectSelection",
    "ImagingStudy",
    "Immunization",
    "ImmunizationEvaluation",
    "ImmunizationRecommendation",
    "Invoice",
    "List",
    "MeasureReport",
    "Media",
    "MedicationAdministration",
    "MedicationDispense",
    "MedicationOrder",
    "MedicationRequest",
    "MedicationStatement",
    "MolecularSequence",
    "NutritionOrder",
    "Observation",
    "Order",
    "Patient",
    "Person",
    "Procedure",
    "ProcedureRequest",
    "Provenance",
    "QuestionnaireResponse",
    "ReferralRequest",
    "RelatedPerson",
    "RequestGroup",
    "ResearchSubject",
    "RiskAssessment",
    "Schedule",
    "ServiceRequest",
    "Specimen",
    "SupplyDelivery",
    "SupplyRequest",
    "VisionPrescription"
];
/**
 * Combined (FHIR R2-R4) list of search parameters that can be used to scope
 * a request by patient ID.
 */
const patientParams = [
    "patient",
    "subject",
    "requester",
    "member",
    "actor",
    "beneficiary"
];

class HttpError extends Error {
    constructor(response) {
        super(`${response.status} ${response.statusText}\nURL: ${response.url}`);
        this.name = "HttpError";
        this.response = response;
        this.statusCode = response.status;
        this.status = response.status;
        this.statusText = response.statusText;
    }
    async parse() {
        if (!this.response.bodyUsed) {
            try {
                const type = this.response.headers.get("content-type") || "text/plain";
                if (type.match(/\bjson\b/i)) {
                    let body = await this.response.json();
                    if (body.error) {
                        this.message += "\n" + body.error;
                        if (body.error_description) {
                            this.message += ": " + body.error_description;
                        }
                    }
                    else {
                        this.message += "\n\n" + JSON.stringify(body, null, 4);
                    }
                }
                else if (type.match(/^text\//i)) {
                    let body = await this.response.text();
                    if (body) {
                        this.message += "\n\n" + body;
                    }
                }
            }
            catch { }
        }
        return this;
    }
    toJSON() {
        return {
            name: this.name,
            statusCode: this.statusCode,
            status: this.status,
            statusText: this.statusText,
            message: this.message
        };
    }
}

const debug = typeof window === "undefined" ?
    (process.env.NODE_DEBUG || "").match(/\bdebugFhirClient\b/) ?
        (...args) => console.debug("FHIR:", ...args) :
        () => { } :
    (localStorage === null || localStorage === void 0 ? void 0 : localStorage.debugFhirClient) ?
        (...args) => console.debug("FHIR:", ...args) :
        () => { };
/**
 * The cache for the `getAndCache` function
 */
const cache = {};
/**
 * Used in fetch Promise chains to reject if the "ok" property is not true
 */
async function checkResponse(resp) {
    if (!resp.ok) {
        const error = new HttpError(resp);
        await error.parse();
        throw error;
    }
    return resp;
}
/**
 * Used in fetch Promise chains to return the JSON version of the response.
 * Note that `resp.json()` will throw on empty body so we use resp.text()
 * instead.
 */
function responseToJSON(resp) {
    return resp.text().then(text => text.length ? JSON.parse(text) : "");
}
function loweCaseKeys(obj) {
    // Can be undefined to signal that this key should be removed
    if (!obj) {
        return obj;
    }
    // Arrays are valid values in case of recursive calls
    if (Array.isArray(obj)) {
        return obj.map(v => v && typeof v === "object" ? loweCaseKeys(v) : v);
    }
    // Plain object
    let out = {};
    Object.keys(obj).forEach(key => {
        const lowerKey = key.toLowerCase();
        const v = obj[key];
        out[lowerKey] = v && typeof v == "object" ? loweCaseKeys(v) : v;
    });
    return out;
}
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
async function request(url, requestOptions = {}) {
    const { includeResponse, ...options } = requestOptions;
    const response = await fetch(url, {
        mode: "cors",
        ...options,
        headers: {
            accept: "application/json",
            ...loweCaseKeys(options.headers)
        }
    });
    await checkResponse(response);
    const type = response.headers.get("content-type") + "";
    let body;
    if (type.match(/\bjson\b/i)) {
        body = await responseToJSON(response);
    }
    else if (type.match(/^text\//i)) {
        body = await response.text();
    }
    // Some servers will reply after CREATE with json content type but with
    // empty body. In this case check if a location header is received and
    // fetch that to use it as the final result.
    if (!body && response.status == 201) {
        const location = response.headers.get("location");
        if (location) {
            return request(location, { ...options, method: "GET", body: null, includeResponse });
        }
    }
    if (includeResponse) {
        return { body, response };
    }
    // For any non-text and non-json response return the Response object.
    // This to let users decide if they want to call text(), blob() or
    // something else on it
    if (body === undefined) {
        return response;
    }
    // Otherwise just return the parsed body (can also be "" or null)
    return body;
}
/**
 * Makes a request using `fetch` and stores the result in internal memory cache.
 * The cache is cleared when the page is unloaded.
 * @param url The URL to request
 * @param requestOptions Request options
 * @param [force] If true, reload from source and update the cache, even if it
 * has already been cached.
 */
async function getAndCache(url, requestOptions, force) {
    var _a, _b;
    if (force === void 0) { force = ((_b = (_a = globalThis === null || globalThis === void 0 ? void 0 : globalThis.process) === null || _a === void 0 ? void 0 : _a.env) === null || _b === void 0 ? void 0 : _b.NODE_ENV) === "test"; }
    if (force || !cache[url]) {
        cache[url] = request(url, requestOptions);
    }
    return cache[url];
}
/**
 * Fetches the conformance statement from the given base URL.
 * Note that the result is cached in memory (until the page is reloaded in the
 * browser) because it might have to be re-used by the client
 * @param baseUrl The base URL of the FHIR server
 * @param [requestOptions] Any options passed to the fetch call
 */
function fetchConformanceStatement(baseUrl = "/", requestOptions) {
    const url = String(baseUrl).replace(/\/*$/, "/") + "metadata";
    return getAndCache(url, requestOptions).catch((ex) => {
        throw new Error(`Failed to fetch the conformance statement from "${url}". ${ex}`);
    });
}
/**
 * Walks through an object (or array) and returns the value found at the
 * provided path. This function is very simple so it intentionally does not
 * support any argument polymorphism, meaning that the path can only be a
 * dot-separated string. If the path is invalid returns undefined.
 * @param obj The object (or Array) to walk through
 * @param path The path (eg. "a.b.4.c")
 * @returns {*} Whatever is found in the path or undefined
 */
function getPath(obj, path = "") {
    path = path.trim();
    if (!path) {
        return obj;
    }
    let segments = path.split(".");
    let result = obj;
    while (result && segments.length) {
        const key = segments.shift();
        if (!key && Array.isArray(result)) {
            return result.map(o => getPath(o, segments.join(".")));
        }
        else {
            result = result[key + ""];
        }
    }
    return result;
}
/**
 * Like getPath, but if the node is found, its value is set to @value
 * @param obj The object (or Array) to walk through
 * @param path The path (eg. "a.b.4.c")
 * @param value The value to set
 * @param createEmpty If true, create missing intermediate objects or arrays
 * @returns The modified object
 */
function setPath(obj, path, value, createEmpty = false) {
    path.trim().split(".").reduce((out, key, idx, arr) => {
        if (out && idx === arr.length - 1) {
            out[key] = value;
        }
        else {
            if (out && out[key] === undefined && createEmpty) {
                out[key] = arr[idx + 1].match(/^[0-9]+$/) ? [] : {};
            }
            return out ? out[key] : undefined;
        }
    }, obj);
    return obj;
}
/**
 * If the argument is an array returns it as is. Otherwise puts it in an array
 * (`[arg]`) and returns the result
 * @param arg The element to test and possibly convert to array
 * @category Utility
 */
function makeArray(arg) {
    if (Array.isArray(arg)) {
        return arg;
    }
    return [arg];
}
/**
 * Given a path, converts it to absolute url based on the `baseUrl`. If baseUrl
 * is not provided, the result would be a rooted path (one that starts with `/`).
 * @param path The path to convert
 * @param baseUrl The base URL
 */
function absolute(path, baseUrl) {
    if (path.match(/^http/))
        return path;
    if (path.match(/^urn/))
        return path;
    return String(baseUrl || "").replace(/\/+$/, "") + "/" + path.replace(/^\/+/, "");
}
/**
 * Generates random strings. By default this returns random 8 characters long
 * alphanumeric strings.
 * @param strLength The length of the output string. Defaults to 8.
 * @param charSet A string containing all the possible characters.
 *     Defaults to all the upper and lower-case letters plus digits.
 * @category Utility
 */
function randomString(strLength = 8, charSet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789") {
    const result = [];
    const len = charSet.length;
    while (strLength--) {
        result.push(charSet.charAt(Math.floor(Math.random() * len)));
    }
    return result.join("");
}
/**
 * Add a supplied number of seconds to the supplied Date, returning an integer
 * number of seconds since the epoch
 * @param secondsAhead How far ahead, in seconds (defaults to 120 seconds)
 * @param [from] Initial time (defaults to current time)
 */
function getTimeInFuture(secondsAhead = 120, from) {
    return Math.floor(+(new Date()) / 1000 + secondsAhead);
}
/**
 * Given a conformance statement and a resource type, returns the name of the
 * URL parameter that can be used to scope the resource type by patient ID.
 */
function getPatientParam(conformance, resourceType) {
    // Find what resources are supported by this server
    const resources = getPath(conformance, "rest.0.resource") || [];
    // Check if this resource is supported
    const meta = resources.find((r) => r.type === resourceType);
    if (!meta) {
        throw new Error(`Resource "${resourceType}" is not supported by this FHIR server`);
    }
    // Check if any search parameters are available for this resource
    if (!Array.isArray(meta.searchParam)) {
        throw new Error(`No search parameters supported for "${resourceType}" on this FHIR server`);
    }
    // This is a rare case but could happen in generic workflows
    if (resourceType == "Patient" && meta.searchParam.find((x) => x.name == "_id")) {
        return "_id";
    }
    // Now find the first possible parameter name
    const out = patientParams.find(p => meta.searchParam.find((x) => x.name == p));
    // If there is no match
    if (!out) {
        throw new Error("I don't know what param to use for " + resourceType);
    }
    return out;
}
function assert(condition, message) {
    if (!(condition)) {
        throw new Error(message);
    }
}
function assertJsonPatch(patch) {
    assert(Array.isArray(patch), "The JSON patch must be an array");
    assert(patch.length > 0, "The JSON patch array should not be empty");
    patch.forEach((operation) => {
        assert(["add", "replace", "test", "move", "copy", "remove"].indexOf(operation.op) > -1, 'Each patch operation must have an "op" property which must be one of: "add", "replace", "test", "move", "copy", "remove"');
        assert(operation.path && typeof operation.path, `Invalid "${operation.op}" operation. Missing "path" property`);
        if (operation.op == "add" || operation.op == "replace" || operation.op == "test") {
            assert("value" in operation, `Invalid "${operation.op}" operation. Missing "value" property`);
            assert(Object.keys(operation).length == 3, `Invalid "${operation.op}" operation. Contains unknown properties`);
        }
        else if (operation.op == "move" || operation.op == "copy") {
            assert(typeof operation.from == "string", `Invalid "${operation.op}" operation. Requires a string "from" property`);
            assert(Object.keys(operation).length == 3, `Invalid "${operation.op}" operation. Contains unknown properties`);
        }
        else {
            assert(Object.keys(operation).length == 2, `Invalid "${operation.op}" operation. Contains unknown properties`);
        }
    });
}
/**
 * Fetches the well-known json file from the given base URL.
 * Note that the result is cached in memory (until the page is reloaded in the
 * browser) because it might have to be re-used by the client
 * @param baseUrl The base URL of the FHIR server
 */
function fetchWellKnownJson(baseUrl = "/", requestOptions) {
    const url = String(baseUrl).replace(/\/*$/, "/") + ".well-known/smart-configuration";
    return getAndCache(url, requestOptions).catch((ex) => {
        throw new Error(`Failed to fetch the well-known json "${url}". ${ex.message}`);
    });
}
/**
 * Fetch a "WellKnownJson" and extract the SMART endpoints from it
 */
function getSecurityExtensionsFromWellKnownJson(baseUrl = "/", requestOptions) {
    return fetchWellKnownJson(baseUrl, requestOptions).then(meta => {
        if (!meta.authorization_endpoint || !meta.token_endpoint) {
            throw new Error("Invalid wellKnownJson");
        }
        return {
            registrationUri: meta.registration_endpoint || "",
            authorizeUri: meta.authorization_endpoint,
            tokenUri: meta.token_endpoint,
            codeChallengeMethods: meta.code_challenge_methods_supported || []
        };
    });
}
/**
 * Fetch a `CapabilityStatement` and extract the SMART endpoints from it
 */
function getSecurityExtensionsFromConformanceStatement(baseUrl = "/", requestOptions) {
    return fetchConformanceStatement(baseUrl, requestOptions).then(meta => {
        const nsUri = "http://fhir-registry.smarthealthit.org/StructureDefinition/oauth-uris";
        const extensions = (getPath(meta || {}, "rest.0.security.extension") || [])
            .filter(e => e.url === nsUri)
            .map(o => o.extension)[0];
        const out = {
            registrationUri: "",
            authorizeUri: "",
            tokenUri: "",
            codeChallengeMethods: [],
        };
        if (extensions) {
            extensions.forEach(ext => {
                if (ext.url === "register") {
                    out.registrationUri = ext.valueUri;
                }
                if (ext.url === "authorize") {
                    out.authorizeUri = ext.valueUri;
                }
                if (ext.url === "token") {
                    out.tokenUri = ext.valueUri;
                }
            });
        }
        return out;
    });
}
/**
 * Given a FHIR server, returns an object with it's Oauth security endpoints
 * that we are interested in. This will try to find the info in both the
 * `CapabilityStatement` and the `.well-known/smart-configuration`. Whatever
 * Arrives first will be used and the other request will be aborted.
 * @param [baseUrl = "/"] Fhir server base URL
 */
function getSecurityExtensions(baseUrl = "/") {
    return getSecurityExtensionsFromWellKnownJson(baseUrl)
        .catch(() => getSecurityExtensionsFromConformanceStatement(baseUrl));
}
function base64encode(input) {
    try {
        return Buffer.from(input, "utf8").toString('base64');
    }
    catch {
        return btoa(input);
    }
}
function base64decode(input) {
    try {
        return Buffer.from(input, "base64").toString('utf8');
    }
    catch {
        return btoa(input);
    }
}
function shouldIncludeChallenge(S256supported, pkceMode) {
    if (pkceMode === "disabled") {
        return false;
    }
    if (pkceMode === "unsafeV1") {
        return true;
    }
    if (pkceMode === "required") {
        if (!S256supported) {
            throw new Error("Required PKCE code challenge method (`S256`) was not found in the server's codeChallengeMethods declaration.");
        }
        return true;
    }
    return S256supported;
}
/**
 * Decodes a JWT token and returns it's body.
 * @param token The token to read
 * @category Utility
 */
function jwtDecode(token) {
    const payload = token.split(".")[1];
    return payload ? JSON.parse(base64decode(payload)) : null;
}
/**
 * Given a token response, computes and returns the expiresAt timestamp.
 * Note that this should only be used immediately after an access token is
 * received, otherwise the computed timestamp will be incorrect.
 * @param tokenResponse
 */
function getAccessTokenExpiration(tokenResponse) {
    const now = Math.floor(Date.now() / 1000);
    // Option 1 - using the expires_in property of the token response
    if (tokenResponse.expires_in) {
        return now + tokenResponse.expires_in;
    }
    // Option 2 - using the exp property of JWT tokens (must not assume JWT!)
    if (tokenResponse.access_token) {
        let tokenBody = jwtDecode(tokenResponse.access_token);
        if (tokenBody && tokenBody.exp) {
            return tokenBody.exp;
        }
    }
    // Option 3 - if none of the above worked set this to 5 minutes after now
    return now + 300;
}

/**
 * Adds patient context to requestOptions object to be used with [[Client.request]]
 * @param requestOptions Can be a string URL (relative to the serviceUrl), or an
 * object which will be passed to fetch()
 * @param client Current FHIR client object containing patient context
 * @return requestOptions object contextualized to current patient
 */
async function contextualize(requestOptions, client) {
    const base = absolute("/", client.state.serverUrl);
    async function contextualURL(_url) {
        const resourceType = _url.pathname.split("/").pop();
        assert(resourceType, `Invalid url "${_url}"`);
        assert(patientCompartment.indexOf(resourceType) > -1, `Cannot filter "${resourceType}" resources by patient`);
        const conformance = await fetchConformanceStatement(client.state.serverUrl);
        const searchParam = getPatientParam(conformance, resourceType);
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
    const node = getPath(obj, path);
    if (node) {
        const isArray = Array.isArray(node);
        return Promise.all(makeArray(node).filter(Boolean).map((item, i) => {
            const ref = item.reference;
            if (ref) {
                return getRef(ref, cache, client, requestOptions).then(sub => {
                    if (graph) {
                        if (isArray) {
                            if (path.indexOf("..") > -1) {
                                setPath(obj, `${path.replace("..", `.${i}.`)}`, sub);
                            }
                            else {
                                setPath(obj, `${path}.${i}`, sub);
                            }
                        }
                        else {
                            setPath(obj, path, sub);
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
    let paths = makeArray(fhirOptions.resolveReferences)
        .filter(Boolean) // No false, 0, null, undefined or ""
        .map(path => String(path).trim())
        .filter(Boolean); // No space-only strings
    // 2. Remove duplicates
    paths = paths.filter((p, i) => {
        const index = paths.indexOf(p, i + 1);
        if (index > -1) {
            debug("client: Duplicated reference path \"%s\"", p);
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
        assert(_state.serverUrl && _state.serverUrl.match(/https?:\/\/.+/), "A \"serverUrl\" option is required and must begin with \"http(s)\"");
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
                    debug("client: " + str.noScopeForId, "patient", "patient");
                }
                else {
                    // The server should have returned the patient!
                    debug("client: The ID of the selected patient is not available. Please check if your server supports that.");
                }
                return null;
            }
            return tokenResponse.patient;
        }
        if (this.state.authorizeUri) {
            debug("client: " + str.noIfNoAuth, "the ID of the selected patient");
        }
        else {
            debug("client: " + str.noFreeContext, "selected patient");
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
                    debug("client: " + str.noScopeForId, "encounter", "encounter");
                }
                else {
                    // The server should have returned the encounter!
                    debug("client: The ID of the selected encounter is not available. Please check if your server supports that, and that the selected patient has any recorded encounters.");
                }
                return null;
            }
            return tokenResponse.encounter;
        }
        if (this.state.authorizeUri) {
            debug("client: " + str.noIfNoAuth, "the ID of the selected encounter");
        }
        else {
            debug("client: " + str.noFreeContext, "selected encounter");
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
                    debug("client: You are trying to get the id_token but you are not " +
                        "using the right scopes. Please add 'openid' and " +
                        "'fhirUser' or 'profile' to the scopes you are " +
                        "requesting.");
                }
                else {
                    // The server should have returned the id_token!
                    debug("client: The id_token is not available. Please check if your server supports that.");
                }
                return null;
            }
            return jwtDecode(idToken);
        }
        if (this.state.authorizeUri) {
            debug("client: " + str.noIfNoAuth, "the id_token");
        }
        else {
            debug("client: " + str.noFreeContext, "id_token");
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
            return "Basic " + base64encode(username + ":" + password);
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
        assertJsonPatch(patch);
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
        assert(requestOptions, "request requires an url or request options as argument");
        // url -----------------------------------------------------------------
        let url;
        if (typeof requestOptions == "string" || requestOptions instanceof URL) {
            url = String(requestOptions);
            requestOptions = {};
        }
        else {
            url = String(requestOptions.url);
        }
        url = absolute(url, this.state.serverUrl);
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
            debug("client:request: %s, options: %O, fhirOptions: %O", url, requestOptions, options);
            return request(url, requestOptions).then(result => {
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
                    debug("client:request: Your session has expired and the useRefreshToken option is set to false. Please re-launch the app.");
                    await this._clearState();
                    error.message += "\n" + str.expired;
                    throw error;
                }
                // In rare cases we may have a valid access token and a refresh
                // token and the request might still fail with 401 just because
                // the access token has just been revoked.
                // otherwise -> auto-refresh failed. Session expired.
                // Need to re-launch. Clear state to start over!
                debug("client:request: Auto-refresh failed! Please re-launch the app.");
                await this._clearState();
                error.message += "\n" + str.expired;
                throw error;
            }
            throw error;
        })
            // Handle 403 ------------------------------------------------------
            .catch((error) => {
            if (error.status == 403) {
                debug("client:request: Permission denied! Please make sure that you have requested the proper scopes.");
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
                        _data = makeArray(_data);
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
                                return _data.concat(makeArray(nextPage.data || nextPage));
                            }
                            return _data.concat(makeArray(nextPage));
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
        debug("client:refresh: Attempting to refresh with refresh_token...");
        const refreshToken = (_b = (_a = this.state) === null || _a === void 0 ? void 0 : _a.tokenResponse) === null || _b === void 0 ? void 0 : _b.refresh_token;
        assert(refreshToken, "Unable to refresh. No refresh_token found.");
        const tokenUri = this.state.tokenUri;
        assert(tokenUri, "Unable to refresh. No tokenUri found.");
        const scopes = this.getState("tokenResponse.scope") || "";
        const hasOfflineAccess = scopes.search(/\boffline_access\b/) > -1;
        const hasOnlineAccess = scopes.search(/\bonline_access\b/) > -1;
        assert(hasOfflineAccess || hasOnlineAccess, "Unable to refresh. No offline_access or online_access scope found.");
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
                    refreshRequestOptions.headers.authorization = "Basic " + base64encode(clientId + ":" + clientSecret);
                }
            }
            this._refreshTask = request(tokenUri, refreshRequestOptions)
                .then(data => {
                assert(data.access_token, "No access token received");
                debug("client:refresh: Received new access token response %O", data);
                this.state.tokenResponse = { ...this.state.tokenResponse, ...data };
                this.state.expiresAt = getAccessTokenExpiration(data);
                return this.state;
            })
                .catch((error) => {
                var _a, _b;
                if ((_b = (_a = this.state) === null || _a === void 0 ? void 0 : _a.tokenResponse) === null || _b === void 0 ? void 0 : _b.refresh_token) {
                    debug("client:refresh: Deleting the expired or invalid refresh token.");
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
                    debug("client:refresh: No 'key' found in Clint.state. Cannot persist the instance.");
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
        return getPath(obj, path);
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
        return getPath({ ...this.state }, path);
    }
    /**
     * Returns a promise that will be resolved with the fhir version as defined
     * in the CapabilityStatement.
     */
    getFhirVersion() {
        return fetchConformanceStatement(this.state.serverUrl)
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
        return this.getFhirVersion().then(v => { var _a; return (_a = fhirVersions[v]) !== null && _a !== void 0 ? _a : 0; });
    }
}

const subtle = () => {
    if (!(crypto === null || crypto === void 0 ? void 0 : crypto.subtle)) {
        if (!globalThis.isSecureContext) {
            throw new Error("Some of the required subtle crypto functionality is not available " +
                "unless you run this app in secure context (using HTTPS or running locally). " +
                "See https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts");
        }
        throw new Error("Some of the required subtle crypto functionality is not " +
            "available in the current environment (no crypto.subtle)");
    }
    return crypto.subtle;
};
const ALGS = {
    ES384: {
        name: "ECDSA",
        namedCurve: "P-384"
    },
    RS384: {
        name: "RSASSA-PKCS1-v1_5",
        modulusLength: 4096,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: {
            name: 'SHA-384'
        }
    }
};
function randomBytes(count) {
    return crypto.getRandomValues(new Uint8Array(count));
}
async function digestSha256(payload) {
    const prepared = new TextEncoder().encode(payload);
    const hash = await subtle().digest('SHA-256', prepared);
    return new Uint8Array(hash);
}
const generatePKCEChallenge = async (entropy = 96) => {
    const inputBytes = randomBytes(entropy);
    const codeVerifier = base64urlencode(inputBytes);
    const codeChallenge = base64urlencode(await digestSha256(codeVerifier));
    return { codeChallenge, codeVerifier };
};
async function importJWK(jwk) {
    // alg is optional in JWK but we need it here!
    if (!jwk.alg) {
        throw new Error('The "alg" property of the JWK must be set to "ES384" or "RS384"');
    }
    // Use of the "key_ops" member is OPTIONAL, unless the application requires its presence.
    // https://www.rfc-editor.org/rfc/rfc7517.html#section-4.3
    // 
    // In our case the app will only import private keys so we can assume "sign"
    if (!Array.isArray(jwk.key_ops)) {
        jwk.key_ops = ["sign"];
    }
    // In this case the JWK has a "key_ops" array and "sign" is not listed
    if (!jwk.key_ops.includes("sign")) {
        throw new Error('The "key_ops" property of the JWK does not contain "sign"');
    }
    try {
        return await subtle().importKey("jwk", jwk, ALGS[jwk.alg], jwk.ext === true, jwk.key_ops // || ['sign']
        );
    }
    catch (e) {
        throw new Error(`The ${jwk.alg} is not supported by this browser: ${e}`);
    }
}
async function signCompactJws(alg, privateKey, header, payload) {
    const jwtHeader = JSON.stringify({ ...header, alg });
    const jwtPayload = JSON.stringify(payload);
    const jwtAuthenticatedContent = `${base64urlencode(jwtHeader)}.${base64urlencode(jwtPayload)}`;
    const signature = await subtle().sign({ ...privateKey.algorithm, hash: 'SHA-384' }, privateKey, new TextEncoder().encode(jwtAuthenticatedContent));
    return `${jwtAuthenticatedContent}.${base64urlencode(new Uint8Array(signature))}`;
}
function base64urlencode(input) {
    // Step 1: Convert Uint8Array to binary string if needed
    if (input instanceof Uint8Array) {
        input = uint8ArrayToBinaryString(input);
    }
    // Step 2: Encode the binary string to Base64
    let base64 = btoa(input);
    // Step 3: Replace Base64 characters with Base64URL characters and remove padding
    let base64Url = base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    return base64Url;
}
function base64urldecode(input) {
    // Step 1: Replace Base64URL characters with standard Base64 characters
    let base64 = input.replace(/-/g, "+").replace(/_/g, "/");
    // Step 2: Add padding if necessary
    const pad = base64.length % 4;
    if (pad) {
        base64 += "=".repeat(4 - pad);
    }
    // Step 3: Decode the Base64 string
    try {
        return atob(base64);
    }
    catch (e) {
        throw new Error("Invalid Base64URL string");
    }
}
function uint8ArrayToBinaryString(input) {
    let bin = "";
    for (let i = 0; i < input.length; i++) {
        bin += String.fromCharCode(input[i]);
    }
    return bin;
}
/**
 * Resolves a reference to target window. It may also open new window or tab if
 * the `target = "popup"` or `target = "_blank"`.
 * @param target
 * @param width Only used when `target = "popup"`
 * @param height Only used when `target = "popup"`
 */
async function getTargetWindow(target, width = 800, height = 720) {
    // The target can be a function that returns the target. This can be
    // used to open a layer pop-up with an iframe and then return a reference
    // to that iframe (or its name)
    if (typeof target == "function") {
        target = await target();
    }
    // The target can be a window reference
    if (target && typeof target == "object") {
        return target;
    }
    // At this point target must be a string
    if (typeof target != "string") {
        debug("Invalid target type '%s'. Failing back to '_self'.", typeof target);
        return self;
    }
    // Current window
    if (target == "_self") {
        return self;
    }
    // The parent frame
    if (target == "_parent") {
        return parent;
    }
    // The top window
    if (target == "_top") {
        return top || self;
    }
    // New tab or window
    if (target == "_blank") {
        let error, targetWindow = null;
        try {
            targetWindow = window.open("", "SMARTAuthPopup");
            if (!targetWindow) {
                throw new Error("Perhaps window.open was blocked");
            }
        }
        catch (e) {
            error = e;
        }
        if (!targetWindow) {
            debug("Cannot open window. Failing back to '_self'. %s", error);
            return self;
        }
        else {
            return targetWindow;
        }
    }
    // Popup window
    if (target == "popup") {
        let error, targetWindow = null;
        // if (!targetWindow || targetWindow.closed) {
        try {
            targetWindow = window.open("", "SMARTAuthPopup", [
                "height=" + height,
                "width=" + width,
                "menubar=0",
                "resizable=1",
                "status=0",
                "top=" + (screen.height - height) / 2,
                "left=" + (screen.width - width) / 2
            ].join(","));
            if (!targetWindow) {
                throw new Error("Perhaps the popup window was blocked");
            }
        }
        catch (e) {
            error = e;
        }
        if (!targetWindow) {
            debug("Cannot open window. Failing back to '_self'. %s", error);
            return self;
        }
        else {
            return targetWindow;
        }
    }
    // Frame or window by name
    const winOrFrame = frames[target];
    if (winOrFrame) {
        return winOrFrame;
    }
    debug("Unknown target '%s'. Failing back to '_self'.", target);
    return self;
}
/**
 * Checks if called within a frame. Only works in browsers!
 * If the current window has a `parent` or `top` properties that refer to
 * another window, returns true. If trying to access `top` or `parent` throws an
 * error, returns true. Otherwise returns `false`.
 */
function isInFrame() {
    try {
        return self !== top && parent !== self;
    }
    catch (e) {
        return true;
    }
}
/**
 * Checks if called within another window (popup or tab). Only works in browsers!
 * To consider itself called in a new window, this function verifies that:
 * 1. `self === top` (not in frame)
 * 2. `!!opener && opener !== self` The window has an opener
 * 3. `!!window.name` The window has a `name` set
 */
function isInPopUp() {
    try {
        return self === top &&
            !!opener &&
            opener !== self &&
            !!window.name;
    }
    catch (e) {
        return false;
    }
}
/**
 * Another window can send a "completeAuth" message to this one, making it to
 * navigate to e.data.url
 * @param e The message event
 */
function onMessage(e) {
    if (e.data.type == "completeAuth" && e.origin === new URL(self.location.href).origin) {
        window.removeEventListener("message", onMessage);
        window.location.href = e.data.url;
    }
}

function isBrowser() {
    return typeof window === "object";
}
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
async function authorize$1(env, params = {}) {
    const url = env.getUrl();
    // Multiple config for EHR launches ---------------------------------------
    if (Array.isArray(params)) {
        const urlISS = url.searchParams.get("iss") || url.searchParams.get("fhirServiceUrl");
        if (!urlISS) {
            throw new Error('Passing in an "iss" url parameter is required if authorize ' +
                'uses multiple configurations');
        }
        // pick the right config
        const cfg = params.find(x => {
            if (x.issMatch) {
                if (typeof x.issMatch === "function") {
                    return !!x.issMatch(urlISS);
                }
                if (typeof x.issMatch === "string") {
                    return x.issMatch === urlISS;
                }
                if (x.issMatch instanceof RegExp) {
                    return x.issMatch.test(urlISS);
                }
            }
            return false;
        });
        assert(cfg, `No configuration found matching the current "iss" parameter "${urlISS}"`);
        return await authorize$1(env, cfg);
    }
    // ------------------------------------------------------------------------
    // Obtain input
    const { clientSecret, fakeTokenResponse, encounterId, target, width, height, pkceMode, clientPublicKeySetUrl } = params;
    let { iss, launch, patientId, fhirServiceUrl, redirectUri, noRedirect, scope = "", clientId, completeInTarget, clientPrivateJwk } = params;
    const storage = env.getStorage();
    // For these, a url param takes precedence over inline option
    iss = url.searchParams.get("iss") || iss;
    fhirServiceUrl = url.searchParams.get("fhirServiceUrl") || fhirServiceUrl;
    launch = url.searchParams.get("launch") || launch;
    patientId = url.searchParams.get("patientId") || patientId;
    clientId = url.searchParams.get("clientId") || clientId;
    if (!redirectUri) {
        redirectUri = env.relative(".");
    }
    else if (!redirectUri.match(/^https?\:\/\//)) {
        redirectUri = env.relative(redirectUri);
    }
    const serverUrl = String(iss || fhirServiceUrl || "");
    // Validate input
    if (!serverUrl) {
        throw new Error("No server url found. It must be specified as `iss` or as " +
            "`fhirServiceUrl` parameter");
    }
    if (iss) {
        debug("Making %s launch...", launch ? "EHR" : "standalone");
    }
    // append launch scope if needed
    if (launch && !scope.match(/launch/)) {
        scope += " launch";
    }
    if (isBrowser()) {
        const inFrame = isInFrame();
        const inPopUp = isInPopUp();
        if ((inFrame || inPopUp) && completeInTarget !== true && completeInTarget !== false) {
            // completeInTarget will default to true if authorize is called from
            // within an iframe. This is to avoid issues when the entire app
            // happens to be rendered in an iframe (including in some EHRs),
            // even though that was not how the app developer's intention.
            completeInTarget = inFrame;
            // In this case we can't always make the best decision so ask devs
            // to be explicit in their configuration.
            console.warn('Your app is being authorized from within an iframe or popup ' +
                'window. Please be explicit and provide a "completeInTarget" ' +
                'option. Use "true" to complete the authorization in the ' +
                'same window, or "false" to try to complete it in the parent ' +
                'or the opener window. See http://docs.smarthealthit.org/client-js/api.html');
        }
    }
    // If `authorize` is called, make sure we clear any previous state (in case
    // this is a re-authorize)
    const oldKey = await storage.get(SMART_KEY);
    await storage.unset(oldKey);
    // create initial state
    const stateKey = randomString(16);
    const state = {
        clientId,
        scope,
        redirectUri,
        serverUrl,
        clientSecret,
        clientPrivateJwk,
        tokenResponse: {},
        key: stateKey,
        completeInTarget,
        clientPublicKeySetUrl
    };
    await storage.set(SMART_KEY, stateKey);
    // fakeTokenResponse to override stuff (useful in development)
    if (fakeTokenResponse) {
        Object.assign(state.tokenResponse, fakeTokenResponse);
    }
    // Fixed patientId (useful in development)
    if (patientId) {
        Object.assign(state.tokenResponse, { patient: patientId });
    }
    // Fixed encounterId (useful in development)
    if (encounterId) {
        Object.assign(state.tokenResponse, { encounter: encounterId });
    }
    let redirectUrl = redirectUri + "?state=" + encodeURIComponent(stateKey);
    // bypass oauth if fhirServiceUrl is used (but iss takes precedence)
    if (fhirServiceUrl && !iss) {
        debug("Making fake launch...");
        await storage.set(stateKey, state);
        if (noRedirect) {
            return redirectUrl;
        }
        return await env.redirect(redirectUrl);
    }
    // Get oauth endpoints and add them to the state
    const extensions = await getSecurityExtensions(serverUrl);
    Object.assign(state, extensions);
    await storage.set(stateKey, state);
    // If this happens to be an open server and there is no authorizeUri
    if (!state.authorizeUri) {
        if (noRedirect) {
            return redirectUrl;
        }
        return await env.redirect(redirectUrl);
    }
    // build the redirect uri
    const redirectParams = [
        "response_type=code",
        "client_id=" + encodeURIComponent(clientId || ""),
        "scope=" + encodeURIComponent(scope),
        "redirect_uri=" + encodeURIComponent(redirectUri),
        "aud=" + encodeURIComponent(serverUrl),
        "state=" + encodeURIComponent(stateKey)
    ];
    // also pass this in case of EHR launch
    if (launch) {
        redirectParams.push("launch=" + encodeURIComponent(launch));
    }
    if (shouldIncludeChallenge(extensions.codeChallengeMethods.includes('S256'), pkceMode)) {
        let codes = await env.security.generatePKCEChallenge();
        Object.assign(state, codes);
        await storage.set(stateKey, state);
        redirectParams.push("code_challenge=" + state.codeChallenge); // note that the challenge is ALREADY encoded properly
        redirectParams.push("code_challenge_method=S256");
    }
    redirectUrl = state.authorizeUri + "?" + redirectParams.join("&");
    if (noRedirect) {
        return redirectUrl;
    }
    if (target && isBrowser()) {
        let win;
        win = await getTargetWindow(target, width, height);
        if (win !== self) {
            try {
                // Also remove any old state from the target window and then
                // transfer the current state there
                win.sessionStorage.removeItem(oldKey);
                win.sessionStorage.setItem(stateKey, JSON.stringify(state));
            }
            catch (ex) {
                debug(`oauth2: Failed to modify window.sessionStorage. Perhaps it is from different origin?. Failing back to "_self". %s`, ex);
                win = self;
            }
        }
        if (win !== self) {
            try {
                win.location.href = redirectUrl;
                self.addEventListener("message", onMessage);
            }
            catch (ex) {
                debug(`oauth2: Failed to modify window.location. Perhaps it is from different origin?. Failing back to "_self". %s`, ex);
                self.location.href = redirectUrl;
            }
        }
        else {
            self.location.href = redirectUrl;
        }
        return;
    }
    return await env.redirect(redirectUrl);
}
/**
 * The ready function should only be called on the page that represents
 * the redirectUri. We typically land there after a redirect from the
 * authorization server, but this code will also be executed upon subsequent
 * navigation or page refresh.
 */
async function ready$1(env, options = {}) {
    var _a, _b;
    const url = env.getUrl();
    const Storage = env.getStorage();
    const params = url.searchParams;
    let key = params.get("state");
    const code = params.get("code");
    const authError = params.get("error");
    const authErrorDescription = params.get("error_description");
    if (!key) {
        key = await Storage.get(SMART_KEY);
    }
    // Start by checking the url for `error` and `error_description` parameters.
    // This happens when the auth server rejects our authorization attempt. In
    // this case it has no other way to tell us what the error was, other than
    // appending these parameters to the redirect url.
    // From client's point of view, this is not very reliable (because we can't
    // know how we have landed on this page - was it a redirect or was it loaded
    // manually). However, if `ready()` is being called, we can assume
    // that the url comes from the auth server (otherwise the app won't work
    // anyway).
    if (authError || authErrorDescription) {
        throw new Error([
            authError,
            authErrorDescription
        ].filter(Boolean).join(": "));
    }
    debug("key: %s, code: %s", key, code);
    // key might be coming from the page url so it might be empty or missing
    assert(key, "No 'state' parameter found. Please (re)launch the app.");
    // Check if we have a previous state
    let state = (await Storage.get(key));
    // If we are in a popup window or an iframe and the authorization is
    // complete, send the location back to our opener and exit.
    if (isBrowser() && state && !state.completeInTarget) {
        const inFrame = isInFrame();
        const inPopUp = isInPopUp();
        // we are about to return to the opener/parent where completeAuth will
        // be called again. In rare cases the opener or parent might also be
        // a frame or popup. Then inFrame or inPopUp will be true but we still
        // have to stop going up the chain. To guard against that weird form of
        // recursion we pass one additional parameter to the url which we later
        // remove.
        if ((inFrame || inPopUp) && !url.searchParams.get("complete")) {
            url.searchParams.set("complete", "1");
            const { href, origin } = url;
            if (inFrame) {
                parent.postMessage({ type: "completeAuth", url: href }, origin);
            }
            if (inPopUp) {
                opener.postMessage({ type: "completeAuth", url: href }, origin);
                window.close();
            }
            return new Promise(() => { });
        }
    }
    url.searchParams.delete("complete");
    // Do we have to remove the `code` and `state` params from the URL?
    const hasState = params.has("state");
    if (isBrowser() && (code || hasState)) {
        // `code` is the flag that tell us to request an access token.
        // We have to remove it, otherwise the page will authorize on
        // every load!
        if (code) {
            params.delete("code");
            debug("Removed code parameter from the url.");
        }
        // We no longer need the `state` key. It will be stored to a well know
        // location - sessionStorage[SMART_KEY]
        if (hasState) {
            params.delete("state");
            debug("Removed state parameter from the url.");
        }
        // If the browser does not support the replaceState method for the
        // History Web API, the "code" parameter cannot be removed. As a
        // consequence, the page will (re)authorize on every load. The
        // workaround is to reload the page to new location without those
        // parameters.
        if (window.history.replaceState) {
            window.history.replaceState({}, "", url.href);
        }
    }
    // If the state does not exist, it means the page has been loaded directly.
    assert(state, "No state found! Please (re)launch the app.");
    // Assume the client has already completed a token exchange when
    // there is no code (but we have a state) or access token is found in state
    const authorized = !code || ((_a = state.tokenResponse) === null || _a === void 0 ? void 0 : _a.access_token);
    // If we are authorized already, then this is just a reload.
    // Otherwise, we have to complete the code flow
    if (!authorized && state.tokenUri) {
        assert(code, "'code' url parameter is required");
        debug("Preparing to exchange the code for access token...");
        const requestOptions = await buildTokenRequest(env, {
            code,
            state,
            clientPublicKeySetUrl: options.clientPublicKeySetUrl,
            privateKey: options.privateKey || state.clientPrivateJwk
        });
        debug("Token request options: %O", requestOptions);
        // The EHR authorization server SHALL return a JSON structure that
        // includes an access token or a message indicating that the
        // authorization request has been denied.
        const tokenResponse = await request(state.tokenUri, requestOptions);
        debug("Token response: %O", tokenResponse);
        assert(tokenResponse.access_token, "Failed to obtain access token.");
        // Now we need to determine when is this authorization going to expire
        state.expiresAt = getAccessTokenExpiration(tokenResponse);
        // save the tokenResponse so that we don't have to re-authorize on
        // every page reload
        state = { ...state, tokenResponse };
        await Storage.set(key, state);
        debug("Authorization successful!");
    }
    else {
        debug(((_b = state.tokenResponse) === null || _b === void 0 ? void 0 : _b.access_token) ?
            "Already authorized" :
            "No authorization needed");
    }
    await Storage.set(SMART_KEY, key);
    const client = new Client(state, env.getStorage());
    debug("Created client instance: %O", client);
    return client;
}
/**
 * Builds the token request options. Does not make the request, just
 * creates it's configuration and returns it in a Promise.
 */
async function buildTokenRequest(env, { code, state, clientPublicKeySetUrl, privateKey }) {
    const { redirectUri, clientSecret, tokenUri, clientId, codeVerifier } = state;
    assert(redirectUri, "Missing state.redirectUri");
    assert(tokenUri, "Missing state.tokenUri");
    assert(clientId, "Missing state.clientId");
    const requestOptions = {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: `code=${code}&grant_type=authorization_code&redirect_uri=${encodeURIComponent(redirectUri)}`
    };
    // For public apps, authentication is not possible (and thus not required),
    // since a client with no secret cannot prove its identity when it issues a
    // call. (The end-to-end system can still be secure because the client comes
    // from a known, https protected endpoint specified and enforced by the
    // redirect uri.) For confidential apps, an Authorization header using HTTP
    // Basic authentication is required, where the username is the app’s
    // clientId and the password is the app’s clientSecret (see example).
    if (clientSecret) {
        requestOptions.headers.authorization = "Basic " + base64encode(clientId + ":" + clientSecret);
        debug("Using state.clientSecret to construct the authorization header: %s", requestOptions.headers.authorization);
    }
    // Asymmetric auth
    else if (privateKey) {
        const pk = "key" in privateKey ?
            privateKey.key :
            await env.security.importJWK(privateKey);
        const jwtHeaders = {
            typ: "JWT",
            kid: privateKey.kid,
            jku: clientPublicKeySetUrl || state.clientPublicKeySetUrl
        };
        const jwtClaims = {
            iss: clientId,
            sub: clientId,
            aud: tokenUri,
            jti: env.base64urlencode(env.security.randomBytes(32)),
            exp: getTimeInFuture(120) // two minutes in the future
        };
        const clientAssertion = await env.security.signCompactJws(privateKey.alg, pk, jwtHeaders, jwtClaims);
        requestOptions.body += `&client_assertion_type=${encodeURIComponent("urn:ietf:params:oauth:client-assertion-type:jwt-bearer")}`;
        requestOptions.body += `&client_assertion=${encodeURIComponent(clientAssertion)}`;
        debug("Using state.clientPrivateJwk to add a client_assertion to the POST body");
    }
    // Public client
    else {
        debug("Public client detected; adding state.clientId to the POST body");
        requestOptions.body += `&client_id=${encodeURIComponent(clientId)}`;
    }
    if (codeVerifier) {
        debug("Found state.codeVerifier, adding to the POST body");
        // Note that the codeVerifier is ALREADY encoded properly  
        requestOptions.body += "&code_verifier=" + codeVerifier;
    }
    return requestOptions;
}
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
async function init$1(env, authorizeOptions, readyOptions) {
    const url = env.getUrl();
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    // if `code` and `state` params are present we need to complete the auth flow
    if (code && state) {
        return ready$1(env, readyOptions);
    }
    // Check for existing client state. If state is found, it means a client
    // instance have already been created in this session and we should try to
    // "revive" it.
    const storage = env.getStorage();
    const key = state || await storage.get(SMART_KEY);
    const cached = await storage.get(key);
    if (cached) {
        return new Client(cached, env.getStorage());
    }
    // Otherwise try to launch
    return authorize$1(env, authorizeOptions).then(() => {
        // `init` promises a Client but that cannot happen in this case. The
        // browser will be redirected (unload the page and be redirected back
        // to it later and the same init function will be called again). On
        // success, authorize will resolve with the redirect url but we don't
        // want to return that from this promise chain because it is not a
        // Client instance. At the same time, if authorize fails, we do want to
        // pass the error to those waiting for a client instance.
        return new Promise(() => { });
    });
}

class Storage {
    async get(key) {
        const value = sessionStorage[key];
        if (value) {
            return JSON.parse(value);
        }
        return null;
    }
    async set(key, value) {
        sessionStorage[key] = JSON.stringify(value);
        return value;
    }
    async unset(key) {
        if (key in sessionStorage) {
            delete sessionStorage[key];
            return true;
        }
        return false;
    }
}

/**
 * Browser Adapter
 */
class BrowserAdapter {
    /**
     * @param options Environment-specific options
     */
    constructor(options = {}) {
        /**
         * Stores the URL instance associated with this adapter
         */
        this._url = null;
        /**
         * Holds the Storage instance associated with this instance
         */
        this._storage = null;
        this.security = {
            randomBytes: randomBytes,
            digestSha256: digestSha256,
            generatePKCEChallenge: generatePKCEChallenge,
            importJWK: importJWK,
            signCompactJws: signCompactJws
        };
        this.options = { ...options };
    }
    /**
     * Given a relative path, returns an absolute url using the instance base URL
     */
    relative(path) {
        return new URL(path, this.getUrl().href).href;
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
            this._storage = new Storage();
        }
        return this._storage;
    }
    base64urlencode(input) {
        return base64urlencode(input);
    }
    base64urldecode(input) {
        return base64urldecode(input);
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
            ready: (...args) => ready$1(this, ...args),
            authorize: options => authorize$1(this, options),
            init: options => init$1(this, options),
            client: (state) => new Client(state, this.getStorage()),
            options: this.options,
            utils: {
                security: this.security
            }
        };
    }
}

const { ready, authorize, init, client, options, utils } = new BrowserAdapter().getSmartApi();
// export default {
//     client,
//     utils,
//     oauth2: {
//         settings: options,
//         ready,
//         authorize,
//         init
//     }
// };
function smart(settings = {}) {
    return smart;
}
smart.authorize = authorize;
smart.ready = ready;
smart.init = init;
smart.client = client;
smart.utils = utils;

export { smart as default };
