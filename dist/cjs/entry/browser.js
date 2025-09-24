"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
// In Browsers we create an adapter, get the SMART api from it and build the
// global FHIR object
const BrowserAdapter_1 = tslib_1.__importDefault(require("../adapters/BrowserAdapter"));
const FhirClient_1 = tslib_1.__importDefault(require("../FhirClient"));
const adapter = new BrowserAdapter_1.default();
const { ready, authorize, init, client, options, utils } = adapter.getSmartApi();
// $lab:coverage:off$
const FHIR = {
    client,
    /**
     * Using this class if you are connecting to open server that does not
     * require authorization.
     */
    FhirClient: FhirClient_1.default,
    utils,
    oauth2: {
        settings: options,
        ready,
        authorize,
        init
    }
};
exports.default = FHIR;
// $lab:coverage:on$
