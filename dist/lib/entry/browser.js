"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Create an adapter, get the SMART api from it and build the global FHIR object
const BrowserAdapter_1 = __importDefault(require("../adapters/BrowserAdapter"));
const { ready, authorize, init, client, options, utils } = new BrowserAdapter_1.default().getSmartApi();
exports.default = {
    client,
    utils,
    oauth2: {
        settings: options,
        ready,
        authorize,
        init
    }
};
