import FhirClient from "../FhirClient";
declare const FHIR: {
    AbortController: {
        new (): AbortController;
        prototype: AbortController;
    };
    client: (state: string | import("../types").fhirclient.ClientState) => import("../Client").default;
    /**
     * Using this class if you are connecting to open server that does not
     * require authorization.
     */
    FhirClient: typeof FhirClient;
    utils: any;
    oauth2: {
        settings: import("../types").fhirclient.BrowserFHIRSettings;
        ready: (options?: import("../types").fhirclient.ReadyOptions) => Promise<import("../Client").default>;
        authorize: (options: import("../types").fhirclient.AuthorizeParams) => Promise<string | void>;
        init: (options: import("../types").fhirclient.AuthorizeParams) => Promise<never | import("../Client").default>;
    };
};
export = FHIR;
