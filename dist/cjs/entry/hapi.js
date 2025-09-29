"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FhirClient = void 0;
exports.smart = smart;
const HapiAdapter_1 = __importDefault(require("../adapters/HapiAdapter"));
var FhirClient_1 = require("../FhirClient");
Object.defineProperty(exports, "FhirClient", { enumerable: true, get: function () { return __importDefault(FhirClient_1).default; } });
function smart(request, h, storage) {
    return new HapiAdapter_1.default({
        request,
        responseToolkit: h,
        storage
    }).getSmartApi();
}
