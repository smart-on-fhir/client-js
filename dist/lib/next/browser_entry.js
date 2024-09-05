"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const BrowserAdapter_1 = __importDefault(require("./BrowserAdapter"));
const { ready, authorize, init, client, options, utils } = new BrowserAdapter_1.default().getSmartApi();
// export default {
//     client,
//     utils,
//     oauth2: {
//         settings: options,
//         ready,
//         authorize,
//         init
//     }
// };
function smart(settings = {}) {
    return smart;
}
smart.authorize = authorize;
smart.ready = ready;
smart.init = init;
smart.client = client;
smart.utils = utils;
exports.default = smart;
