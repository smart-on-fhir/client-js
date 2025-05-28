import { fhirclient } from "../types";
import Client from "../Client";
import FhirClient from "../FhirClient";
declare const FHIR: {
    AbortController: {
        new (): AbortController;
        prototype: AbortController;
    };
    client: (state: string | fhirclient.ClientState) => Client;
    /**
     * Using this class if you are connecting to open server that does not
     * require authorization.
     */
    FhirClient: typeof FhirClient;
    utils: any;
    oauth2: {
        settings: fhirclient.BrowserFHIRSettings;
        ready: (options?: fhirclient.ReadyOptions) => Promise<Client>;
        authorize: (options: fhirclient.AuthorizeParams) => Promise<string | void>;
        init: (options: fhirclient.AuthorizeParams) => Promise<Client>;
    };
};
export = FHIR;
