import HapiAdapter from "../adapters/HapiAdapter";
import FhirClient from "../FhirClient";
function smart(request, h, storage) {
    return new HapiAdapter({
        request,
        responseToolkit: h,
        storage
    }).getSmartApi();
}
smart.AbortController = AbortController;
smart.FhirClient = FhirClient;
export default smart;
