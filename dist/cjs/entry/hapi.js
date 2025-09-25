"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FhirClient = void 0;
exports.smart = smart;
const tslib_1 = require("tslib");
const HapiAdapter_1 = tslib_1.__importDefault(require("../adapters/HapiAdapter"));
var FhirClient_1 = require("../FhirClient");
Object.defineProperty(exports, "FhirClient", { enumerable: true, get: function () { return tslib_1.__importDefault(FhirClient_1).default; } });
function smart(request, h, storage) {
    return new HapiAdapter_1.default({
        request,
        responseToolkit: h,
        storage
    }).getSmartApi();
}
