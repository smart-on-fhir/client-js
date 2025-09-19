import HapiAdapter from "../adapters/HapiAdapter";
import FhirClient from "../FhirClient";
import { fhirclient } from "../types";
import { ResponseToolkit, Request } from "hapi";


function smart(
    request: Request,
    h: ResponseToolkit,
    storage?: fhirclient.Storage | fhirclient.storageFactory
)
{
    return new HapiAdapter({
        request,
        responseToolkit: h,
        storage
    }).getSmartApi();
}

smart.AbortController = AbortController;
smart.FhirClient = FhirClient;

export = smart;
