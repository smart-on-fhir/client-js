import { fhirclient } from ".";
export default class ServerStorage implements fhirclient.Storage {
    request: fhirclient.RequestWithSession;
    constructor(request: fhirclient.RequestWithSession);
    get(key: string): Promise<any>;
    set(key: string, value: any): Promise<any>;
    unset(key: string): Promise<boolean>;
}
