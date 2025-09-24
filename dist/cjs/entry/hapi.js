"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const HapiAdapter_1 = tslib_1.__importDefault(require("../adapters/HapiAdapter"));
const FhirClient_1 = tslib_1.__importDefault(require("../FhirClient"));
function smart(request, h, storage) {
    return new HapiAdapter_1.default({
        request,
        responseToolkit: h,
        storage
    }).getSmartApi();
}
smart.AbortController = AbortController;
smart.FhirClient = FhirClient_1.default;
exports.default = smart;
