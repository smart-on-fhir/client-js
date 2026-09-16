import { IncomingMessage, ServerResponse } from "http";
import ServerStorage from "../storage/ServerStorage";
export { default as FhirClient } from "../FhirClient";
export declare function smart(request: IncomingMessage, response: ServerResponse, storage?: ServerStorage | ((options?: Record<string, any>) => ServerStorage)): import("../types").fhirclient.SMART;
