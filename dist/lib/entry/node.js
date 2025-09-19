"use strict";

const NodeAdapter_1 = require("../adapters/NodeAdapter");
const FhirClient_1 = require("../FhirClient");
function smart(request, response, storage) {
  return new NodeAdapter_1.default({
    request,
    response,
    storage
  }).getSmartApi();
}
smart.AbortController = AbortController;
smart.FhirClient = FhirClient_1.default;
module.exports = smart;