"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
const lib_1 = require("./lib");
const strings_1 = require("./strings");
const settings_1 = require("./settings");
// $lab:coverage:off$
// @ts-ignore
const {
  Response
} = typeof FHIRCLIENT_PURE !== "undefined" ? window : require("cross-fetch");
// $lab:coverage:on$
const debug = lib_1.debug.extend("client");
/**
 * Adds patient context to requestOptions object to be used with [[Client.request]]
 * @param requestOptions Can be a string URL (relative to the serviceUrl), or an
 * object which will be passed to fetch()
 * @param client Current FHIR client object containing patient context
 * @return requestOptions object contextualized to current patient
 */
async function contextualize(requestOptions, client) {
  const base = (0, lib_1.absolute)("/", client.state.serverUrl);
  async function contextualURL(_url) {
    const resourceType = _url.pathname.split("/").pop();
    (0, lib_1.assert)(resourceType, `Invalid url "${_url}"`);
    (0, lib_1.assert)(settings_1.patientCompartment.indexOf(resourceType) > -1, `Cannot filter "${resourceType}" resources by patient`);
    const conformance = await (0, lib_1.fetchConformanceStatement)(client.state.serverUrl);
    const searchParam = (0, lib_1.getPatientParam)(conformance, resourceType);
    _url.searchParams.set(searchParam, client.patient.id);
    return _url.href;
  }
  if (typeof requestOptions == "string" || requestOptions instanceof URL) {
    return {
      url: await contextualURL(new URL(requestOptions + "", base))
    };
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
function getRef(refId, cache, client, requestOptions) {
  if (!cache[refId]) {
    const {
      signal,
      headers
    } = requestOptions;
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
    }, error => {
      delete cache[refId];
      throw error;
    });
  }
  return Promise.resolve(cache[refId]);
}
/**
 * Resolves a reference in the given resource.
 * @param obj FHIR Resource
 */
