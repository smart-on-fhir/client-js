import FhirClient from "../FhirClient";
declare const ready: (options?: import("../types").fhirclient.ReadyOptions) => Promise<import("../Client").default>, authorize: (options: import("../types").fhirclient.AuthorizeParams) => Promise<string | void>, init: (options: import("../types").fhirclient.AuthorizeParams) => Promise<never | import("../Client").default>, client: (state: string | import("../types").fhirclient.ClientState) => import("../Client").default, options: import("../types").fhirclient.BrowserFHIRSettings, utils: any;
export { ready, authorize, init, options as settings, utils, client as createSmartClient, FhirClient };
declare const FHIR: {
    client: (state: string | import("../types").fhirclient.ClientState) => import("../Client").default;
    FhirClient: typeof FhirClient;
    utils: any;
    oauth2: {
        settings: import("../types").fhirclient.BrowserFHIRSettings;
        ready: (options?: import("../types").fhirclient.ReadyOptions) => Promise<import("../Client").default>;
        authorize: (options: import("../types").fhirclient.AuthorizeParams) => Promise<string | void>;
        init: (options: import("../types").fhirclient.AuthorizeParams) => Promise<never | import("../Client").default>;
    };
};
export default FHIR;
