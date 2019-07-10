const {
    absolute,
    debug: _debug
} = require("./lib");

const debug = _debug.extend("client:patient");

/**
 * Adds patient context to requestOptions object to be used with fhirclient.Client.request
 * @param {Object|String} requestOptions Can be a string URL (relative to
 *  the serviceUrl), or an object which will be passed to fetch()
 * @param {fhirclient.Client} client Current FHIR client object containing patient context
 * @return {Object|String} requestOptions object contextualied to current patient
 */
function contextualize (requestOptions, client) {

    const patient = client.patient.id;
    const base = absolute("/", client.state.serverUrl);

    if (!patient) return Promise.reject(new Error("Patient is not available"));

    function contextualURL(url) {
        const type = url.pathname.split("/").pop();
        const params = url.searchParams;

        // Adding a 'patient' parameter may not be appropriate for all
        // FHIR queries and resource types (this varies between FHIR versions).
        // To make this as FHIR version independent as possible, we keep it simple
        // and leave it to the apps using the client to determine if it makes sense
        // to run a query throught this wrapper or not.
        params.set("patient", patient);
    
        debug(`Contextualized request url: ${url.href}`);

        return url.href;
    }

    if (typeof requestOptions == "string" || requestOptions instanceof URL) {
        let url = new URL(requestOptions, base);
        return contextualURL(url);
    }
    else {
        let url = new URL(requestOptions.url, base);
        requestOptions.url = contextualURL(url);
        return requestOptions;
    }
}

module.exports = contextualize;