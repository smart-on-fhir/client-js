import { IncomingMessage, ServerResponse } from "http"
import { fhirclient }                      from "."
import NodeAdapter                         from "./NodeAdapter"

type storageFactory = (options?: Record<string, any>) => fhirclient.Storage;

export default function smart(
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
