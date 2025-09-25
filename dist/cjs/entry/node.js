"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FhirClient = void 0;
exports.smart = smart;
const tslib_1 = require("tslib");
const NodeAdapter_1 = tslib_1.__importDefault(require("../adapters/NodeAdapter"));
var FhirClient_1 = require("../FhirClient");
Object.defineProperty(exports, "FhirClient", { enumerable: true, get: function () { return tslib_1.__importDefault(FhirClient_1).default; } });
function smart(request, response, storage) {
    return new NodeAdapter_1.default({
        request,
        response,
        storage
    }).getSmartApi();
}
