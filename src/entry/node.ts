import NodeAdapter from "../adapters/NodeAdapter";
import { IncomingMessage, ServerResponse } from "http";
import { fhirclient } from "../types";
import FhirClient from "../FhirClient";


function smart(
    request: IncomingMessage,
    response: ServerResponse,
    storage?: fhirclient.Storage | fhirclient.storageFactory
)
{
    return new NodeAdapter({
        request,
        response,
        storage
    }).getSmartApi();
}

smart.FhirClient = FhirClient;

export default smart;
