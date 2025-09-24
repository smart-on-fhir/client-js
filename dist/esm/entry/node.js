import NodeAdapter from "../adapters/NodeAdapter";
import FhirClient from "../FhirClient";
function smart(request, response, storage) {
    return new NodeAdapter({
        request,
        response,
        storage
    }).getSmartApi();
}
smart.FhirClient = FhirClient;
export default smart;
