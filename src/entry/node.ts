import NodeAdapter from "../adapters/NodeAdapter";
import { IncomingMessage, ServerResponse } from "http";
import { fhirclient } from "../types";
export { default as FhirClient } from "../FhirClient";

export function smart(
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
