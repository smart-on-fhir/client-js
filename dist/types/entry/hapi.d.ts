import ServerStorage from "../storage/ServerStorage";
import { ResponseToolkit, Request } from "hapi";
export { default as FhirClient } from "../FhirClient";
export declare function smart(request: Request, h: ResponseToolkit, storage?: ServerStorage | ((options?: Record<string, any>) => ServerStorage)): import("../types").fhirclient.SMART;
