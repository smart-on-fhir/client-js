/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ "./src/Client.ts":
/*!***********************!*\
  !*** ./src/Client.ts ***!
  \***********************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";


Object.defineProperty(exports, "__esModule", ({
  value: true
}));
const lib_1 = __webpack_require__(/*! ./lib */ "./src/lib.ts");
const strings_1 = __webpack_require__(/*! ./strings */ "./src/strings.ts");
const settings_1 = __webpack_require__(/*! ./settings */ "./src/settings.ts");
// $lab:coverage:off$
// @ts-ignore
const {
  Response
} =  true ? window : 0;
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
        return id ? this.request({
          ...requestOptions,
          url: `Patient/${id}`
        }) : Promise.reject(new Error("Patient is not available"));
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
        return id ? this.request({
          ...requestOptions,
          url: `Encounter/${id}`
        }) : Promise.reject(new Error("Encounter is not available"));
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
        return fhirUser ? this.request({
          ...requestOptions,
          url: fhirUser
        }) : Promise.reject(new Error("User is not available"));
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
        this.patient.api = fhirJs({
          ...options,
          patient: patientId
        });
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
    return this.request({
      ...requestOptions,
      url,
      method: "DELETE"
    });
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
    return this.request({
      ...requestOptions,
      url,
      method: "PATCH",
      body: JSON.stringify(patch),
      headers: {
        "prefer": "return=presentation",
        "content-type": "application/json-patch+json; charset=UTF-8",
        ...requestOptions.headers
      }
    });
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
        requestOptions.headers = {
          ...requestOptions.headers,
          authorization: authHeader
        };
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
            await options.onPage(_data, {
              ..._resolvedRefs
            });
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
      const refreshRequestOptions = {
        credentials: this.environment.options.refreshTokenWithCredentials || "same-origin",
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
        this.state.tokenResponse = {
          ...this.state.tokenResponse,
          ...data
        };
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
    return (0, lib_1.getPath)({
      ...this.state
    }, path);
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
exports["default"] = Client;

/***/ }),

/***/ "./src/HttpError.ts":
/*!**************************!*\
  !*** ./src/HttpError.ts ***!
  \**************************/
/***/ ((__unused_webpack_module, exports) => {

"use strict";


Object.defineProperty(exports, "__esModule", ({
  value: true
}));
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
          } else {
            this.message += "\n\n" + JSON.stringify(body, null, 4);
          }
        } else if (type.match(/^text\//i)) {
          let body = await this.response.text();
          if (body) {
            this.message += "\n\n" + body;
          }
        }
      } catch {
        // ignore
      }
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
exports["default"] = HttpError;

/***/ }),

/***/ "./src/adapters/BrowserAdapter.ts":
/*!****************************************!*\
  !*** ./src/adapters/BrowserAdapter.ts ***!
  \****************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";


Object.defineProperty(exports, "__esModule", ({
  value: true
}));
const smart_1 = __webpack_require__(/*! ../smart */ "./src/smart.ts");
const Client_1 = __webpack_require__(/*! ../Client */ "./src/Client.ts");
const BrowserStorage_1 = __webpack_require__(/*! ../storage/BrowserStorage */ "./src/storage/BrowserStorage.ts");
const security = __webpack_require__(/*! ../security/browser */ "./src/security/browser.ts");
const js_base64_1 = __webpack_require__(/*! js-base64 */ "./node_modules/js-base64/base64.js");
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
    this.security = security;
    this.options = {
      // Replaces the browser's current URL
      // using window.history.replaceState API or by reloading.
      replaceBrowserHistory: true,
      // When set to true, this variable will fully utilize
      // HTML5 sessionStorage API.
      // This variable can be overridden to false by setting
      // FHIR.oauth2.settings.fullSessionStorageSupport = false.
      // When set to false, the sessionStorage will be keyed
      // by a state variable. This is to allow the embedded IE browser
      // instances instantiated on a single thread to continue to
      // function without having sessionStorage data shared
      // across the embedded IE instances.
      fullSessionStorageSupport: true,
      // Do we want to send cookies while making a request to the token
      // endpoint in order to obtain new access token using existing
      // refresh token. In rare cases the auth server might require the
      // client to send cookies along with those requests. In this case
      // developers will have to change this before initializing the app
      // like so:
      // `FHIR.oauth2.settings.refreshTokenWithCredentials = "include";`
      // or
      // `FHIR.oauth2.settings.refreshTokenWithCredentials = "same-origin";`
      // Can be one of:
      // "include"     - always send cookies
      // "same-origin" - only send cookies if we are on the same domain (default)
      // "omit"        - do not send cookies
      refreshTokenWithCredentials: "same-origin",
      ...options
    };
  }
  /**
   * Given a relative path, returns an absolute url using the instance base URL
   */
  relative(path) {
    return new URL(path, this.getUrl().href).href;
  }
  /**
   * In browsers we need to be able to (dynamically) check if fhir.js is
   * included in the page. If it is, it should have created a "fhir" variable
   * in the global scope.
   */
  get fhir() {
    // @ts-ignore
    return typeof fhir === "function" ? fhir : null;
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
      this._storage = new BrowserStorage_1.default();
    }
    return this._storage;
  }
  /**
   * Returns a reference to the AbortController constructor. In browsers,
   * AbortController will always be available as global (native or polyfilled)
   */
  getAbortController() {
    return AbortController;
  }
  /**
   * ASCII string to Base64
   */
  atob(str) {
    return window.atob(str);
  }
  /**
   * Base64 to ASCII string
   */
  btoa(str) {
    return window.btoa(str);
  }
  base64urlencode(input) {
    if (typeof input == "string") {
      return (0, js_base64_1.encodeURL)(input);
    }
    return (0, js_base64_1.fromUint8Array)(input, true);
  }
  base64urldecode(input) {
    return (0, js_base64_1.decode)(input);
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
      ready: (...args) => (0, smart_1.ready)(this, ...args),
      authorize: options => (0, smart_1.authorize)(this, options),
      init: options => (0, smart_1.init)(this, options),
      client: state => new Client_1.default(this, state),
      options: this.options,
      utils: {
        security
      }
    };
  }
}
exports["default"] = BrowserAdapter;

/***/ }),

/***/ "./src/entry/browser.ts":
/*!******************************!*\
  !*** ./src/entry/browser.ts ***!
  \******************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


// In Browsers we create an adapter, get the SMART api from it and build the
// global FHIR object
const BrowserAdapter_1 = __webpack_require__(/*! ../adapters/BrowserAdapter */ "./src/adapters/BrowserAdapter.ts");
const adapter = new BrowserAdapter_1.default();
const {
  ready,
  authorize,
  init,
  client,
  options,
  utils
} = adapter.getSmartApi();
// We have two kinds of browser builds - "pure" for new browsers and "legacy"
// for old ones. In pure builds we assume that the browser supports everything
// we need. In legacy mode, the library also acts as a polyfill. Babel will
// automatically polyfill everything except "fetch", which we have to handle
// manually.
// @ts-ignore
if (false) {}
// $lab:coverage:off$
const FHIR = {
  AbortController: window.AbortController,
  client,
  utils,
  oauth2: {
    settings: options,
    ready,
    authorize,
    init
  }
};
module.exports = FHIR;
// $lab:coverage:on$

/***/ }),

/***/ "./src/lib.ts":
/*!********************!*\
  !*** ./src/lib.ts ***!
  \********************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";


/*
 * This file contains some shared functions. They are used by other modules, but
 * are defined here so that tests can import this library and test them.
 */
Object.defineProperty(exports, "__esModule", ({
  value: true
}));
exports.assertJsonPatch = exports.assert = exports.getTargetWindow = exports.getPatientParam = exports.byCodes = exports.byCode = exports.getAccessTokenExpiration = exports.getTimeInFuture = exports.jwtDecode = exports.randomString = exports.absolute = exports.makeArray = exports.setPath = exports.getPath = exports.fetchConformanceStatement = exports.getAndCache = exports.request = exports.loweCaseKeys = exports.responseToJSON = exports.checkResponse = exports.units = exports.debug = void 0;
const HttpError_1 = __webpack_require__(/*! ./HttpError */ "./src/HttpError.ts");
const settings_1 = __webpack_require__(/*! ./settings */ "./src/settings.ts");
const debug = __webpack_require__(/*! debug */ "./node_modules/debug/src/browser.js");
// $lab:coverage:off$
// @ts-ignore
const {
  fetch
} =  true ? window : 0;
// $lab:coverage:on$
const _debug = debug("FHIR");
exports.debug = _debug;
/**
 * The cache for the `getAndCache` function
 */
const cache = {};
/**
 * A namespace with functions for converting between different measurement units
 */
exports.units = {
  cm({
    code,
    value
  }) {
    ensureNumerical({
      code,
      value
    });
    if (code == "cm") return value;
    if (code == "m") return value * 100;
    if (code == "in") return value * 2.54;
    if (code == "[in_us]") return value * 2.54;
    if (code == "[in_i]") return value * 2.54;
    if (code == "ft") return value * 30.48;
    if (code == "[ft_us]") return value * 30.48;
    throw new Error("Unrecognized length unit: " + code);
  },
  kg({
    code,
    value
  }) {
    ensureNumerical({
      code,
      value
    });
    if (code == "kg") return value;
    if (code == "g") return value / 1000;
    if (code.match(/lb/)) return value / 2.20462;
    if (code.match(/oz/)) return value / 35.274;
    throw new Error("Unrecognized weight unit: " + code);
  },
  any(pq) {
    ensureNumerical(pq);
    return pq.value;
  }
};
/**
 * Assertion function to guard arguments for `units` functions
 */
function ensureNumerical({
  value,
  code
}) {
  if (typeof value !== "number") {
    throw new Error("Found a non-numerical unit: " + value + " " + code);
  }
}
/**
 * Used in fetch Promise chains to reject if the "ok" property is not true
 */
async function checkResponse(resp) {
  if (!resp.ok) {
    const error = new HttpError_1.default(resp);
    await error.parse();
    throw error;
  }
  return resp;
}
exports.checkResponse = checkResponse;
/**
 * Used in fetch Promise chains to return the JSON version of the response.
 * Note that `resp.json()` will throw on empty body so we use resp.text()
 * instead.
 */
function responseToJSON(resp) {
  return resp.text().then(text => text.length ? JSON.parse(text) : "");
}
exports.responseToJSON = responseToJSON;
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
exports.loweCaseKeys = loweCaseKeys;
/**
 * This is our built-in request function. It does a few things by default
 * (unless told otherwise):
 * - Makes CORS requests
 * - Sets accept header to "application/json"
 * - Handles errors
 * - If the response is json return the json object
 * - If the response is text return the result text
 * - Otherwise return the response object on which we call stuff like `.blob()`
 */
