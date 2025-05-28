"use strict";

const HapiAdapter_1 = require("../adapters/HapiAdapter");
const FhirClient_1 = require("../FhirClient");
const cjs_ponyfill_1 = require("abortcontroller-polyfill/dist/cjs-ponyfill");
function smart(request, h, storage) {
  return new HapiAdapter_1.default({
    request,
    responseToolkit: h,
    storage
  }).getSmartApi();
}
smart.AbortController = cjs_ponyfill_1.AbortController;
smart.FhirClient = FhirClient_1.default;
module.exports = smart;