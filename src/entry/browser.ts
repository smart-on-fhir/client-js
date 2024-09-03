// Create an adapter, get the SMART api from it and build the global FHIR object
import BrowserAdapter from "../adapters/BrowserAdapter";

const { ready, authorize, init, client, options, utils } = new BrowserAdapter().getSmartApi();

export default {
    client,
    utils,
    oauth2: {
        settings: options,
        ready,
        authorize,
        init
    }
};
