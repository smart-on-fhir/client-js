"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FhirClient = exports.createSmartClient = exports.utils = exports.settings = exports.init = exports.authorize = exports.ready = void 0;
const tslib_1 = require("tslib");
// In Browsers we create an adapter, get the SMART api from it and build the
// global FHIR object
const BrowserAdapter_1 = tslib_1.__importDefault(require("../adapters/BrowserAdapter"));
const FhirClient_1 = tslib_1.__importDefault(require("../FhirClient"));
exports.FhirClient = FhirClient_1.default;
const adapter = new BrowserAdapter_1.default();
const { ready, authorize, init, client, options, utils } = adapter.getSmartApi();
exports.ready = ready;
exports.authorize = authorize;
exports.init = init;
exports.createSmartClient = client;
exports.settings = options;
exports.utils = utils;
const oauth2 = {
    settings: options,
    ready,
    authorize,
    init
};
// Create the default export object that contains everything exported from
// browser bundles
// $lab:coverage:off$
const FHIR = {
    client,
    // Use this class if you are connecting to open server (no authorization).
    FhirClient: FhirClient_1.default,
    utils,
    oauth2
};
exports.default = FHIR;
// $lab:coverage:on$