function request(url, requestOptions = {}) {
  const {
    includeResponse,
    ...options
  } = requestOptions;
  return fetch(url, {
    mode: "cors",
    ...options,
    headers: {
      accept: "application/json",
      ...loweCaseKeys(options.headers)
    }
  }).then(checkResponse).then(res => {
    const type = res.headers.get("content-type") + "";
    if (type.match(/\bjson\b/i)) {
      return responseToJSON(res).then(body => ({
        res,
        body
      }));
    }
    if (type.match(/^text\//i)) {
      return res.text().then(body => ({
        res,
        body
      }));
    }
    return {
      res
    };
  }).then(({
    res,
    body
  }) => {
    // Some servers will reply after CREATE with json content type but with
    // empty body. In this case check if a location header is received and
    // fetch that to use it as the final result.
    if (!body && res.status == 201) {
      const location = res.headers.get("location");
      if (location) {
        return request(location, {
          ...options,
          method: "GET",
          body: null,
          includeResponse
        });
      }
    }
    if (includeResponse) {
      return {
        body,
        response: res
      };
    }
    // For any non-text and non-json response return the Response object.
    // This to let users decide if they want to call text(), blob() or
    // something else on it
    if (body === undefined) {
      return res;
    }
    // Otherwise just return the parsed body (can also be "" or null)
    return body;
  });
}
exports.request = request;
/**
 * Makes a request using `fetch` and stores the result in internal memory cache.
 * The cache is cleared when the page is unloaded.
 * @param url The URL to request
 * @param requestOptions Request options
 * @param force If true, reload from source and update the cache, even if it has
 * already been cached.
 */
function getAndCache(url, requestOptions, force = "development" === "test") {
  if (force || !cache[url]) {
    cache[url] = request(url, requestOptions);
    return cache[url];
  }
  return Promise.resolve(cache[url]);
}
exports.getAndCache = getAndCache;
/**
 * Fetches the conformance statement from the given base URL.
 * Note that the result is cached in memory (until the page is reloaded in the
 * browser) because it might have to be re-used by the client
 * @param baseUrl The base URL of the FHIR server
 * @param [requestOptions] Any options passed to the fetch call
 */
function fetchConformanceStatement(baseUrl = "/", requestOptions) {
  const url = String(baseUrl).replace(/\/*$/, "/") + "metadata";
  return getAndCache(url, requestOptions).catch(ex => {
    throw new Error(`Failed to fetch the conformance statement from "${url}". ${ex}`);
  });
}
exports.fetchConformanceStatement = fetchConformanceStatement;
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
    } else {
      result = result[key];
    }
  }
  return result;
}
exports.getPath = getPath;
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
    } else {
      if (out && out[key] === undefined && createEmpty) {
        out[key] = arr[idx + 1].match(/^[0-9]+$/) ? [] : {};
      }
      return out ? out[key] : undefined;
    }
  }, obj);
  return obj;
}
exports.setPath = setPath;
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
exports.makeArray = makeArray;
/**
 * Given a path, converts it to absolute url based on the `baseUrl`. If baseUrl
 * is not provided, the result would be a rooted path (one that starts with `/`).
 * @param path The path to convert
 * @param baseUrl The base URL
 */
function absolute(path, baseUrl) {
  if (path.match(/^http/)) return path;
  if (path.match(/^urn/)) return path;
  return String(baseUrl || "").replace(/\/+$/, "") + "/" + path.replace(/^\/+/, "");
}
exports.absolute = absolute;
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
exports.randomString = randomString;
/**
 * Decodes a JWT token and returns it's body.
 * @param token The token to read
 * @param env An `Adapter` or any other object that has an `atob` method
 * @category Utility
 */
function jwtDecode(token, env) {
  const payload = token.split(".")[1];
  return payload ? JSON.parse(env.atob(payload)) : null;
}
exports.jwtDecode = jwtDecode;
/**
 * Add a supplied number of seconds to the supplied Date, returning
 * an integer number of seconds since the epoch
 * @param secondsAhead How far ahead, in seconds (defaults to 120 seconds)
 * @param from Initial time (defaults to current time)
 */
function getTimeInFuture(secondsAhead = 120, from) {
  return Math.floor(+(from || new Date()) / 1000 + secondsAhead);
}
exports.getTimeInFuture = getTimeInFuture;
/**
 * Given a token response, computes and returns the expiresAt timestamp.
 * Note that this should only be used immediately after an access token is
 * received, otherwise the computed timestamp will be incorrect.
 * @param tokenResponse
 * @param env
 */
function getAccessTokenExpiration(tokenResponse, env) {
  const now = Math.floor(Date.now() / 1000);
  // Option 1 - using the expires_in property of the token response
  if (tokenResponse.expires_in) {
    return now + tokenResponse.expires_in;
  }
  // Option 2 - using the exp property of JWT tokens (must not assume JWT!)
  if (tokenResponse.access_token) {
    let tokenBody = jwtDecode(tokenResponse.access_token, env);
    if (tokenBody && tokenBody.exp) {
      return tokenBody.exp;
    }
  }
  // Option 3 - if none of the above worked set this to 5 minutes after now
  return now + 300;
}
exports.getAccessTokenExpiration = getAccessTokenExpiration;
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
function byCode(observations, property) {
  const ret = {};
  function handleCodeableConcept(concept, observation) {
    if (concept && Array.isArray(concept.coding)) {
      concept.coding.forEach(({
        code
      }) => {
        if (code) {
          ret[code] = ret[code] || [];
          ret[code].push(observation);
        }
      });
    }
  }
  makeArray(observations).forEach(o => {
    if (o.resourceType === "Observation" && o[property]) {
      if (Array.isArray(o[property])) {
        o[property].forEach(concept => handleCodeableConcept(concept, o));
      } else {
        handleCodeableConcept(o[property], o);
      }
    }
  });
  return ret;
}
exports.byCode = byCode;
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
function byCodes(observations, property) {
  const bank = byCode(observations, property);
  return (...codes) => codes.filter(code => code + "" in bank).reduce((prev, code) => prev.concat(bank[code + ""]), []);
}
exports.byCodes = byCodes;
/**
 * Given a conformance statement and a resource type, returns the name of the
 * URL parameter that can be used to scope the resource type by patient ID.
 */
function getPatientParam(conformance, resourceType) {
  // Find what resources are supported by this server
  const resources = getPath(conformance, "rest.0.resource") || [];
  // Check if this resource is supported
  const meta = resources.find(r => r.type === resourceType);
  if (!meta) {
    throw new Error(`Resource "${resourceType}" is not supported by this FHIR server`);
  }
  // Check if any search parameters are available for this resource
  if (!Array.isArray(meta.searchParam)) {
    throw new Error(`No search parameters supported for "${resourceType}" on this FHIR server`);
  }
  // This is a rare case but could happen in generic workflows
  if (resourceType == "Patient" && meta.searchParam.find(x => x.name == "_id")) {
    return "_id";
  }
  // Now find the first possible parameter name
  const out = settings_1.patientParams.find(p => meta.searchParam.find(x => x.name == p));
  // If there is no match
  if (!out) {
    throw new Error("I don't know what param to use for " + resourceType);
  }
  return out;
}
exports.getPatientParam = getPatientParam;
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
    _debug("Invalid target type '%s'. Failing back to '_self'.", typeof target);
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
    let error,
      targetWindow = null;
    try {
      targetWindow = window.open("", "SMARTAuthPopup");
      if (!targetWindow) {
        throw new Error("Perhaps window.open was blocked");
      }
    } catch (e) {
      error = e;
    }
    if (!targetWindow) {
      _debug("Cannot open window. Failing back to '_self'. %s", error);
      return self;
    } else {
      return targetWindow;
    }
  }
  // Popup window
  if (target == "popup") {
    let error,
      targetWindow = null;
    // if (!targetWindow || targetWindow.closed) {
    try {
      targetWindow = window.open("", "SMARTAuthPopup", ["height=" + height, "width=" + width, "menubar=0", "resizable=1", "status=0", "top=" + (screen.height - height) / 2, "left=" + (screen.width - width) / 2].join(","));
      if (!targetWindow) {
        throw new Error("Perhaps the popup window was blocked");
      }
    } catch (e) {
      error = e;
    }
    if (!targetWindow) {
      _debug("Cannot open window. Failing back to '_self'. %s", error);
      return self;
    } else {
      return targetWindow;
    }
  }
  // Frame or window by name
  const winOrFrame = frames[target];
  if (winOrFrame) {
    return winOrFrame;
  }
  _debug("Unknown target '%s'. Failing back to '_self'.", target);
  return self;
}
exports.getTargetWindow = getTargetWindow;
function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}
exports.assert = assert;
function assertJsonPatch(patch) {
  assert(Array.isArray(patch), "The JSON patch must be an array");
  assert(patch.length > 0, "The JSON patch array should not be empty");
  patch.forEach(operation => {
    assert(["add", "replace", "test", "move", "copy", "remove"].indexOf(operation.op) > -1, 'Each patch operation must have an "op" property which must be one of: "add", "replace", "test", "move", "copy", "remove"');
    assert(operation.path && typeof operation.path, `Invalid "${operation.op}" operation. Missing "path" property`);
    if (operation.op == "add" || operation.op == "replace" || operation.op == "test") {
      assert("value" in operation, `Invalid "${operation.op}" operation. Missing "value" property`);
      assert(Object.keys(operation).length == 3, `Invalid "${operation.op}" operation. Contains unknown properties`);
    } else if (operation.op == "move" || operation.op == "copy") {
      assert(typeof operation.from == "string", `Invalid "${operation.op}" operation. Requires a string "from" property`);
      assert(Object.keys(operation).length == 3, `Invalid "${operation.op}" operation. Contains unknown properties`);
    } else {
      assert(Object.keys(operation).length == 2, `Invalid "${operation.op}" operation. Contains unknown properties`);
    }
  });
}
exports.assertJsonPatch = assertJsonPatch;

/***/ }),

/***/ "./src/security/browser.ts":
/*!*********************************!*\
  !*** ./src/security/browser.ts ***!
  \*********************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";


Object.defineProperty(exports, "__esModule", ({
  value: true
}));
exports.signCompactJws = exports.importJWK = exports.generatePKCEChallenge = exports.digestSha256 = exports.randomBytes = void 0;
const js_base64_1 = __webpack_require__(/*! js-base64 */ "./node_modules/js-base64/base64.js");
const crypto = typeof globalThis === "object" && globalThis.crypto ? globalThis.crypto : (__webpack_require__(/*! isomorphic-webcrypto */ "./node_modules/isomorphic-webcrypto/src/browser.mjs")["default"]);
const subtle = () => {
  if (!crypto.subtle) {
    if (!globalThis.isSecureContext) {
      throw new Error("Some of the required subtle crypto functionality is not " + "available unless you run this app in secure context (using " + "HTTPS or running locally). See " + "https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts");
    }
    throw new Error("Some of the required subtle crypto functionality is not " + "available in the current environment (no crypto.subtle)");
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
exports.randomBytes = randomBytes;
async function digestSha256(payload) {
  const prepared = new TextEncoder().encode(payload);
  const hash = await subtle().digest('SHA-256', prepared);
  return new Uint8Array(hash);
}
exports.digestSha256 = digestSha256;
const generatePKCEChallenge = async (entropy = 96) => {
  const inputBytes = randomBytes(entropy);
  const codeVerifier = (0, js_base64_1.fromUint8Array)(inputBytes, true);
  const codeChallenge = (0, js_base64_1.fromUint8Array)(await digestSha256(codeVerifier), true);
  return {
    codeChallenge,
    codeVerifier
  };
};
exports.generatePKCEChallenge = generatePKCEChallenge;
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
  } catch (e) {
    throw new Error(`The ${jwk.alg} is not supported by this browser: ${e}`);
  }
}
exports.importJWK = importJWK;
async function signCompactJws(alg, privateKey, header, payload) {
  const jwtHeader = JSON.stringify({
    ...header,
    alg
  });
  const jwtPayload = JSON.stringify(payload);
  const jwtAuthenticatedContent = `${(0, js_base64_1.encodeURL)(jwtHeader)}.${(0, js_base64_1.encodeURL)(jwtPayload)}`;
  const signature = await subtle().sign({
    ...privateKey.algorithm,
    hash: 'SHA-384'
  }, privateKey, new TextEncoder().encode(jwtAuthenticatedContent));
  return `${jwtAuthenticatedContent}.${(0, js_base64_1.fromUint8Array)(new Uint8Array(signature), true)}`;
}
exports.signCompactJws = signCompactJws;

/***/ }),

/***/ "./src/settings.ts":
/*!*************************!*\
  !*** ./src/settings.ts ***!
  \*************************/
