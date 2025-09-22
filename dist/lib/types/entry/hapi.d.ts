import { fhirclient } from "../types";
import { ResponseToolkit, Request } from "hapi";
declare function smart(request: Request, h: ResponseToolkit, storage?: fhirclient.Storage | fhirclient.storageFactory): fhirclient.SMART;
declare namespace smart {
    var AbortController: {
        new (): AbortController;
        prototype: AbortController;
    };
    var FhirClient: typeof import("../FhirClient").default;
}
export = smart;
