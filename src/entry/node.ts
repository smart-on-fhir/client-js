import NodeAdapter from "../adapters/NodeAdapter";
import { IncomingMessage, ServerResponse } from "http";
import { fhirclient } from "../types";
import FhirClient from "../FhirClient";

type storageFactory = (options?: Record<string, any>) => fhirclient.Storage;

function smart(
    request: IncomingMessage,
    response: ServerResponse,
    storage?: fhirclient.Storage | storageFactory
)
{
    return new NodeAdapter({
        request,
        response,
        storage
    }).getSmartApi();
}

smart.AbortController = AbortController;
smart.FhirClient = FhirClient;

export = smart;