/***/ ((__unused_webpack_module, exports) => {

"use strict";


Object.defineProperty(exports, "__esModule", ({
  value: true
}));
exports.SMART_KEY = exports.patientParams = exports.fhirVersions = exports.patientCompartment = void 0;
/**
 * Combined list of FHIR resource types accepting patient parameter in FHIR R2-R4
 */
exports.patientCompartment = ["Account", "AdverseEvent", "AllergyIntolerance", "Appointment", "AppointmentResponse", "AuditEvent", "Basic", "BodySite", "BodyStructure", "CarePlan", "CareTeam", "ChargeItem", "Claim", "ClaimResponse", "ClinicalImpression", "Communication", "CommunicationRequest", "Composition", "Condition", "Consent", "Coverage", "CoverageEligibilityRequest", "CoverageEligibilityResponse", "DetectedIssue", "DeviceRequest", "DeviceUseRequest", "DeviceUseStatement", "DiagnosticOrder", "DiagnosticReport", "DocumentManifest", "DocumentReference", "EligibilityRequest", "Encounter", "EnrollmentRequest", "EpisodeOfCare", "ExplanationOfBenefit", "FamilyMemberHistory", "Flag", "Goal", "Group", "ImagingManifest", "ImagingObjectSelection", "ImagingStudy", "Immunization", "ImmunizationEvaluation", "ImmunizationRecommendation", "Invoice", "List", "MeasureReport", "Media", "MedicationAdministration", "MedicationDispense", "MedicationOrder", "MedicationRequest", "MedicationStatement", "MolecularSequence", "NutritionOrder", "Observation", "Order", "Patient", "Person", "Procedure", "ProcedureRequest", "Provenance", "QuestionnaireResponse", "ReferralRequest", "RelatedPerson", "RequestGroup", "ResearchSubject", "RiskAssessment", "Schedule", "ServiceRequest", "Specimen", "SupplyDelivery", "SupplyRequest", "VisionPrescription"];
/**
 * Map of FHIR releases and their abstract version as number
 */
exports.fhirVersions = {
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
 * Combined (FHIR R2-R4) list of search parameters that can be used to scope
 * a request by patient ID.
 */
exports.patientParams = ["patient", "subject", "requester", "member", "actor", "beneficiary"];
/**
 * The name of the sessionStorage entry that contains the current key
 */
exports.SMART_KEY = "SMART_KEY";

/***/ }),

/***/ "./src/smart.ts":
/*!**********************!*\
  !*** ./src/smart.ts ***!
  \**********************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";


Object.defineProperty(exports, "__esModule", ({
  value: true
}));
exports.init = exports.buildTokenRequest = exports.ready = exports.onMessage = exports.isInPopUp = exports.isInFrame = exports.authorize = exports.getSecurityExtensions = exports.fetchWellKnownJson = exports.KEY = void 0;
/* global window */
const lib_1 = __webpack_require__(/*! ./lib */ "./src/lib.ts");
const Client_1 = __webpack_require__(/*! ./Client */ "./src/Client.ts");
const settings_1 = __webpack_require__(/*! ./settings */ "./src/settings.ts");
Object.defineProperty(exports, "KEY", ({
  enumerable: true,
  get: function () {
    return settings_1.SMART_KEY;
  }
}));
const debug = lib_1.debug.extend("oauth2");
function isBrowser() {
  return typeof window === "object";
}
/**
 * Fetches the well-known json file from the given base URL.
 * Note that the result is cached in memory (until the page is reloaded in the
 * browser) because it might have to be re-used by the client
 * @param baseUrl The base URL of the FHIR server
 */
function fetchWellKnownJson(baseUrl = "/", requestOptions) {
  const url = String(baseUrl).replace(/\/*$/, "/") + ".well-known/smart-configuration";
  return (0, lib_1.getAndCache)(url, requestOptions).catch(ex => {
    throw new Error(`Failed to fetch the well-known json "${url}". ${ex.message}`);
  });
}
exports.fetchWellKnownJson = fetchWellKnownJson;
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
  return (0, lib_1.fetchConformanceStatement)(baseUrl, requestOptions).then(meta => {
    const nsUri = "http://fhir-registry.smarthealthit.org/StructureDefinition/oauth-uris";
    const extensions = ((0, lib_1.getPath)(meta || {}, "rest.0.security.extension") || []).filter(e => e.url === nsUri).map(o => o.extension)[0];
    const out = {
      registrationUri: "",
      authorizeUri: "",
      tokenUri: "",
      codeChallengeMethods: []
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
  return getSecurityExtensionsFromWellKnownJson(baseUrl).catch(() => getSecurityExtensionsFromConformanceStatement(baseUrl));
}
exports.getSecurityExtensions = getSecurityExtensions;
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
async function authorize(env, params = {}) {
  const url = env.getUrl();
  // Multiple config for EHR launches ---------------------------------------
  if (Array.isArray(params)) {
    const urlISS = url.searchParams.get("iss") || url.searchParams.get("fhirServiceUrl");
    if (!urlISS) {
      throw new Error('Passing in an "iss" url parameter is required if authorize ' + 'uses multiple configurations');
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
    (0, lib_1.assert)(cfg, `No configuration found matching the current "iss" parameter "${urlISS}"`);
    return await authorize(env, cfg);
  }
  // ------------------------------------------------------------------------
  // Obtain input
  const {
    clientSecret,
    fakeTokenResponse,
    encounterId,
    target,
    width,
    height,
    pkceMode,
    clientPublicKeySetUrl,
    // Two deprecated values to use as fall-back values later
    redirect_uri,
    client_id
  } = params;
  let {
    iss,
    launch,
    patientId,
    fhirServiceUrl,
    redirectUri,
    noRedirect,
    scope = "",
    clientId,
    completeInTarget,
    clientPrivateJwk
  } = params;
  const storage = env.getStorage();
  // For these, a url param takes precedence over inline option
  iss = url.searchParams.get("iss") || iss;
  fhirServiceUrl = url.searchParams.get("fhirServiceUrl") || fhirServiceUrl;
  launch = url.searchParams.get("launch") || launch;
  patientId = url.searchParams.get("patientId") || patientId;
  clientId = url.searchParams.get("clientId") || clientId;
  // If there's still no clientId or redirectUri, check deprecated params 
  if (!clientId) {
    clientId = client_id;
  }
  if (!redirectUri) {
    redirectUri = redirect_uri;
  }
  if (!redirectUri) {
    redirectUri = env.relative(".");
  } else if (!redirectUri.match(/^https?\:\/\//)) {
    redirectUri = env.relative(redirectUri);
  }
  const serverUrl = String(iss || fhirServiceUrl || "");
  // Validate input
  if (!serverUrl) {
    throw new Error("No server url found. It must be specified as `iss` or as " + "`fhirServiceUrl` parameter");
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
      console.warn('Your app is being authorized from within an iframe or popup ' + 'window. Please be explicit and provide a "completeInTarget" ' + 'option. Use "true" to complete the authorization in the ' + 'same window, or "false" to try to complete it in the parent ' + 'or the opener window. See http://docs.smarthealthit.org/client-js/api.html');
    }
  }
  // If `authorize` is called, make sure we clear any previous state (in case
  // this is a re-authorize)
  const oldKey = await storage.get(settings_1.SMART_KEY);
  await storage.unset(oldKey);
  // create initial state
  const stateKey = (0, lib_1.randomString)(16);
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
  const fullSessionStorageSupport = isBrowser() ? (0, lib_1.getPath)(env, "options.fullSessionStorageSupport") : true;
  if (fullSessionStorageSupport) {
    await storage.set(settings_1.SMART_KEY, stateKey);
  }
  // fakeTokenResponse to override stuff (useful in development)
  if (fakeTokenResponse) {
    Object.assign(state.tokenResponse, fakeTokenResponse);
  }
  // Fixed patientId (useful in development)
  if (patientId) {
    Object.assign(state.tokenResponse, {
      patient: patientId
    });
  }
  // Fixed encounterId (useful in development)
  if (encounterId) {
    Object.assign(state.tokenResponse, {
      encounter: encounterId
    });
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
  const redirectParams = ["response_type=code", "client_id=" + encodeURIComponent(clientId || ""), "scope=" + encodeURIComponent(scope), "redirect_uri=" + encodeURIComponent(redirectUri), "aud=" + encodeURIComponent(serverUrl), "state=" + encodeURIComponent(stateKey)];
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
    win = await (0, lib_1.getTargetWindow)(target, width, height);
    if (win !== self) {
      try {
        // Also remove any old state from the target window and then
        // transfer the current state there
        win.sessionStorage.removeItem(oldKey);
        win.sessionStorage.setItem(stateKey, JSON.stringify(state));
      } catch (ex) {
        (0, lib_1.debug)(`Failed to modify window.sessionStorage. Perhaps it is from different origin?. Failing back to "_self". %s`, ex);
        win = self;
      }
    }
    if (win !== self) {
      try {
        win.location.href = redirectUrl;
        self.addEventListener("message", onMessage);
      } catch (ex) {
        (0, lib_1.debug)(`Failed to modify window.location. Perhaps it is from different origin?. Failing back to "_self". %s`, ex);
        self.location.href = redirectUrl;
      }
    } else {
      self.location.href = redirectUrl;
    }
    return;
  } else {
    return await env.redirect(redirectUrl);
  }
}
exports.authorize = authorize;
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
 * Checks if called within a frame. Only works in browsers!
 * If the current window has a `parent` or `top` properties that refer to
 * another window, returns true. If trying to access `top` or `parent` throws an
 * error, returns true. Otherwise returns `false`.
 */
function isInFrame() {
  try {
    return self !== top && parent !== self;
  } catch (e) {
    return true;
  }
}
exports.isInFrame = isInFrame;
/**
 * Checks if called within another window (popup or tab). Only works in browsers!
 * To consider itself called in a new window, this function verifies that:
 * 1. `self === top` (not in frame)
 * 2. `!!opener && opener !== self` The window has an opener
 * 3. `!!window.name` The window has a `name` set
 */
function isInPopUp() {
  try {
    return self === top && !!opener && opener !== self && !!window.name;
  } catch (e) {
    return false;
  }
}
exports.isInPopUp = isInPopUp;
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
exports.onMessage = onMessage;
/**
 * The ready function should only be called on the page that represents
 * the redirectUri. We typically land there after a redirect from the
 * authorization server, but this code will also be executed upon subsequent
 * navigation or page refresh.
 */
async function ready(env, options = {}) {
  var _a, _b;
  const url = env.getUrl();
  const Storage = env.getStorage();
  const params = url.searchParams;
  let key = params.get("state");
  const code = params.get("code");
  const authError = params.get("error");
  const authErrorDescription = params.get("error_description");
  if (!key) {
    key = await Storage.get(settings_1.SMART_KEY);
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
    throw new Error([authError, authErrorDescription].filter(Boolean).join(": "));
  }
  debug("key: %s, code: %s", key, code);
  // key might be coming from the page url so it might be empty or missing
  (0, lib_1.assert)(key, "No 'state' parameter found. Please (re)launch the app.");
  // Check if we have a previous state
  let state = await Storage.get(key);
  const fullSessionStorageSupport = isBrowser() ? (0, lib_1.getPath)(env, "options.fullSessionStorageSupport") : true;
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
      const {
        href,
        origin
      } = url;
      if (inFrame) {
        parent.postMessage({
          type: "completeAuth",
          url: href
        }, origin);
      }
      if (inPopUp) {
        opener.postMessage({
          type: "completeAuth",
          url: href
        }, origin);
        window.close();
      }
      return new Promise(() => {});
    }
  }
  url.searchParams.delete("complete");
  // Do we have to remove the `code` and `state` params from the URL?
  const hasState = params.has("state");
  if (isBrowser() && (0, lib_1.getPath)(env, "options.replaceBrowserHistory") && (code || hasState)) {
    // `code` is the flag that tell us to request an access token.
    // We have to remove it, otherwise the page will authorize on
    // every load!
    if (code) {
      params.delete("code");
      debug("Removed code parameter from the url.");
    }
    // If we have `fullSessionStorageSupport` it means we no longer
    // need the `state` key. It will be stored to a well know
    // location - sessionStorage[SMART_KEY]. However, no
    // fullSessionStorageSupport means that this "well know location"
    // might be shared between windows and tabs. In this case we
    // MUST keep the `state` url parameter.
    if (hasState && fullSessionStorageSupport) {
      params.delete("state");
      debug("Removed state parameter from the url.");
    }
    // If the browser does not support the replaceState method for the
    // History Web API, the "code" parameter cannot be removed. As a
    // consequence, the page will (re)authorize on every load. The
    // workaround is to reload the page to new location without those
    // parameters. If that is not acceptable replaceBrowserHistory
    // should be set to false.
    if (window.history.replaceState) {
      window.history.replaceState({}, "", url.href);
    }
  }
  // If the state does not exist, it means the page has been loaded directly.
  (0, lib_1.assert)(state, "No state found! Please (re)launch the app.");
  // Assume the client has already completed a token exchange when
  // there is no code (but we have a state) or access token is found in state
  const authorized = !code || ((_a = state.tokenResponse) === null || _a === void 0 ? void 0 : _a.access_token);
  // If we are authorized already, then this is just a reload.
  // Otherwise, we have to complete the code flow
  if (!authorized && state.tokenUri) {
    (0, lib_1.assert)(code, "'code' url parameter is required");
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
    const tokenResponse = await (0, lib_1.request)(state.tokenUri, requestOptions);
    debug("Token response: %O", tokenResponse);
    (0, lib_1.assert)(tokenResponse.access_token, "Failed to obtain access token.");
    // Now we need to determine when is this authorization going to expire
    state.expiresAt = (0, lib_1.getAccessTokenExpiration)(tokenResponse, env);
    // save the tokenResponse so that we don't have to re-authorize on
    // every page reload
    state = {
      ...state,
      tokenResponse
    };
    await Storage.set(key, state);
    debug("Authorization successful!");
  } else {
    debug(((_b = state.tokenResponse) === null || _b === void 0 ? void 0 : _b.access_token) ? "Already authorized" : "No authorization needed");
  }
  if (fullSessionStorageSupport) {
    await Storage.set(settings_1.SMART_KEY, key);
  }
  const client = new Client_1.default(env, state);
  debug("Created client instance: %O", client);
  return client;
}
exports.ready = ready;
/**
 * Builds the token request options. Does not make the request, just
 * creates it's configuration and returns it in a Promise.
 */
async function buildTokenRequest(env, {
  code,
  state,
  clientPublicKeySetUrl,
  privateKey
}) {
  const {
    redirectUri,
    clientSecret,
    tokenUri,
    clientId,
    codeVerifier
  } = state;
  (0, lib_1.assert)(redirectUri, "Missing state.redirectUri");
  (0, lib_1.assert)(tokenUri, "Missing state.tokenUri");
  (0, lib_1.assert)(clientId, "Missing state.clientId");
  const requestOptions = {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded"
    },
    body: `code=${code}&grant_type=authorization_code&redirect_uri=${encodeURIComponent(redirectUri)}`
  };
  // For public apps, authentication is not possible (and thus not required),
  // since a client with no secret cannot prove its identity when it issues a
  // call. (The end-to-end system can still be secure because the client comes
  // from a known, https protected endpoint specified and enforced by the
  // redirect uri.) For confidential apps, an Authorization header using HTTP
  // Basic authentication is required, where the username is the app’s
  // client_id and the password is the app’s client_secret (see example).
  if (clientSecret) {
    requestOptions.headers.authorization = "Basic " + env.btoa(clientId + ":" + clientSecret);
    debug("Using state.clientSecret to construct the authorization header: %s", requestOptions.headers.authorization);
  }
  // Asymmetric auth
  else if (privateKey) {
    const pk = "key" in privateKey ? privateKey.key : await env.security.importJWK(privateKey);
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
      exp: (0, lib_1.getTimeInFuture)(120) // two minutes in the future
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
exports.buildTokenRequest = buildTokenRequest;
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
 */
async function init(env, authorizeOptions, readyOptions) {
  const url = env.getUrl();
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  // if `code` and `state` params are present we need to complete the auth flow
  if (code && state) {
    return ready(env, readyOptions);
  }
  // Check for existing client state. If state is found, it means a client
  // instance have already been created in this session and we should try to
  // "revive" it.
  const storage = env.getStorage();
  const key = state || (await storage.get(settings_1.SMART_KEY));
  const cached = await storage.get(key);
  if (cached) {
    return new Client_1.default(env, cached);
  }
  // Otherwise try to launch
  return authorize(env, authorizeOptions).then(() => {
    // `init` promises a Client but that cannot happen in this case. The
    // browser will be redirected (unload the page and be redirected back
    // to it later and the same init function will be called again). On
    // success, authorize will resolve with the redirect url but we don't
    // want to return that from this promise chain because it is not a
    // Client instance. At the same time, if authorize fails, we do want to
    // pass the error to those waiting for a client instance.
    return new Promise(() => {});
  });
}
exports.init = init;

/***/ }),

