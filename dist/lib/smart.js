"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.init = exports.buildTokenRequest = exports.ready = exports.onMessage = exports.isInPopUp = exports.isInFrame = exports.authorize = exports.getSecurityExtensions = exports.fetchWellKnownJson = exports.KEY = void 0;
/* global window */
const lib_1 = require("./lib");
const Client_1 = require("./Client");
const settings_1 = require("./settings");
Object.defineProperty(exports, "KEY", {
  enumerable: true,
  get: function () {
    return settings_1.SMART_KEY;
  }
});
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
    state = Object.assign(Object.assign({}, state), {
      tokenResponse
    });
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