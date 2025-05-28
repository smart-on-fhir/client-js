"use strict";

// In Browsers we create an adapter, get the SMART api from it and build the
// global FHIR object
const BrowserAdapter_1 = require("../adapters/BrowserAdapter");
const FhirClient_1 = require("../FhirClient");
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
if (typeof FHIRCLIENT_PURE == "undefined") {
  const fetch = require("cross-fetch");
  require("abortcontroller-polyfill/dist/abortcontroller-polyfill-only");
  if (!window.fetch) {
    window.fetch = fetch.default;
    window.Headers = fetch.Headers;
    window.Request = fetch.Request;
    window.Response = fetch.Response;
  }
}
// $lab:coverage:off$
const FHIR = {
  AbortController: window.AbortController,
  client,
  /**
   * Using this class if you are connecting to open server that does not
   * require authorization.
   */
  FhirClient: FhirClient_1.default,
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