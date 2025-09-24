// In Browsers we create an adapter, get the SMART api from it and build the
// global FHIR object
import BrowserAdapter from "../adapters/BrowserAdapter";
import FhirClient from "../FhirClient";

const adapter = new BrowserAdapter();
const { ready, authorize, init, client, options, utils } = adapter.getSmartApi();

// $lab:coverage:off$
const FHIR = {
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

export default FHIR;
// $lab:coverage:on$
