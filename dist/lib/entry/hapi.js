"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const HapiAdapter_1 = __importDefault(require("../adapters/HapiAdapter"));
function smart(request, h, storage) {
    return new HapiAdapter_1.default({
        request,
        responseToolkit: h,
        storage
    }).getSmartApi();
}
exports.default = smart;