/***/ "./src/storage/BrowserStorage.ts":
/*!***************************************!*\
  !*** ./src/storage/BrowserStorage.ts ***!
  \***************************************/
/***/ ((__unused_webpack_module, exports) => {

"use strict";


Object.defineProperty(exports, "__esModule", ({
  value: true
}));
class Storage {
  /**
   * Gets the value at `key`. Returns a promise that will be resolved
   * with that value (or undefined for missing keys).
   */
  async get(key) {
    const value = sessionStorage[key];
    if (value) {
      return JSON.parse(value);
    }
    return null;
  }
  /**
   * Sets the `value` on `key` and returns a promise that will be resolved
   * with the value that was set.
   */
  async set(key, value) {
    sessionStorage[key] = JSON.stringify(value);
    return value;
  }
  /**
   * Deletes the value at `key`. Returns a promise that will be resolved
   * with true if the key was deleted or with false if it was not (eg. if
   * did not exist).
   */
  async unset(key) {
    if (key in sessionStorage) {
      delete sessionStorage[key];
      return true;
    }
    return false;
  }
}
exports["default"] = Storage;

/***/ }),

/***/ "./src/strings.ts":
/*!************************!*\
  !*** ./src/strings.ts ***!
  \************************/
/***/ ((__unused_webpack_module, exports) => {

"use strict";


Object.defineProperty(exports, "__esModule", ({
  value: true
}));
// This map contains reusable debug messages (only those used in multiple places)
exports["default"] = {
  expired: "Session expired! Please re-launch the app",
  noScopeForId: "Trying to get the ID of the selected %s. Please add 'launch' or 'launch/%s' to the requested scopes and try again.",
  noIfNoAuth: "You are trying to get %s but the app is not authorized yet.",
  noFreeContext: "Please don't use open fhir servers if you need to access launch context items like the %S."
};

/***/ }),

/***/ "./node_modules/debug/src/browser.js":
/*!*******************************************!*\
  !*** ./node_modules/debug/src/browser.js ***!
  \*******************************************/
/***/ ((module, exports, __webpack_require__) => {

/* eslint-env browser */

/**
 * This is the web browser implementation of `debug()`.
 */

exports.formatArgs = formatArgs;
exports.save = save;
exports.load = load;
exports.useColors = useColors;
exports.storage = localstorage();
exports.destroy = (() => {
	let warned = false;

	return () => {
		if (!warned) {
			warned = true;
			console.warn('Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.');
		}
	};
})();

/**
 * Colors.
 */

exports.colors = [
	'#0000CC',
	'#0000FF',
	'#0033CC',
	'#0033FF',
	'#0066CC',
	'#0066FF',
	'#0099CC',
	'#0099FF',
	'#00CC00',
	'#00CC33',
	'#00CC66',
	'#00CC99',
	'#00CCCC',
	'#00CCFF',
	'#3300CC',
	'#3300FF',
	'#3333CC',
	'#3333FF',
	'#3366CC',
	'#3366FF',
	'#3399CC',
	'#3399FF',
	'#33CC00',
	'#33CC33',
	'#33CC66',
	'#33CC99',
	'#33CCCC',
	'#33CCFF',
	'#6600CC',
	'#6600FF',
	'#6633CC',
	'#6633FF',
	'#66CC00',
	'#66CC33',
	'#9900CC',
	'#9900FF',
	'#9933CC',
	'#9933FF',
	'#99CC00',
	'#99CC33',
	'#CC0000',
	'#CC0033',
	'#CC0066',
	'#CC0099',
	'#CC00CC',
	'#CC00FF',
	'#CC3300',
	'#CC3333',
	'#CC3366',
	'#CC3399',
	'#CC33CC',
	'#CC33FF',
	'#CC6600',
	'#CC6633',
	'#CC9900',
	'#CC9933',
	'#CCCC00',
	'#CCCC33',
	'#FF0000',
	'#FF0033',
	'#FF0066',
	'#FF0099',
	'#FF00CC',
	'#FF00FF',
	'#FF3300',
	'#FF3333',
	'#FF3366',
	'#FF3399',
	'#FF33CC',
	'#FF33FF',
	'#FF6600',
	'#FF6633',
	'#FF9900',
	'#FF9933',
	'#FFCC00',
	'#FFCC33'
];

/**
 * Currently only WebKit-based Web Inspectors, Firefox >= v31,
 * and the Firebug extension (any Firefox version) are known
 * to support "%c" CSS customizations.
 *
 * TODO: add a `localStorage` variable to explicitly enable/disable colors
 */

// eslint-disable-next-line complexity
function useColors() {
	// NB: In an Electron preload script, document will be defined but not fully
	// initialized. Since we know we're in Chrome, we'll just detect this case
	// explicitly
	if (typeof window !== 'undefined' && window.process && (window.process.type === 'renderer' || window.process.__nwjs)) {
		return true;
	}

	// Internet Explorer and Edge do not support colors.
	if (typeof navigator !== 'undefined' && navigator.userAgent && navigator.userAgent.toLowerCase().match(/(edge|trident)\/(\d+)/)) {
		return false;
	}

	let m;

	// Is webkit? http://stackoverflow.com/a/16459606/376773
	// document is undefined in react-native: https://github.com/facebook/react-native/pull/1632
	return (typeof document !== 'undefined' && document.documentElement && document.documentElement.style && document.documentElement.style.WebkitAppearance) ||
		// Is firebug? http://stackoverflow.com/a/398120/376773
		(typeof window !== 'undefined' && window.console && (window.console.firebug || (window.console.exception && window.console.table))) ||
		// Is firefox >= v31?
		// https://developer.mozilla.org/en-US/docs/Tools/Web_Console#Styling_messages
		(typeof navigator !== 'undefined' && navigator.userAgent && (m = navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/)) && parseInt(m[1], 10) >= 31) ||
		// Double check webkit in userAgent just in case we are in a worker
		(typeof navigator !== 'undefined' && navigator.userAgent && navigator.userAgent.toLowerCase().match(/applewebkit\/(\d+)/));
}

/**
 * Colorize log arguments if enabled.
 *
 * @api public
 */

function formatArgs(args) {
	args[0] = (this.useColors ? '%c' : '') +
		this.namespace +
		(this.useColors ? ' %c' : ' ') +
		args[0] +
		(this.useColors ? '%c ' : ' ') +
		'+' + module.exports.humanize(this.diff);

	if (!this.useColors) {
		return;
	}

	const c = 'color: ' + this.color;
	args.splice(1, 0, c, 'color: inherit');

	// The final "%c" is somewhat tricky, because there could be other
	// arguments passed either before or after the %c, so we need to
	// figure out the correct index to insert the CSS into
	let index = 0;
	let lastC = 0;
	args[0].replace(/%[a-zA-Z%]/g, match => {
		if (match === '%%') {
			return;
		}
		index++;
		if (match === '%c') {
			// We only are interested in the *last* %c
			// (the user may have provided their own)
			lastC = index;
		}
	});

	args.splice(lastC, 0, c);
}

/**
 * Invokes `console.debug()` when available.
 * No-op when `console.debug` is not a "function".
 * If `console.debug` is not available, falls back
 * to `console.log`.
 *
 * @api public
 */
exports.log = console.debug || console.log || (() => {});

/**
 * Save `namespaces`.
 *
 * @param {String} namespaces
 * @api private
 */
function save(namespaces) {
	try {
		if (namespaces) {
			exports.storage.setItem('debug', namespaces);
		} else {
			exports.storage.removeItem('debug');
		}
	} catch (error) {
		// Swallow
		// XXX (@Qix-) should we be logging these?
	}
}

/**
 * Load `namespaces`.
 *
 * @return {String} returns the previously persisted debug modes
 * @api private
 */
function load() {
	let r;
	try {
		r = exports.storage.getItem('debug');
	} catch (error) {
		// Swallow
		// XXX (@Qix-) should we be logging these?
	}

	// If debug isn't set in LS, and we're in Electron, try to load $DEBUG
	if (!r && typeof process !== 'undefined' && 'env' in process) {
		r = process.env.DEBUG;
	}

	return r;
}

/**
 * Localstorage attempts to return the localstorage.
 *
 * This is necessary because safari throws
 * when a user disables cookies/localstorage
 * and you attempt to access it.
 *
 * @return {LocalStorage}
 * @api private
 */

function localstorage() {
	try {
		// TVMLKit (Apple TV JS Runtime) does not have a window object, just localStorage in the global context
		// The Browser also has localStorage in the global context.
		return localStorage;
	} catch (error) {
		// Swallow
		// XXX (@Qix-) should we be logging these?
	}
}

module.exports = __webpack_require__(/*! ./common */ "./node_modules/debug/src/common.js")(exports);

const {formatters} = module.exports;

/**
 * Map %j to `JSON.stringify()`, since no Web Inspectors do that by default.
 */

formatters.j = function (v) {
	try {
		return JSON.stringify(v);
	} catch (error) {
		return '[UnexpectedJSONParseError]: ' + error.message;
	}
};


/***/ }),

