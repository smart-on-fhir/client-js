"use strict";
const HapiAdapter_1 = require("../adapters/HapiAdapter");
const FhirClient_1 = require("../FhirClient");
function smart(request, h, storage) {
    return new HapiAdapter_1.default({
        request,
        responseToolkit: h,
        storage
    }).getSmartApi();
}
smart.AbortController = AbortController;
smart.FhirClient = FhirClient_1.default;
module.exports = smart;
