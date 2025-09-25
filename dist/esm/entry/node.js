import NodeAdapter from "../adapters/NodeAdapter";
export { default as FhirClient } from "../FhirClient";
export function smart(request, response, storage) {
    return new NodeAdapter({
        request,
        response,
        storage
    }).getSmartApi();
}
