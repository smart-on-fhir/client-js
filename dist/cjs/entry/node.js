"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const NodeAdapter_1 = tslib_1.__importDefault(require("../adapters/NodeAdapter"));
const FhirClient_1 = tslib_1.__importDefault(require("../FhirClient"));
function smart(request, response, storage) {
    return new NodeAdapter_1.default({
        request,
        response,
        storage
    }).getSmartApi();
}
smart.FhirClient = FhirClient_1.default;
exports.default = smart;