/***/ "./node_modules/debug/src/common.js":
/*!******************************************!*\
  !*** ./node_modules/debug/src/common.js ***!
  \******************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {


/**
 * This is the common logic for both the Node.js and web browser
 * implementations of `debug()`.
 */

function setup(env) {
	createDebug.debug = createDebug;
	createDebug.default = createDebug;
	createDebug.coerce = coerce;
	createDebug.disable = disable;
	createDebug.enable = enable;
	createDebug.enabled = enabled;
	createDebug.humanize = __webpack_require__(/*! ms */ "./node_modules/ms/index.js");
	createDebug.destroy = destroy;

	Object.keys(env).forEach(key => {
		createDebug[key] = env[key];
	});

	/**
	* The currently active debug mode names, and names to skip.
	*/

	createDebug.names = [];
	createDebug.skips = [];

	/**
	* Map of special "%n" handling functions, for the debug "format" argument.
	*
	* Valid key names are a single, lower or upper-case letter, i.e. "n" and "N".
	*/
	createDebug.formatters = {};

	/**
	* Selects a color for a debug namespace
	* @param {String} namespace The namespace string for the debug instance to be colored
	* @return {Number|String} An ANSI color code for the given namespace
	* @api private
	*/
	function selectColor(namespace) {
		let hash = 0;

		for (let i = 0; i < namespace.length; i++) {
			hash = ((hash << 5) - hash) + namespace.charCodeAt(i);
			hash |= 0; // Convert to 32bit integer
		}

		return createDebug.colors[Math.abs(hash) % createDebug.colors.length];
	}
	createDebug.selectColor = selectColor;

	/**
	* Create a debugger with the given `namespace`.
	*
	* @param {String} namespace
	* @return {Function}
	* @api public
	*/
	function createDebug(namespace) {
		let prevTime;
		let enableOverride = null;
		let namespacesCache;
		let enabledCache;

		function debug(...args) {
			// Disabled?
			if (!debug.enabled) {
				return;
			}

			const self = debug;

			// Set `diff` timestamp
			const curr = Number(new Date());
			const ms = curr - (prevTime || curr);
			self.diff = ms;
			self.prev = prevTime;
			self.curr = curr;
			prevTime = curr;

			args[0] = createDebug.coerce(args[0]);

			if (typeof args[0] !== 'string') {
				// Anything else let's inspect with %O
				args.unshift('%O');
			}

			// Apply any `formatters` transformations
			let index = 0;
			args[0] = args[0].replace(/%([a-zA-Z%])/g, (match, format) => {
				// If we encounter an escaped % then don't increase the array index
				if (match === '%%') {
					return '%';
				}
				index++;
				const formatter = createDebug.formatters[format];
				if (typeof formatter === 'function') {
					const val = args[index];
					match = formatter.call(self, val);

					// Now we need to remove `args[index]` since it's inlined in the `format`
					args.splice(index, 1);
					index--;
				}
				return match;
			});

			// Apply env-specific formatting (colors, etc.)
			createDebug.formatArgs.call(self, args);

			const logFn = self.log || createDebug.log;
			logFn.apply(self, args);
		}

		debug.namespace = namespace;
		debug.useColors = createDebug.useColors();
		debug.color = createDebug.selectColor(namespace);
		debug.extend = extend;
		debug.destroy = createDebug.destroy; // XXX Temporary. Will be removed in the next major release.

		Object.defineProperty(debug, 'enabled', {
			enumerable: true,
			configurable: false,
			get: () => {
				if (enableOverride !== null) {
					return enableOverride;
				}
				if (namespacesCache !== createDebug.namespaces) {
					namespacesCache = createDebug.namespaces;
					enabledCache = createDebug.enabled(namespace);
				}

				return enabledCache;
			},
			set: v => {
				enableOverride = v;
			}
		});

		// Env-specific initialization logic for debug instances
		if (typeof createDebug.init === 'function') {
			createDebug.init(debug);
		}

		return debug;
	}

	function extend(namespace, delimiter) {
		const newDebug = createDebug(this.namespace + (typeof delimiter === 'undefined' ? ':' : delimiter) + namespace);
		newDebug.log = this.log;
		return newDebug;
	}

	/**
	* Enables a debug mode by namespaces. This can include modes
	* separated by a colon and wildcards.
	*
	* @param {String} namespaces
	* @api public
	*/
	function enable(namespaces) {
		createDebug.save(namespaces);
		createDebug.namespaces = namespaces;

		createDebug.names = [];
		createDebug.skips = [];

		let i;
		const split = (typeof namespaces === 'string' ? namespaces : '').split(/[\s,]+/);
		const len = split.length;

		for (i = 0; i < len; i++) {
			if (!split[i]) {
				// ignore empty strings
				continue;
			}

			namespaces = split[i].replace(/\*/g, '.*?');

			if (namespaces[0] === '-') {
				createDebug.skips.push(new RegExp('^' + namespaces.slice(1) + '$'));
			} else {
				createDebug.names.push(new RegExp('^' + namespaces + '$'));
			}
		}
	}

	/**
	* Disable debug output.
	*
	* @return {String} namespaces
	* @api public
	*/
	function disable() {
		const namespaces = [
			...createDebug.names.map(toNamespace),
			...createDebug.skips.map(toNamespace).map(namespace => '-' + namespace)
		].join(',');
		createDebug.enable('');
		return namespaces;
	}

	/**
	* Returns true if the given mode name is enabled, false otherwise.
	*
	* @param {String} name
	* @return {Boolean}
	* @api public
	*/
	function enabled(name) {
		if (name[name.length - 1] === '*') {
			return true;
		}

		let i;
		let len;

		for (i = 0, len = createDebug.skips.length; i < len; i++) {
			if (createDebug.skips[i].test(name)) {
				return false;
			}
		}

		for (i = 0, len = createDebug.names.length; i < len; i++) {
			if (createDebug.names[i].test(name)) {
				return true;
			}
		}

		return false;
	}

	/**
	* Convert regexp to namespace
	*
	* @param {RegExp} regxep
	* @return {String} namespace
	* @api private
	*/
	function toNamespace(regexp) {
		return regexp.toString()
			.substring(2, regexp.toString().length - 2)
			.replace(/\.\*\?$/, '*');
	}

	/**
	* Coerce `val`.
	*
	* @param {Mixed} val
	* @return {Mixed}
	* @api private
	*/
	function coerce(val) {
		if (val instanceof Error) {
			return val.stack || val.message;
		}
		return val;
	}

	/**
	* XXX DO NOT USE. This is a temporary stub function.
	* XXX It WILL be removed in the next major release.
	*/
	function destroy() {
		console.warn('Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.');
	}

	createDebug.enable(createDebug.load());

	return createDebug;
}

module.exports = setup;


/***/ }),

/***/ "./node_modules/js-base64/base64.js":
/*!******************************************!*\
  !*** ./node_modules/js-base64/base64.js ***!
  \******************************************/
