import NodeAdapter from "../adapters/NodeAdapter";
import { IncomingMessage, ServerResponse } from "http";
import { fhirclient } from "../types";
import { AbortController as Controller } from "abortcontroller-polyfill/dist/cjs-ponyfill";
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

smart.AbortController = Controller as typeof AbortController;
smart.FhirClient = FhirClient;

export = smart;
