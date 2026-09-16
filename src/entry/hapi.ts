import HapiAdapter from "../adapters/HapiAdapter";
import ServerStorage from "../storage/ServerStorage";
import { ResponseToolkit, Request } from "hapi";
export { default as FhirClient } from "../FhirClient";

export function smart(
    request: Request,
    h: ResponseToolkit,
    storage?: ServerStorage | ((options?: Record<string, any>) => ServerStorage)
) {
    return new HapiAdapter({
        request,
        responseToolkit: h,
        storage
    }).getSmartApi();
}
