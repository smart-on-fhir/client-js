/// <reference types="node" />

import { IncomingMessage, ServerResponse } from "http";
import { fhirclient } from "./lib/types";
import Client from "./lib/Client";

export = smart;

type storageFactory = (options?: fhirclient.JsonObject) => fhirclient.Storage;

declare namespace smart {
    export const oauth2: fhirclient.SMART;
    export function client(stateOrURI: fhirclient.ClientState | string): Client;
    export const AbortController: {
        new (): AbortController;
        prototype: AbortController;
    };
}

declare function smart(
    req: IncomingMessage,
    res: ServerResponse,
    storage?: fhirclient.Storage | storageFactory
): fhirclient.SMART;

// interface OAuth2 {
//     settings: fhirclient.fhirSettings;
//     ready: fhirclient.readyFunction;
//     authorize: (p: fhirclient.AuthorizeParams) => Promise<never>;
//     init: (p: fhirclient.AuthorizeParams) => Promise<never|Client>;
// }