/***/ (function(module, __unused_webpack_exports, __webpack_require__) {

//
// THIS FILE IS AUTOMATICALLY GENERATED! DO NOT EDIT BY HAND!
//
;
(function (global, factory) {
     true
        ? module.exports = factory()
        : 0;
}((typeof self !== 'undefined' ? self
    : typeof window !== 'undefined' ? window
        : typeof __webpack_require__.g !== 'undefined' ? __webpack_require__.g
            : this), function () {
    'use strict';
    /**
     *  base64.ts
     *
     *  Licensed under the BSD 3-Clause License.
     *    http://opensource.org/licenses/BSD-3-Clause
     *
     *  References:
     *    http://en.wikipedia.org/wiki/Base64
     *
     * @author Dan Kogai (https://github.com/dankogai)
     */
    var version = '3.7.7';
    /**
     * @deprecated use lowercase `version`.
     */
    var VERSION = version;
    var _hasBuffer = typeof Buffer === 'function';
    var _TD = typeof TextDecoder === 'function' ? new TextDecoder() : undefined;
    var _TE = typeof TextEncoder === 'function' ? new TextEncoder() : undefined;
    var b64ch = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    var b64chs = Array.prototype.slice.call(b64ch);
    var b64tab = (function (a) {
        var tab = {};
        a.forEach(function (c, i) { return tab[c] = i; });
        return tab;
    })(b64chs);
    var b64re = /^(?:[A-Za-z\d+\/]{4})*?(?:[A-Za-z\d+\/]{2}(?:==)?|[A-Za-z\d+\/]{3}=?)?$/;
    var _fromCC = String.fromCharCode.bind(String);
    var _U8Afrom = typeof Uint8Array.from === 'function'
        ? Uint8Array.from.bind(Uint8Array)
        : function (it) { return new Uint8Array(Array.prototype.slice.call(it, 0)); };
    var _mkUriSafe = function (src) { return src
        .replace(/=/g, '').replace(/[+\/]/g, function (m0) { return m0 == '+' ? '-' : '_'; }); };
    var _tidyB64 = function (s) { return s.replace(/[^A-Za-z0-9\+\/]/g, ''); };
    /**
     * polyfill version of `btoa`
     */
    var btoaPolyfill = function (bin) {
        // console.log('polyfilled');
        var u32, c0, c1, c2, asc = '';
        var pad = bin.length % 3;
        for (var i = 0; i < bin.length;) {
            if ((c0 = bin.charCodeAt(i++)) > 255 ||
                (c1 = bin.charCodeAt(i++)) > 255 ||
                (c2 = bin.charCodeAt(i++)) > 255)
                throw new TypeError('invalid character found');
            u32 = (c0 << 16) | (c1 << 8) | c2;
            asc += b64chs[u32 >> 18 & 63]
                + b64chs[u32 >> 12 & 63]
                + b64chs[u32 >> 6 & 63]
                + b64chs[u32 & 63];
        }
        return pad ? asc.slice(0, pad - 3) + "===".substring(pad) : asc;
    };
    /**
     * does what `window.btoa` of web browsers do.
     * @param {String} bin binary string
     * @returns {string} Base64-encoded string
     */
    var _btoa = typeof btoa === 'function' ? function (bin) { return btoa(bin); }
        : _hasBuffer ? function (bin) { return Buffer.from(bin, 'binary').toString('base64'); }
            : btoaPolyfill;
    var _fromUint8Array = _hasBuffer
        ? function (u8a) { return Buffer.from(u8a).toString('base64'); }
        : function (u8a) {
            // cf. https://stackoverflow.com/questions/12710001/how-to-convert-uint8-array-to-base64-encoded-string/12713326#12713326
            var maxargs = 0x1000;
            var strs = [];
            for (var i = 0, l = u8a.length; i < l; i += maxargs) {
                strs.push(_fromCC.apply(null, u8a.subarray(i, i + maxargs)));
            }
            return _btoa(strs.join(''));
        };
    /**
     * converts a Uint8Array to a Base64 string.
     * @param {boolean} [urlsafe] URL-and-filename-safe a la RFC4648 §5
     * @returns {string} Base64 string
     */
    var fromUint8Array = function (u8a, urlsafe) {
        if (urlsafe === void 0) { urlsafe = false; }
        return urlsafe ? _mkUriSafe(_fromUint8Array(u8a)) : _fromUint8Array(u8a);
    };
    // This trick is found broken https://github.com/dankogai/js-base64/issues/130
    // const utob = (src: string) => unescape(encodeURIComponent(src));
    // reverting good old fationed regexp
    var cb_utob = function (c) {
        if (c.length < 2) {
            var cc = c.charCodeAt(0);
            return cc < 0x80 ? c
                : cc < 0x800 ? (_fromCC(0xc0 | (cc >>> 6))
                    + _fromCC(0x80 | (cc & 0x3f)))
                    : (_fromCC(0xe0 | ((cc >>> 12) & 0x0f))
                        + _fromCC(0x80 | ((cc >>> 6) & 0x3f))
                        + _fromCC(0x80 | (cc & 0x3f)));
        }
        else {
            var cc = 0x10000
                + (c.charCodeAt(0) - 0xD800) * 0x400
                + (c.charCodeAt(1) - 0xDC00);
            return (_fromCC(0xf0 | ((cc >>> 18) & 0x07))
                + _fromCC(0x80 | ((cc >>> 12) & 0x3f))
                + _fromCC(0x80 | ((cc >>> 6) & 0x3f))
                + _fromCC(0x80 | (cc & 0x3f)));
        }
    };
    var re_utob = /[\uD800-\uDBFF][\uDC00-\uDFFFF]|[^\x00-\x7F]/g;
    /**
     * @deprecated should have been internal use only.
     * @param {string} src UTF-8 string
     * @returns {string} UTF-16 string
     */
    var utob = function (u) { return u.replace(re_utob, cb_utob); };
    //
    var _encode = _hasBuffer
        ? function (s) { return Buffer.from(s, 'utf8').toString('base64'); }
        : _TE
            ? function (s) { return _fromUint8Array(_TE.encode(s)); }
            : function (s) { return _btoa(utob(s)); };
    /**
     * converts a UTF-8-encoded string to a Base64 string.
     * @param {boolean} [urlsafe] if `true` make the result URL-safe
     * @returns {string} Base64 string
     */
    var encode = function (src, urlsafe) {
        if (urlsafe === void 0) { urlsafe = false; }
        return urlsafe
            ? _mkUriSafe(_encode(src))
            : _encode(src);
    };
    /**
     * converts a UTF-8-encoded string to URL-safe Base64 RFC4648 §5.
     * @returns {string} Base64 string
     */
    var encodeURI = function (src) { return encode(src, true); };
    // This trick is found broken https://github.com/dankogai/js-base64/issues/130
    // const btou = (src: string) => decodeURIComponent(escape(src));
    // reverting good old fationed regexp
    var re_btou = /[\xC0-\xDF][\x80-\xBF]|[\xE0-\xEF][\x80-\xBF]{2}|[\xF0-\xF7][\x80-\xBF]{3}/g;
    var cb_btou = function (cccc) {
        switch (cccc.length) {
            case 4:
                var cp = ((0x07 & cccc.charCodeAt(0)) << 18)
                    | ((0x3f & cccc.charCodeAt(1)) << 12)
                    | ((0x3f & cccc.charCodeAt(2)) << 6)
                    | (0x3f & cccc.charCodeAt(3)), offset = cp - 0x10000;
                return (_fromCC((offset >>> 10) + 0xD800)
                    + _fromCC((offset & 0x3FF) + 0xDC00));
            case 3:
                return _fromCC(((0x0f & cccc.charCodeAt(0)) << 12)
                    | ((0x3f & cccc.charCodeAt(1)) << 6)
                    | (0x3f & cccc.charCodeAt(2)));
            default:
                return _fromCC(((0x1f & cccc.charCodeAt(0)) << 6)
                    | (0x3f & cccc.charCodeAt(1)));
        }
    };
    /**
     * @deprecated should have been internal use only.
     * @param {string} src UTF-16 string
     * @returns {string} UTF-8 string
     */
    var btou = function (b) { return b.replace(re_btou, cb_btou); };
    /**
     * polyfill version of `atob`
     */
    var atobPolyfill = function (asc) {
        // console.log('polyfilled');
        asc = asc.replace(/\s+/g, '');
        if (!b64re.test(asc))
            throw new TypeError('malformed base64.');
        asc += '=='.slice(2 - (asc.length & 3));
        var u24, bin = '', r1, r2;
        for (var i = 0; i < asc.length;) {
            u24 = b64tab[asc.charAt(i++)] << 18
                | b64tab[asc.charAt(i++)] << 12
                | (r1 = b64tab[asc.charAt(i++)]) << 6
                | (r2 = b64tab[asc.charAt(i++)]);
            bin += r1 === 64 ? _fromCC(u24 >> 16 & 255)
                : r2 === 64 ? _fromCC(u24 >> 16 & 255, u24 >> 8 & 255)
                    : _fromCC(u24 >> 16 & 255, u24 >> 8 & 255, u24 & 255);
        }
        return bin;
    };
    /**
     * does what `window.atob` of web browsers do.
     * @param {String} asc Base64-encoded string
     * @returns {string} binary string
     */
    var _atob = typeof atob === 'function' ? function (asc) { return atob(_tidyB64(asc)); }
        : _hasBuffer ? function (asc) { return Buffer.from(asc, 'base64').toString('binary'); }
            : atobPolyfill;
    //
    var _toUint8Array = _hasBuffer
        ? function (a) { return _U8Afrom(Buffer.from(a, 'base64')); }
        : function (a) { return _U8Afrom(_atob(a).split('').map(function (c) { return c.charCodeAt(0); })); };
    /**
     * converts a Base64 string to a Uint8Array.
     */
    var toUint8Array = function (a) { return _toUint8Array(_unURI(a)); };
    //
    var _decode = _hasBuffer
        ? function (a) { return Buffer.from(a, 'base64').toString('utf8'); }
        : _TD
            ? function (a) { return _TD.decode(_toUint8Array(a)); }
            : function (a) { return btou(_atob(a)); };
    var _unURI = function (a) { return _tidyB64(a.replace(/[-_]/g, function (m0) { return m0 == '-' ? '+' : '/'; })); };
    /**
     * converts a Base64 string to a UTF-8 string.
     * @param {String} src Base64 string.  Both normal and URL-safe are supported
     * @returns {string} UTF-8 string
     */
    var decode = function (src) { return _decode(_unURI(src)); };
    /**
     * check if a value is a valid Base64 string
     * @param {String} src a value to check
      */
    var isValid = function (src) {
        if (typeof src !== 'string')
            return false;
        var s = src.replace(/\s+/g, '').replace(/={0,2}$/, '');
        return !/[^\s0-9a-zA-Z\+/]/.test(s) || !/[^\s0-9a-zA-Z\-_]/.test(s);
    };
    //
    var _noEnum = function (v) {
        return {
            value: v, enumerable: false, writable: true, configurable: true
        };
    };
    /**
     * extend String.prototype with relevant methods
     */
    var extendString = function () {
        var _add = function (name, body) { return Object.defineProperty(String.prototype, name, _noEnum(body)); };
        _add('fromBase64', function () { return decode(this); });
        _add('toBase64', function (urlsafe) { return encode(this, urlsafe); });
        _add('toBase64URI', function () { return encode(this, true); });
        _add('toBase64URL', function () { return encode(this, true); });
        _add('toUint8Array', function () { return toUint8Array(this); });
    };
    /**
     * extend Uint8Array.prototype with relevant methods
     */
    var extendUint8Array = function () {
        var _add = function (name, body) { return Object.defineProperty(Uint8Array.prototype, name, _noEnum(body)); };
        _add('toBase64', function (urlsafe) { return fromUint8Array(this, urlsafe); });
        _add('toBase64URI', function () { return fromUint8Array(this, true); });
        _add('toBase64URL', function () { return fromUint8Array(this, true); });
    };
    /**
     * extend Builtin prototypes with relevant methods
     */
    var extendBuiltins = function () {
        extendString();
        extendUint8Array();
    };
    var gBase64 = {
        version: version,
        VERSION: VERSION,
        atob: _atob,
        atobPolyfill: atobPolyfill,
        btoa: _btoa,
        btoaPolyfill: btoaPolyfill,
        fromBase64: decode,
        toBase64: encode,
        encode: encode,
        encodeURI: encodeURI,
        encodeURL: encodeURI,
        utob: utob,
        btou: btou,
        decode: decode,
        isValid: isValid,
        fromUint8Array: fromUint8Array,
        toUint8Array: toUint8Array,
        extendString: extendString,
        extendUint8Array: extendUint8Array,
        extendBuiltins: extendBuiltins
    };
    //
    // export Base64 to the namespace
    //
    // ES5 is yet to have Object.assign() that may make transpilers unhappy.
    // gBase64.Base64 = Object.assign({}, gBase64);
    gBase64.Base64 = {};
    Object.keys(gBase64).forEach(function (k) { return gBase64.Base64[k] = gBase64[k]; });
    return gBase64;
}));


/***/ }),

/***/ "./node_modules/ms/index.js":
/*!**********************************!*\
  !*** ./node_modules/ms/index.js ***!
  \**********************************/
/***/ ((module) => {

/**
 * Helpers.
 */

var s = 1000;
var m = s * 60;
var h = m * 60;
var d = h * 24;
var w = d * 7;
var y = d * 365.25;

/**
 * Parse or format the given `val`.
 *
 * Options:
 *
 *  - `long` verbose formatting [false]
 *
 * @param {String|Number} val
 * @param {Object} [options]
 * @throws {Error} throw an error if val is not a non-empty string or a number
 * @return {String|Number}
 * @api public
 */

module.exports = function(val, options) {
  options = options || {};
  var type = typeof val;
  if (type === 'string' && val.length > 0) {
    return parse(val);
  } else if (type === 'number' && isFinite(val)) {
    return options.long ? fmtLong(val) : fmtShort(val);
  }
  throw new Error(
    'val is not a non-empty string or a valid number. val=' +
      JSON.stringify(val)
  );
};

/**
 * Parse the given `str` and return milliseconds.
 *
 * @param {String} str
 * @return {Number}
 * @api private
 */

function parse(str) {
  str = String(str);
  if (str.length > 100) {
    return;
  }
  var match = /^(-?(?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)?$/i.exec(
    str
  );
  if (!match) {
    return;
  }
  var n = parseFloat(match[1]);
  var type = (match[2] || 'ms').toLowerCase();
  switch (type) {
    case 'years':
    case 'year':
    case 'yrs':
    case 'yr':
    case 'y':
      return n * y;
    case 'weeks':
    case 'week':
    case 'w':
      return n * w;
    case 'days':
    case 'day':
    case 'd':
      return n * d;
    case 'hours':
    case 'hour':
    case 'hrs':
    case 'hr':
    case 'h':
      return n * h;
    case 'minutes':
    case 'minute':
    case 'mins':
    case 'min':
    case 'm':
      return n * m;
    case 'seconds':
    case 'second':
    case 'secs':
    case 'sec':
    case 's':
      return n * s;
    case 'milliseconds':
    case 'millisecond':
    case 'msecs':
    case 'msec':
    case 'ms':
      return n;
    default:
      return undefined;
  }
}

/**
 * Short format for `ms`.
 *
 * @param {Number} ms
 * @return {String}
 * @api private
 */

function fmtShort(ms) {
  var msAbs = Math.abs(ms);
  if (msAbs >= d) {
    return Math.round(ms / d) + 'd';
  }
  if (msAbs >= h) {
    return Math.round(ms / h) + 'h';
  }
  if (msAbs >= m) {
    return Math.round(ms / m) + 'm';
  }
  if (msAbs >= s) {
    return Math.round(ms / s) + 's';
  }
  return ms + 'ms';
}

/**
 * Long format for `ms`.
 *
 * @param {Number} ms
 * @return {String}
 * @api private
 */

function fmtLong(ms) {
  var msAbs = Math.abs(ms);
  if (msAbs >= d) {
    return plural(ms, msAbs, d, 'day');
  }
  if (msAbs >= h) {
    return plural(ms, msAbs, h, 'hour');
  }
  if (msAbs >= m) {
    return plural(ms, msAbs, m, 'minute');
  }
  if (msAbs >= s) {
    return plural(ms, msAbs, s, 'second');
  }
  return ms + ' ms';
}

/**
 * Pluralization helper.
 */

function plural(ms, msAbs, n, name) {
  var isPlural = msAbs >= n * 1.5;
  return Math.round(ms / n) + ' ' + name + (isPlural ? 's' : '');
}


/***/ }),

/***/ "./node_modules/isomorphic-webcrypto/src/browser.mjs":
/*!***********************************************************!*\
  !*** ./node_modules/isomorphic-webcrypto/src/browser.mjs ***!
  \***********************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _webcrypto_shim_mjs__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./webcrypto-shim.mjs */ "./node_modules/isomorphic-webcrypto/src/webcrypto-shim.mjs");

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (window.crypto);


