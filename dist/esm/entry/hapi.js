import HapiAdapter from "../adapters/HapiAdapter";
export { default as FhirClient } from "../FhirClient";
export function smart(request, h, storage) {
    return new HapiAdapter({
        request,
        responseToolkit: h,
        storage
    }).getSmartApi();
}
