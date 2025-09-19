
// Note: the following 2 imports appear as unused but they affect how tsc is
// generating type definitions!
import { fhirclient } from "../types";
import Client from "../Client";

// In Browsers we create an adapter, get the SMART api from it and build the
// global FHIR object
import BrowserAdapter from "../adapters/BrowserAdapter";
import FhirClient from "../FhirClient";

const adapter = new BrowserAdapter();
const { ready, authorize, init, client, options, utils } = adapter.getSmartApi();

// $lab:coverage:off$
const FHIR = {
    AbortController: window.AbortController,

    client,

    /**
     * Using this class if you are connecting to open server that does not
     * require authorization.
     */
    FhirClient,

    utils,
    oauth2: {
        settings: options,
        ready,
        authorize,
        init
    }
};

export = FHIR;
// $lab:coverage:on$
