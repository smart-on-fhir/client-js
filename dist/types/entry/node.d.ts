import { IncomingMessage, ServerResponse } from "http";
import { fhirclient } from "../types";
export { default as FhirClient } from "../FhirClient";
export declare function smart(request: IncomingMessage, response: ServerResponse, storage?: fhirclient.Storage | fhirclient.storageFactory): fhirclient.SMART;