function resolveRef(obj, path, graph, cache, client, requestOptions) {
  const node = (0, lib_1.getPath)(obj, path);
  if (node) {
    const isArray = Array.isArray(node);
    return Promise.all((0, lib_1.makeArray)(node).filter(Boolean).map((item, i) => {
      const ref = item.reference;
      if (ref) {
        return getRef(ref, cache, client, requestOptions).then(sub => {
          if (graph) {
            if (isArray) {
              if (path.indexOf("..") > -1) {
                (0, lib_1.setPath)(obj, `${path.replace("..", `.${i}.`)}`, sub);
              } else {
                (0, lib_1.setPath)(obj, `${path}.${i}`, sub);
              }
            } else {
              (0, lib_1.setPath)(obj, path, sub);
            }
          }
        }).catch(ex => {
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
  let paths = (0, lib_1.makeArray)(fhirOptions.resolveReferences).filter(Boolean) // No false, 0, null, undefined or ""
  .map(path => String(path).trim()).filter(Boolean); // No space-only strings
  // 2. Remove duplicates
  paths = paths.filter((p, i) => {
    const index = paths.indexOf(p, i + 1);
    if (index > -1) {
      debug("Duplicated reference path \"%s\"", p);
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
    task = task.then(() => Promise.all(group.map(path => {
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
   * Validates the parameters, creates an instance and tries to connect it to
   * FhirJS, if one is available globally.
   */
  constructor(environment, state) {
    /**
     * @category Utility
     */
    this.units = lib_1.units;
    const _state = typeof state == "string" ? {
      serverUrl: state
    } : state;
    // Valid serverUrl is required!
    (0, lib_1.assert)(_state.serverUrl && _state.serverUrl.match(/https?:\/\/.+/), "A \"serverUrl\" option is required and must begin with \"http(s)\"");
    this.state = _state;
    this.environment = environment;
    this._refreshTask = null;
    const client = this;
    // patient api ---------------------------------------------------------
    this.patient = {
      get id() {
        return client.getPatientId();
      },
      read: requestOptions => {
        const id = this.patient.id;
        return id ? this.request(Object.assign(Object.assign({}, requestOptions), {
          url: `Patient/${id}`
        })) : Promise.reject(new Error("Patient is not available"));
      },
      request: (requestOptions, fhirOptions = {}) => {
        if (this.patient.id) {
          return (async () => {
            const options = await contextualize(requestOptions, this);
            return this.request(options, fhirOptions);
          })();
        } else {
          return Promise.reject(new Error("Patient is not available"));
        }
      }
    };
    // encounter api -------------------------------------------------------
    this.encounter = {
      get id() {
        return client.getEncounterId();
      },
      read: requestOptions => {
        const id = this.encounter.id;
        return id ? this.request(Object.assign(Object.assign({}, requestOptions), {
          url: `Encounter/${id}`
        })) : Promise.reject(new Error("Encounter is not available"));
      }
    };
    // user api ------------------------------------------------------------
    this.user = {
      get fhirUser() {
        return client.getFhirUser();
      },
      get id() {
        return client.getUserId();
      },
      get resourceType() {
        return client.getUserType();
      },
      read: requestOptions => {
        const fhirUser = this.user.fhirUser;
        return fhirUser ? this.request(Object.assign(Object.assign({}, requestOptions), {
          url: fhirUser
        })) : Promise.reject(new Error("User is not available"));
      }
    };
    // fhir.js api (attached automatically in browser)
    // ---------------------------------------------------------------------
    this.connect(environment.fhir);
  }
  /**
   * This method is used to make the "link" between the `fhirclient` and the
   * `fhir.js`, if one is available.
   * **Note:** This is called by the constructor. If fhir.js is available in
   * the global scope as `fhir`, it will automatically be linked to any [[Client]]
   * instance. You should only use this method to connect to `fhir.js` which
   * is not global.
   */
  connect(fhirJs) {
    if (typeof fhirJs == "function") {
      const options = {
        baseUrl: this.state.serverUrl.replace(/\/$/, "")
      };
      const accessToken = this.getState("tokenResponse.access_token");
      if (accessToken) {
        options.auth = {
          token: accessToken
        };
      } else {
        const {
          username,
          password
        } = this.state;
        if (username && password) {
          options.auth = {
            user: username,
            pass: password
          };
        }
      }
      this.api = fhirJs(options);
      const patientId = this.getState("tokenResponse.patient");
      if (patientId) {
        this.patient.api = fhirJs(Object.assign(Object.assign({}, options), {
          patient: patientId
        }));
      }
    }
    return this;
  }
  /**
   * Returns the ID of the selected patient or null. You should have requested
   * "launch/patient" scope. Otherwise this will return null.
   */
  getPatientId() {
    const tokenResponse = this.state.tokenResponse;
    if (tokenResponse) {
      // We have been authorized against this server but we don't know
      // the patient. This should be a scope issue.
      if (!tokenResponse.patient) {
        if (!(this.state.scope || "").match(/\blaunch(\/patient)?\b/)) {
          debug(strings_1.default.noScopeForId, "patient", "patient");
        } else {
          // The server should have returned the patient!
          debug("The ID of the selected patient is not available. Please check if your server supports that.");
        }
        return null;
      }
      return tokenResponse.patient;
    }
    if (this.state.authorizeUri) {
      debug(strings_1.default.noIfNoAuth, "the ID of the selected patient");
    } else {
      debug(strings_1.default.noFreeContext, "selected patient");
    }
    return null;
  }
  /**
   * Returns the ID of the selected encounter or null. You should have
   * requested "launch/encounter" scope. Otherwise this will return null.
   * Note that not all servers support the "launch/encounter" scope so this
   * will be null if they don't.
   */
  getEncounterId() {
    const tokenResponse = this.state.tokenResponse;
    if (tokenResponse) {
      // We have been authorized against this server but we don't know
      // the encounter. This should be a scope issue.
      if (!tokenResponse.encounter) {
        if (!(this.state.scope || "").match(/\blaunch(\/encounter)?\b/)) {
          debug(strings_1.default.noScopeForId, "encounter", "encounter");
        } else {
          // The server should have returned the encounter!
          debug("The ID of the selected encounter is not available. Please check if your server supports that, and that the selected patient has any recorded encounters.");
        }
        return null;
      }
      return tokenResponse.encounter;
    }
    if (this.state.authorizeUri) {
      debug(strings_1.default.noIfNoAuth, "the ID of the selected encounter");
    } else {
      debug(strings_1.default.noFreeContext, "selected encounter");
    }
    return null;
  }
  /**
   * Returns the (decoded) id_token if any. You need to request "openid" and
   * "profile" scopes if you need to receive an id_token (if you need to know
   * who the logged-in user is).
   */
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
          debug("You are trying to get the id_token but you are not " + "using the right scopes. Please add 'openid' and " + "'fhirUser' or 'profile' to the scopes you are " + "requesting.");
        } else {
          // The server should have returned the id_token!
          debug("The id_token is not available. Please check if your server supports that.");
        }
        return null;
      }
      return (0, lib_1.jwtDecode)(idToken, this.environment);
    }
    if (this.state.authorizeUri) {
      debug(strings_1.default.noIfNoAuth, "the id_token");
    } else {
      debug(strings_1.default.noFreeContext, "id_token");
    }
    return null;
  }
  /**
   * Returns the profile of the logged_in user (if any). This is a string
   * having the following shape `"{user type}/{user id}"`. For example:
   * `"Practitioner/abc"` or `"Patient/xyz"`.
   */
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
  /**
   * Returns the user ID or null.
   */
  getUserId() {
    const profile = this.getFhirUser();
    if (profile) {
      return profile.split("/")[1];
    }
    return null;
  }
  /**
   * Returns the type of the logged-in user or null. The result can be
   * "Practitioner", "Patient" or "RelatedPerson".
   */
  getUserType() {
    const profile = this.getFhirUser();
    if (profile) {
      return profile.split("/")[0];
    }
    return null;
  }
  /**
   * Builds and returns the value of the `Authorization` header that can be
   * sent to the FHIR server
   */
  getAuthorizationHeader() {
    const accessToken = this.getState("tokenResponse.access_token");
    if (accessToken) {
      return "Bearer " + accessToken;
    }
    const {
      username,
      password
    } = this.state;
    if (username && password) {
      return "Basic " + this.environment.btoa(username + ":" + password);
    }
    return null;
  }
  /**
   * Used internally to clear the state of the instance and the state in the
   * associated storage.
   */
  async _clearState() {
    const storage = this.environment.getStorage();
    const key = await storage.get(settings_1.SMART_KEY);
    if (key) {
      await storage.unset(key);
    }
    await storage.unset(settings_1.SMART_KEY);
    this.state.tokenResponse = {};
  }
  /**
   * Creates a new resource in a server-assigned location
   * @see http://hl7.org/fhir/http.html#create
   * @param resource A FHIR resource to be created
   * @param [requestOptions] Any options to be passed to the fetch call.
   * Note that `method` and `body` will be ignored.
   * @category Request
   */
  create(resource, requestOptions) {
    return this.request(Object.assign(Object.assign({}, requestOptions), {
      url: `${resource.resourceType}`,
      method: "POST",
      body: JSON.stringify(resource),
      headers: Object.assign({
        // TODO: Do we need to alternate with "application/json+fhir"?
        "content-type": "application/json"
      }, (requestOptions || {}).headers)
    }));
  }
  /**
   * Creates a new current version for an existing resource or creates an
   * initial version if no resource already exists for the given id.
   * @see http://hl7.org/fhir/http.html#update
   * @param resource A FHIR resource to be updated
   * @param requestOptions Any options to be passed to the fetch call.
   * Note that `method` and `body` will be ignored.
   * @category Request
   */
  update(resource, requestOptions) {
    return this.request(Object.assign(Object.assign({}, requestOptions), {
      url: `${resource.resourceType}/${resource.id}`,
      method: "PUT",
      body: JSON.stringify(resource),
      headers: Object.assign({
        // TODO: Do we need to alternate with "application/json+fhir"?
        "content-type": "application/json"
      }, (requestOptions || {}).headers)
    }));
  }
  /**
   * Removes an existing resource.
   * @see http://hl7.org/fhir/http.html#delete
   * @param url Relative URI of the FHIR resource to be deleted
   * (format: `resourceType/id`)
   * @param requestOptions Any options (except `method` which will be fixed
   * to `DELETE`) to be passed to the fetch call.
   * @category Request
   */
  delete(url, requestOptions = {}) {
    return this.request(Object.assign(Object.assign({}, requestOptions), {
      url,
      method: "DELETE"
    }));
  }
  /**
   * Makes a JSON Patch to the given resource
   * @see http://hl7.org/fhir/http.html#patch
   * @param url Relative URI of the FHIR resource to be patched
   * (format: `resourceType/id`)
   * @param patch A JSON Patch array to send to the server, For details
   * see https://datatracker.ietf.org/doc/html/rfc6902
   * @param requestOptions Any options to be passed to the fetch call,
   * except for `method`, `url` and `body` which cannot be overridden.
   * @since 2.4.0
   * @category Request
   * @typeParam ResolveType This method would typically resolve with the
   * patched resource or reject with an OperationOutcome. However, this may
   * depend on the server implementation or even on the request headers.
   * For that reason, if the default resolve type (which is
   * [[fhirclient.FHIR.Resource]]) does not work for you, you can pass
   * in your own resolve type parameter.
   */
  async patch(url, patch, requestOptions = {}) {
    (0, lib_1.assertJsonPatch)(patch);
    return this.request(Object.assign(Object.assign({}, requestOptions), {
      url,
      method: "PATCH",
      body: JSON.stringify(patch),
      headers: Object.assign({
        "prefer": "return=presentation",
        "content-type": "application/json-patch+json; charset=UTF-8"
      }, requestOptions.headers)
    }));
  }
  /**
   * @param requestOptions Can be a string URL (relative to the serviceUrl),
   * or an object which will be passed to fetch()
   * @param fhirOptions Additional options to control the behavior
   * @param _resolvedRefs DO NOT USE! Used internally.
   * @category Request
   */
  async request(requestOptions, fhirOptions = {}, _resolvedRefs = {}) {
    var _a;
    const debugRequest = lib_1.debug.extend("client:request");
    (0, lib_1.assert)(requestOptions, "request requires an url or request options as argument");
    // url -----------------------------------------------------------------
    let url;
    if (typeof requestOptions == "string" || requestOptions instanceof URL) {
      url = String(requestOptions);
      requestOptions = {};
    } else {
      url = String(requestOptions.url);
    }
    url = (0, lib_1.absolute)(url, this.state.serverUrl);
    const options = {
      graph: fhirOptions.graph !== false,
      flat: !!fhirOptions.flat,
      pageLimit: (_a = fhirOptions.pageLimit) !== null && _a !== void 0 ? _a : 1,
      resolveReferences: fhirOptions.resolveReferences || [],
      useRefreshToken: fhirOptions.useRefreshToken !== false,
      onPage: typeof fhirOptions.onPage == "function" ? fhirOptions.onPage : undefined
    };
    const signal = requestOptions.signal || undefined;
    // Refresh the access token if needed
    const job = options.useRefreshToken ? this.refreshIfNeeded({
      signal
    }).then(() => requestOptions) : Promise.resolve(requestOptions);
    let response;
    return job
    // Add the Authorization header now, after the access token might
    // have been updated
    .then(requestOptions => {
      const authHeader = this.getAuthorizationHeader();
      if (authHeader) {
        requestOptions.headers = Object.assign(Object.assign({}, requestOptions.headers), {
          authorization: authHeader
        });
      }
      return requestOptions;
    })
    // Make the request
    .then(requestOptions => {
      debugRequest("%s, options: %O, fhirOptions: %O", url, requestOptions, options);
      return (0, lib_1.request)(url, requestOptions).then(result => {
        if (requestOptions.includeResponse) {
          response = result.response;
          return result.body;
        }
        return result;
      });
    })
    // Handle 401 ------------------------------------------------------
    .catch(async error => {
      if (error.status == 401) {
        // !accessToken -> not authorized -> No session. Need to launch.
        if (!this.getState("tokenResponse.access_token")) {
          error.message += "\nThis app cannot be accessed directly. Please launch it as SMART app!";
          throw error;
        }
        // auto-refresh not enabled and Session expired.
        // Need to re-launch. Clear state to start over!
        if (!options.useRefreshToken) {
          debugRequest("Your session has expired and the useRefreshToken option is set to false. Please re-launch the app.");
          await this._clearState();
          error.message += "\n" + strings_1.default.expired;
          throw error;
        }
        // In rare cases we may have a valid access token and a refresh
        // token and the request might still fail with 401 just because
        // the access token has just been revoked.
        // otherwise -> auto-refresh failed. Session expired.
        // Need to re-launch. Clear state to start over!
        debugRequest("Auto-refresh failed! Please re-launch the app.");
        await this._clearState();
        error.message += "\n" + strings_1.default.expired;
        throw error;
      }
      throw error;
    })
    // Handle 403 ------------------------------------------------------
    .catch(error => {
      if (error.status == 403) {
        debugRequest("Permission denied! Please make sure that you have requested the proper scopes.");
      }
      throw error;
    }).then(data => {
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
      return (async _data => {
        if (_data.resourceType == "Bundle") {
          await Promise.all((_data.entry || []).map(item => resolveRefs(item.resource, options, _resolvedRefs, this, requestOptions)));
        } else {
          await resolveRefs(_data, options, _resolvedRefs, this, requestOptions);
        }
        return _data;
      })(data)
      // Pagination ----------------------------------------------
      .then(async _data => {
        if (_data && _data.resourceType == "Bundle") {
          const links = _data.link || [];
          if (options.flat) {
            _data = (_data.entry || []).map(entry => entry.resource);
          }
          if (options.onPage) {
            await options.onPage(_data, Object.assign({}, _resolvedRefs));
          }
          if (--options.pageLimit) {
            const next = links.find(l => l.relation == "next");
            _data = (0, lib_1.makeArray)(_data);
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
                return _data.concat((0, lib_1.makeArray)(nextPage.data || nextPage));
              }
              return _data.concat((0, lib_1.makeArray)(nextPage));
            }
          }
        }
        return _data;
      })
      // Finalize ------------------------------------------------
      .then(_data => {
        if (options.graph) {
          _resolvedRefs = {};
        } else if (!options.onPage && options.resolveReferences.length) {
          return {
            data: _data,
            references: _resolvedRefs
          };
        }
        return _data;
      }).then(_data => {
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
  /**
   * Checks if access token and refresh token are present. If they are, and if
   * the access token is expired or is about to expire in the next 10 seconds,
   * calls `this.refresh()` to obtain new access token.
   * @param requestOptions Any options to pass to the fetch call. Most of them
   * will be overridden, bit it might still be useful for passing additional
   * request options or an abort signal.
   * @category Request
   */
  refreshIfNeeded(requestOptions = {}) {
    const accessToken = this.getState("tokenResponse.access_token");
    const refreshToken = this.getState("tokenResponse.refresh_token");
    const expiresAt = this.state.expiresAt || 0;
    if (accessToken && refreshToken && expiresAt - 10 < Date.now() / 1000) {
      return this.refresh(requestOptions);
    }
    return Promise.resolve(this.state);
  }
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
  refresh(requestOptions = {}) {
    var _a, _b;
    const debugRefresh = lib_1.debug.extend("client:refresh");
    debugRefresh("Attempting to refresh with refresh_token...");
    const refreshToken = (_b = (_a = this.state) === null || _a === void 0 ? void 0 : _a.tokenResponse) === null || _b === void 0 ? void 0 : _b.refresh_token;
    (0, lib_1.assert)(refreshToken, "Unable to refresh. No refresh_token found.");
    const tokenUri = this.state.tokenUri;
    (0, lib_1.assert)(tokenUri, "Unable to refresh. No tokenUri found.");
    const scopes = this.getState("tokenResponse.scope") || "";
    const hasOfflineAccess = scopes.search(/\boffline_access\b/) > -1;
    const hasOnlineAccess = scopes.search(/\bonline_access\b/) > -1;
    (0, lib_1.assert)(hasOfflineAccess || hasOnlineAccess, "Unable to refresh. No offline_access or online_access scope found.");
    // This method is typically called internally from `request` if certain
    // request fails with 401. However, clients will often run multiple
    // requests in parallel which may result in multiple refresh calls.
    // To avoid that, we keep a reference to the current refresh task (if any).
    if (!this._refreshTask) {
      const refreshRequestOptions = Object.assign(Object.assign({
        credentials: this.environment.options.refreshTokenWithCredentials || "same-origin"
      }, requestOptions), {
        method: "POST",
        mode: "cors",
        headers: Object.assign(Object.assign({}, requestOptions.headers || {}), {
          "content-type": "application/x-www-form-urlencoded"
        }),
        body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(refreshToken)}`
      });
      // custom authorization header can be passed on manual calls
      if (!("authorization" in refreshRequestOptions.headers)) {
        const {
          clientSecret,
          clientId
        } = this.state;
        if (clientSecret) {
          // @ts-ignore
          refreshRequestOptions.headers.authorization = "Basic " + this.environment.btoa(clientId + ":" + clientSecret);
        }
      }
      this._refreshTask = (0, lib_1.request)(tokenUri, refreshRequestOptions).then(data => {
        (0, lib_1.assert)(data.access_token, "No access token received");
        debugRefresh("Received new access token response %O", data);
        this.state.tokenResponse = Object.assign(Object.assign({}, this.state.tokenResponse), data);
        this.state.expiresAt = (0, lib_1.getAccessTokenExpiration)(data, this.environment);
        return this.state;
      }).catch(error => {
        var _a, _b;
        if ((_b = (_a = this.state) === null || _a === void 0 ? void 0 : _a.tokenResponse) === null || _b === void 0 ? void 0 : _b.refresh_token) {
          debugRefresh("Deleting the expired or invalid refresh token.");
          delete this.state.tokenResponse.refresh_token;
        }
        throw error;
      }).finally(() => {
        this._refreshTask = null;
        const key = this.state.key;
        if (key) {
          this.environment.getStorage().set(key, this.state);
        } else {
          debugRefresh("No 'key' found in Clint.state. Cannot persist the instance.");
        }
      });
    }
    return this._refreshTask;
  }
  // utils -------------------------------------------------------------------
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
  byCode(observations, property) {
    return (0, lib_1.byCode)(observations, property);
  }
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
  byCodes(observations, property) {
    return (0, lib_1.byCodes)(observations, property);
  }
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
    return (0, lib_1.getPath)(obj, path);
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
    return (0, lib_1.getPath)(Object.assign({}, this.state), path);
  }
  /**
   * Returns a promise that will be resolved with the fhir version as defined
   * in the CapabilityStatement.
   */
  getFhirVersion() {
    return (0, lib_1.fetchConformanceStatement)(this.state.serverUrl).then(metadata => metadata.fhirVersion);
  }
  /**
   * Returns a promise that will be resolved with the numeric fhir version
   * - 2 for DSTU2
   * - 3 for STU3
   * - 4 for R4
   * - 0 if the version is not known
   */
  getFhirRelease() {
    return this.getFhirVersion().then(v => {
      var _a;
      return (_a = settings_1.fhirVersions[v]) !== null && _a !== void 0 ? _a : 0;
    });
  }
}
exports.default = Client;