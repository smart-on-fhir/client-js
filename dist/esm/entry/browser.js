// In Browsers we create an adapter, get the SMART api from it and build the
// global FHIR object
import BrowserAdapter from "../adapters/BrowserAdapter";
import FhirClient from "../FhirClient";
const adapter = new BrowserAdapter();
const { ready, authorize, init, client, options, utils } = adapter.getSmartApi();
const oauth2 = {
    settings: options,
    ready,
    authorize,
    init
};
export { ready, authorize, init, options as settings, 
// oauth2 as SMART,
utils, client as createSmartClient, FhirClient };
// Create the default export object that contains everything exported from
// browser bundles
// $lab:coverage:off$
const FHIR = {
    client,
    // Use this class if you are connecting to open server (no authorization).
    FhirClient,
    utils,
    oauth2
};
export default FHIR;
// $lab:coverage:on$
