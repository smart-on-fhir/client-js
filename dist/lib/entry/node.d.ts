/// <reference types="node" />
import { IncomingMessage, ServerResponse } from "http";
import { fhirclient } from "../types";
declare type storageFactory = (options?: Record<string, any>) => fhirclient.Storage;
declare function smart(request: IncomingMessage, response: ServerResponse, storage?: fhirclient.Storage | storageFactory): fhirclient.SMART;
declare namespace smart {
    var AbortController: {
        new (): AbortController;
        prototype: AbortController;
    };
    var FhirClient: typeof import("../FhirClient").default;
}
export = smart;
