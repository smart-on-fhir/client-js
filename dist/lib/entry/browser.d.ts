declare const _default: {
    client: (state: string | import("../types").fhirclient.ClientState) => import("../Client").default;
    utils: any;
    oauth2: {
        settings: import("../types").fhirclient.BrowserFHIRSettings;
        ready: (options?: import("../types").fhirclient.ReadyOptions | undefined) => Promise<import("../Client").default>;
        authorize: (options: import("../types").fhirclient.AuthorizeParams) => Promise<string | void>;
        init: (options: import("../types").fhirclient.AuthorizeParams) => Promise<import("../Client").default>;
    };
};
export default _default;
