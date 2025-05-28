"use strict";

const NodeAdapter_1 = require("../adapters/NodeAdapter");
const cjs_ponyfill_1 = require("abortcontroller-polyfill/dist/cjs-ponyfill");
const FhirClient_1 = require("../FhirClient");
function smart(request, response, storage) {
  return new NodeAdapter_1.default({
    request,
    response,
    storage
  }).getSmartApi();
}
smart.AbortController = cjs_ponyfill_1.AbortController;
smart.FhirClient = FhirClient_1.default;
module.exports = smart;