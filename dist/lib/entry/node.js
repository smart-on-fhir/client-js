"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const NodeAdapter_1 = __importDefault(require("../adapters/NodeAdapter"));
function smart(request, response, storage) {
    return new NodeAdapter_1.default({
        request,
        response,
        storage
    }).getSmartApi();
}
exports.default = smart;