/***/ }),

/***/ "./node_modules/isomorphic-webcrypto/src/webcrypto-shim.mjs":
/*!******************************************************************!*\
  !*** ./node_modules/isomorphic-webcrypto/src/webcrypto-shim.mjs ***!
  \******************************************************************/
/***/ (() => {

"use strict";
/**
 * @file Web Cryptography API shim
 * @author Artem S Vybornov <vybornov@gmail.com>
 * @license MIT
 */
(function (global, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define([], function () {
            return factory(global);
        });
    } else if (typeof module === 'object' && module.exports) {
        // CommonJS-like environments that support module.exports
        module.exports = factory(global);
    } else {
        factory(global);
    }
}(typeof self !== 'undefined' ? self : undefined, function (global) {
    'use strict';

    if ( typeof Promise !== 'function' )
        throw "Promise support required";

    var _crypto = global.crypto || global.msCrypto;
    if ( !_crypto ) return;

    var _subtle = _crypto.subtle || _crypto.webkitSubtle;
    if ( !_subtle ) return;

    var _Crypto     = global.Crypto || _crypto.constructor || Object,
        _SubtleCrypto = global.SubtleCrypto || _subtle.constructor || Object,
        _CryptoKey  = global.CryptoKey || global.Key || Object;

    var isEdge = global.navigator.userAgent.indexOf('Edge/') > -1;
    var isIE    = !!global.msCrypto && !isEdge;
    var isWebkit = !_crypto.subtle && !!_crypto.webkitSubtle;
    if ( !isIE && !isWebkit ) return;

    function s2a ( s ) {
        return btoa(s).replace(/\=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
    }

    function a2s ( s ) {
        s += '===', s = s.slice( 0, -s.length % 4 );
        return atob( s.replace(/-/g, '+').replace(/_/g, '/') );
    }

    function s2b ( s ) {
        var b = new Uint8Array(s.length);
        for ( var i = 0; i < s.length; i++ ) b[i] = s.charCodeAt(i);
        return b;
    }

    function b2s ( b ) {
        if ( b instanceof ArrayBuffer ) b = new Uint8Array(b);
        return String.fromCharCode.apply( String, b );
    }

    function alg ( a ) {
        var r = { 'name': (a.name || a || '').toUpperCase().replace('V','v') };
        switch ( r.name ) {
            case 'SHA-1':
            case 'SHA-256':
            case 'SHA-384':
            case 'SHA-512':
                break;
            case 'AES-CBC':
            case 'AES-GCM':
            case 'AES-KW':
                if ( a.length ) r['length'] = a.length;
                break;
            case 'HMAC':
                if ( a.hash ) r['hash'] = alg(a.hash);
                if ( a.length ) r['length'] = a.length;
                break;
            case 'RSAES-PKCS1-v1_5':
                if ( a.publicExponent ) r['publicExponent'] = new Uint8Array(a.publicExponent);
                if ( a.modulusLength ) r['modulusLength'] = a.modulusLength;
                break;
            case 'RSASSA-PKCS1-v1_5':
            case 'RSA-OAEP':
                if ( a.hash ) r['hash'] = alg(a.hash);
                if ( a.publicExponent ) r['publicExponent'] = new Uint8Array(a.publicExponent);
                if ( a.modulusLength ) r['modulusLength'] = a.modulusLength;
                break;
            default:
                throw new SyntaxError("Bad algorithm name");
        }
        return r;
    };

    function jwkAlg ( a ) {
        return {
            'HMAC': {
                'SHA-1': 'HS1',
                'SHA-256': 'HS256',
                'SHA-384': 'HS384',
                'SHA-512': 'HS512',
            },
            'RSASSA-PKCS1-v1_5': {
                'SHA-1': 'RS1',
                'SHA-256': 'RS256',
                'SHA-384': 'RS384',
                'SHA-512': 'RS512',
            },
            'RSAES-PKCS1-v1_5': {
                '': 'RSA1_5',
            },
            'RSA-OAEP': {
                'SHA-1': 'RSA-OAEP',
                'SHA-256': 'RSA-OAEP-256',
            },
            'AES-KW': {
                '128': 'A128KW',
                '192': 'A192KW',
                '256': 'A256KW',
            },
            'AES-GCM': {
                '128': 'A128GCM',
                '192': 'A192GCM',
                '256': 'A256GCM',
            },
            'AES-CBC': {
                '128': 'A128CBC',
                '192': 'A192CBC',
                '256': 'A256CBC',
            },
        }[a.name][ ( a.hash || {} ).name || a.length || '' ];
    }

    function b2jwk ( k ) {
        if ( k instanceof ArrayBuffer || k instanceof Uint8Array ) k = JSON.parse( decodeURIComponent( escape( b2s(k) ) ) );
        var jwk = { 'kty': k.kty, 'alg': k.alg, 'ext': k.ext || k.extractable };
        switch ( jwk.kty ) {
            case 'oct':
                jwk.k = k.k;
            case 'RSA':
                [ 'n', 'e', 'd', 'p', 'q', 'dp', 'dq', 'qi', 'oth' ].forEach( function ( x ) { if ( x in k ) jwk[x] = k[x] } );
                break;
            default:
                throw new TypeError("Unsupported key type");
        }
        return jwk;
    }

    function jwk2b ( k ) {
        var jwk = b2jwk(k);
        if ( isIE ) jwk['extractable'] = jwk.ext, delete jwk.ext;
        return s2b( unescape( encodeURIComponent( JSON.stringify(jwk) ) ) ).buffer;
    }

    function pkcs2jwk ( k ) {
        var info = b2der(k), prv = false;
        if ( info.length > 2 ) prv = true, info.shift(); // remove version from PKCS#8 PrivateKeyInfo structure
        var jwk = { 'ext': true };
        switch ( info[0][0] ) {
            case '1.2.840.113549.1.1.1':
                var rsaComp = [ 'n', 'e', 'd', 'p', 'q', 'dp', 'dq', 'qi' ],
                    rsaKey  = b2der( info[1] );
                if ( prv ) rsaKey.shift(); // remove version from PKCS#1 RSAPrivateKey structure
                for ( var i = 0; i < rsaKey.length; i++ ) {
                    if ( !rsaKey[i][0] ) rsaKey[i] = rsaKey[i].subarray(1);
                    jwk[ rsaComp[i] ] = s2a( b2s( rsaKey[i] ) );
                }
                jwk['kty'] = 'RSA';
                break;
            default:
                throw new TypeError("Unsupported key type");
        }
        return jwk;
    }

    function jwk2pkcs ( k ) {
        var key, info = [ [ '', null ] ], prv = false;
        switch ( k.kty ) {
            case 'RSA':
                var rsaComp = [ 'n', 'e', 'd', 'p', 'q', 'dp', 'dq', 'qi' ],
                    rsaKey = [];
                for ( var i = 0; i < rsaComp.length; i++ ) {
                    if ( !( rsaComp[i] in k ) ) break;
                    var b = rsaKey[i] = s2b( a2s( k[ rsaComp[i] ] ) );
                    if ( b[0] & 0x80 ) rsaKey[i] = new Uint8Array(b.length + 1), rsaKey[i].set( b, 1 );
                }
                if ( rsaKey.length > 2 ) prv = true, rsaKey.unshift( new Uint8Array([0]) ); // add version to PKCS#1 RSAPrivateKey structure
                info[0][0] = '1.2.840.113549.1.1.1';
                key = rsaKey;
                break;
            default:
                throw new TypeError("Unsupported key type");
        }
        info.push( new Uint8Array( der2b(key) ).buffer );
        if ( !prv ) info[1] = { 'tag': 0x03, 'value': info[1] };
        else info.unshift( new Uint8Array([0]) ); // add version to PKCS#8 PrivateKeyInfo structure
        return new Uint8Array( der2b(info) ).buffer;
    }

    var oid2str = { 'KoZIhvcNAQEB': '1.2.840.113549.1.1.1' },
        str2oid = { '1.2.840.113549.1.1.1': 'KoZIhvcNAQEB' };

    function b2der ( buf, ctx ) {
        if ( buf instanceof ArrayBuffer ) buf = new Uint8Array(buf);
        if ( !ctx ) ctx = { pos: 0, end: buf.length };

        if ( ctx.end - ctx.pos < 2 || ctx.end > buf.length ) throw new RangeError("Malformed DER");

        var tag = buf[ctx.pos++],
            len = buf[ctx.pos++];

        if ( len >= 0x80 ) {
            len &= 0x7f;
            if ( ctx.end - ctx.pos < len ) throw new RangeError("Malformed DER");
            for ( var xlen = 0; len--; ) xlen <<= 8, xlen |= buf[ctx.pos++];
            len = xlen;
        }

        if ( ctx.end - ctx.pos < len ) throw new RangeError("Malformed DER");

        var rv;

        switch ( tag ) {
            case 0x02: // Universal Primitive INTEGER
                rv = buf.subarray( ctx.pos, ctx.pos += len );
                break;
            case 0x03: // Universal Primitive BIT STRING
                if ( buf[ctx.pos++] ) throw new Error( "Unsupported bit string" );
                len--;
            case 0x04: // Universal Primitive OCTET STRING
                rv = new Uint8Array( buf.subarray( ctx.pos, ctx.pos += len ) ).buffer;
                break;
            case 0x05: // Universal Primitive NULL
                rv = null;
                break;
            case 0x06: // Universal Primitive OBJECT IDENTIFIER
                var oid = btoa( b2s( buf.subarray( ctx.pos, ctx.pos += len ) ) );
                if ( !( oid in oid2str ) ) throw new Error( "Unsupported OBJECT ID " + oid );
                rv = oid2str[oid];
                break;
            case 0x30: // Universal Constructed SEQUENCE
                rv = [];
                for ( var end = ctx.pos + len; ctx.pos < end; ) rv.push( b2der( buf, ctx ) );
                break;
            default:
                throw new Error( "Unsupported DER tag 0x" + tag.toString(16) );
        }

        return rv;
    }

    function der2b ( val, buf ) {
        if ( !buf ) buf = [];

        var tag = 0, len = 0,
            pos = buf.length + 2;

        buf.push( 0, 0 ); // placeholder

        if ( val instanceof Uint8Array ) {  // Universal Primitive INTEGER
            tag = 0x02, len = val.length;
            for ( var i = 0; i < len; i++ ) buf.push( val[i] );
        }
        else if ( val instanceof ArrayBuffer ) { // Universal Primitive OCTET STRING
            tag = 0x04, len = val.byteLength, val = new Uint8Array(val);
            for ( var i = 0; i < len; i++ ) buf.push( val[i] );
        }
        else if ( val === null ) { // Universal Primitive NULL
            tag = 0x05, len = 0;
        }
        else if ( typeof val === 'string' && val in str2oid ) { // Universal Primitive OBJECT IDENTIFIER
            var oid = s2b( atob( str2oid[val] ) );
            tag = 0x06, len = oid.length;
            for ( var i = 0; i < len; i++ ) buf.push( oid[i] );
        }
        else if ( val instanceof Array ) { // Universal Constructed SEQUENCE
            for ( var i = 0; i < val.length; i++ ) der2b( val[i], buf );
            tag = 0x30, len = buf.length - pos;
        }
        else if ( typeof val === 'object' && val.tag === 0x03 && val.value instanceof ArrayBuffer ) { // Tag hint
            val = new Uint8Array(val.value), tag = 0x03, len = val.byteLength;
            buf.push(0); for ( var i = 0; i < len; i++ ) buf.push( val[i] );
            len++;
        }
        else {
            throw new Error( "Unsupported DER value " + val );
        }

        if ( len >= 0x80 ) {
            var xlen = len, len = 4;
            buf.splice( pos, 0, (xlen >> 24) & 0xff, (xlen >> 16) & 0xff, (xlen >> 8) & 0xff, xlen & 0xff );
            while ( len > 1 && !(xlen >> 24) ) xlen <<= 8, len--;
            if ( len < 4 ) buf.splice( pos, 4 - len );
            len |= 0x80;
        }

        buf.splice( pos - 2, 2, tag, len );

        return buf;
    }

    function CryptoKey ( key, alg, ext, use ) {
        Object.defineProperties( this, {
            _key: {
                value: key
            },
            type: {
                value: key.type,
                enumerable: true,
            },
            extractable: {
                value: (ext === undefined) ? key.extractable : ext,
                enumerable: true,
            },
            algorithm: {
                value: (alg === undefined) ? key.algorithm : alg,
                enumerable: true,
            },
            usages: {
                value: (use === undefined) ? key.usages : use,
                enumerable: true,
            },
        });
    }

    function isPubKeyUse ( u ) {
        return u === 'verify' || u === 'encrypt' || u === 'wrapKey';
    }

    function isPrvKeyUse ( u ) {
        return u === 'sign' || u === 'decrypt' || u === 'unwrapKey';
    }

    [ 'generateKey', 'importKey', 'unwrapKey' ]
        .forEach( function ( m ) {
            var _fn = _subtle[m];

            _subtle[m] = function ( a, b, c ) {
                var args = [].slice.call(arguments),
                    ka, kx, ku;

                switch ( m ) {
                    case 'generateKey':
                        ka = alg(a), kx = b, ku = c;
                        break;
                    case 'importKey':
                        ka = alg(c), kx = args[3], ku = args[4];
                        if ( a === 'jwk' ) {
                            b = b2jwk(b);
                            if ( !b.alg ) b.alg = jwkAlg(ka);
                            if ( !b.key_ops ) b.key_ops = ( b.kty !== 'oct' ) ? ( 'd' in b ) ? ku.filter(isPrvKeyUse) : ku.filter(isPubKeyUse) : ku.slice();
                            args[1] = jwk2b(b);
                        }
                        break;
                    case 'unwrapKey':
                        ka = args[4], kx = args[5], ku = args[6];
                        args[2] = c._key;
                        break;
                }

                if ( m === 'generateKey' && ka.name === 'HMAC' && ka.hash ) {
                    ka.length = ka.length || { 'SHA-1': 512, 'SHA-256': 512, 'SHA-384': 1024, 'SHA-512': 1024 }[ka.hash.name];
                    return _subtle.importKey( 'raw', _crypto.getRandomValues( new Uint8Array( (ka.length+7)>>3 ) ), ka, kx, ku );
                }

                if ( isWebkit && m === 'generateKey' && ka.name === 'RSASSA-PKCS1-v1_5' && ( !ka.modulusLength || ka.modulusLength >= 2048 ) ) {
                    a = alg(a), a.name = 'RSAES-PKCS1-v1_5', delete a.hash;
                    return _subtle.generateKey( a, true, [ 'encrypt', 'decrypt' ] )
                        .then( function ( k ) {
                            return Promise.all([
                                _subtle.exportKey( 'jwk', k.publicKey ),
                                _subtle.exportKey( 'jwk', k.privateKey ),
                            ]);
                        })
                        .then( function ( keys ) {
                            keys[0].alg = keys[1].alg = jwkAlg(ka);
                            keys[0].key_ops = ku.filter(isPubKeyUse), keys[1].key_ops = ku.filter(isPrvKeyUse);
                            return Promise.all([
                                _subtle.importKey( 'jwk', keys[0], ka, true, keys[0].key_ops ),
                                _subtle.importKey( 'jwk', keys[1], ka, kx, keys[1].key_ops ),
                            ]);
                        })
                        .then( function ( keys ) {
                            return {
                                publicKey: keys[0],
                                privateKey: keys[1],
                            };
                        });
                }

                if ( ( isWebkit || ( isIE && ( ka.hash || {} ).name === 'SHA-1' ) )
                        && m === 'importKey' && a === 'jwk' && ka.name === 'HMAC' && b.kty === 'oct' ) {
                    return _subtle.importKey( 'raw', s2b( a2s(b.k) ), c, args[3], args[4] );
                }

                if ( isWebkit && m === 'importKey' && ( a === 'spki' || a === 'pkcs8' ) ) {
                    return _subtle.importKey( 'jwk', pkcs2jwk(b), c, args[3], args[4] );
                }

                if ( isIE && m === 'unwrapKey' ) {
                    return _subtle.decrypt( args[3], c, b )
                        .then( function ( k ) {
                            return _subtle.importKey( a, k, args[4], args[5], args[6] );
                        });
                }

                var op;
                try {
                    op = _fn.apply( _subtle, args );
                }
                catch ( e ) {
                    return Promise.reject(e);
                }

                if ( isIE ) {
                    op = new Promise( function ( res, rej ) {
                        op.onabort =
                        op.onerror =    function ( e ) { rej(e)               };
                        op.oncomplete = function ( r ) { res(r.target.result) };
                    });
                }

                op = op.then( function ( k ) {
                    if ( ka.name === 'HMAC' ) {
                        if ( !ka.length ) ka.length = 8 * k.algorithm.length;
                    }
                    if ( ka.name.search('RSA') == 0 ) {
                        if ( !ka.modulusLength ) ka.modulusLength = (k.publicKey || k).algorithm.modulusLength;
                        if ( !ka.publicExponent ) ka.publicExponent = (k.publicKey || k).algorithm.publicExponent;
                    }
                    if ( k.publicKey && k.privateKey ) {
                        k = {
                            publicKey: new CryptoKey( k.publicKey, ka, kx, ku.filter(isPubKeyUse) ),
                            privateKey: new CryptoKey( k.privateKey, ka, kx, ku.filter(isPrvKeyUse) ),
                        };
                    }
                    else {
                        k = new CryptoKey( k, ka, kx, ku );
                    }
                    return k;
                });

                return op;
            }
        });

    [ 'exportKey', 'wrapKey' ]
        .forEach( function ( m ) {
            var _fn = _subtle[m];

            _subtle[m] = function ( a, b, c ) {
                var args = [].slice.call(arguments);

                switch ( m ) {
                    case 'exportKey':
                        args[1] = b._key;
                        break;
                    case 'wrapKey':
                        args[1] = b._key, args[2] = c._key;
                        break;
                }

                if ( ( isWebkit || ( isIE && ( b.algorithm.hash || {} ).name === 'SHA-1' ) )
                        && m === 'exportKey' && a === 'jwk' && b.algorithm.name === 'HMAC' ) {
                    args[0] = 'raw';
                }

                if ( isWebkit && m === 'exportKey' && ( a === 'spki' || a === 'pkcs8' ) ) {
                    args[0] = 'jwk';
                }

                if ( isIE && m === 'wrapKey' ) {
                    return _subtle.exportKey( a, b )
                        .then( function ( k ) {
                            if ( a === 'jwk' ) k = s2b( unescape( encodeURIComponent( JSON.stringify( b2jwk(k) ) ) ) );
                            return  _subtle.encrypt( args[3], c, k );
                        });
                }

                var op;
                try {
                    op = _fn.apply( _subtle, args );
                }
                catch ( e ) {
                    return Promise.reject(e);
                }

                if ( isIE ) {
                    op = new Promise( function ( res, rej ) {
                        op.onabort =
                        op.onerror =    function ( e ) { rej(e)               };
                        op.oncomplete = function ( r ) { res(r.target.result) };
                    });
                }

                if ( m === 'exportKey' && a === 'jwk' ) {
                    op = op.then( function ( k ) {
                        if ( ( isWebkit || ( isIE && ( b.algorithm.hash || {} ).name === 'SHA-1' ) )
                                && b.algorithm.name === 'HMAC') {
                            return { 'kty': 'oct', 'alg': jwkAlg(b.algorithm), 'key_ops': b.usages.slice(), 'ext': true, 'k': s2a( b2s(k) ) };
                        }
                        k = b2jwk(k);
                        if ( !k.alg ) k['alg'] = jwkAlg(b.algorithm);
                        if ( !k.key_ops ) k['key_ops'] = ( b.type === 'public' ) ? b.usages.filter(isPubKeyUse) : ( b.type === 'private' ) ? b.usages.filter(isPrvKeyUse) : b.usages.slice();
                        return k;
                    });
                }

                if ( isWebkit && m === 'exportKey' && ( a === 'spki' || a === 'pkcs8' ) ) {
                    op = op.then( function ( k ) {
                        k = jwk2pkcs( b2jwk(k) );
                        return k;
                    });
                }

                return op;
            }
        });

    [ 'encrypt', 'decrypt', 'sign', 'verify' ]
        .forEach( function ( m ) {
            var _fn = _subtle[m];

            _subtle[m] = function ( a, b, c, d ) {
                if ( isIE && ( !c.byteLength || ( d && !d.byteLength ) ) )
                    throw new Error("Empy input is not allowed");

                var args = [].slice.call(arguments),
                    ka = alg(a);

                if ( isIE && m === 'decrypt' && ka.name === 'AES-GCM' ) {
                    var tl = a.tagLength >> 3;
                    args[2] = (c.buffer || c).slice( 0, c.byteLength - tl ),
                    a.tag = (c.buffer || c).slice( c.byteLength - tl );
                }

                args[1] = b._key;

                var op;
                try {
                    op = _fn.apply( _subtle, args );
                }
                catch ( e ) {
                    return Promise.reject(e);
                }

                if ( isIE ) {
                    op = new Promise( function ( res, rej ) {
                        op.onabort =
                        op.onerror = function ( e ) {
                            rej(e);
                        };

                        op.oncomplete = function ( r ) {
                            var r = r.target.result;

                            if ( m === 'encrypt' && r instanceof AesGcmEncryptResult ) {
                                var c = r.ciphertext, t = r.tag;
                                r = new Uint8Array( c.byteLength + t.byteLength );
                                r.set( new Uint8Array(c), 0 );
                                r.set( new Uint8Array(t), c.byteLength );
                                r = r.buffer;
                            }

                            res(r);
                        };
                    });
                }

                return op;
            }
        });

    if ( isIE ) {
        var _digest = _subtle.digest;

        _subtle['digest'] = function ( a, b ) {
            if ( !b.byteLength )
                throw new Error("Empy input is not allowed");

            var op;
            try {
                op = _digest.call( _subtle, a, b );
            }
            catch ( e ) {
                return Promise.reject(e);
            }

            op = new Promise( function ( res, rej ) {
                op.onabort =
                op.onerror =    function ( e ) { rej(e)               };
                op.oncomplete = function ( r ) { res(r.target.result) };
            });

            return op;
        };

        global.crypto = Object.create( _crypto, {
            getRandomValues: { value: function ( a ) { return _crypto.getRandomValues(a) } },
            subtle:          { value: _subtle },
        });

        global.CryptoKey = CryptoKey;
    }

    if ( isWebkit ) {
        _crypto.subtle = _subtle;

        global.Crypto = _Crypto;
        global.SubtleCrypto = _SubtleCrypto;
        global.CryptoKey = CryptoKey;
    }
}));

 /* unused harmony default export */ var __WEBPACK_DEFAULT_EXPORT__ = ({}); // section modified by isomorphic-webcrypto build 


/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/global */
/******/ 	(() => {
/******/ 		__webpack_require__.g = (function() {
/******/ 			if (typeof globalThis === 'object') return globalThis;
/******/ 			try {
/******/ 				return this || new Function('return this')();
/******/ 			} catch (e) {
/******/ 				if (typeof window === 'object') return window;
/******/ 			}
/******/ 		})();
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module is referenced by other modules so it can't be inlined
/******/ 	var __webpack_exports__ = __webpack_require__("./src/entry/browser.ts");
/******/ 	window.FHIR = __webpack_exports__;
/******/ 	
/******/ })()
;
//# sourceMappingURL=fhir-client.pure.js.map