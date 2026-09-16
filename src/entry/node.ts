import NodeAdapter from "../adapters/NodeAdapter";
import { IncomingMessage, ServerResponse } from "http";
import ServerStorage from "../storage/ServerStorage";
export { default as FhirClient } from "../FhirClient";

export function smart(
    request: IncomingMessage,
    response: ServerResponse,
    storage?: ServerStorage | ((options?: Record<string, any>) => ServerStorage)
)
{
    return new NodeAdapter({
        request,
        response,
        storage
    }).getSmartApi();
}
