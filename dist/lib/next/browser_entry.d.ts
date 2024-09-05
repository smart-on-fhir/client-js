declare function smart(settings?: Record<string, any>): typeof smart;
declare namespace smart {
    var authorize: (options: import(".").fhirclient.AuthorizeParams) => Promise<string | void>;
    var ready: (options?: import(".").fhirclient.ReadyOptions | undefined) => Promise<any>;
    var init: (options: import(".").fhirclient.AuthorizeParams) => Promise<import(".").fhirclient.ClientInterface>;
    var client: (state: string | import(".").fhirclient.ClientState) => import(".").fhirclient.ClientInterface;
    var utils: any;
}
export default smart;
