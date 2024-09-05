import { fhirclient } from "."


export default class ServerStorage implements fhirclient.Storage
{
    request: fhirclient.RequestWithSession;

    constructor(request: fhirclient.RequestWithSession) {
        this.request = request;
    }

    async get(key: string): Promise<any> {
        return this.request.session[key];
    }

    async set(key: string, value: any): Promise<any> {
        this.request.session[key] = value;
        return value;
    }

    async unset(key: string): Promise<boolean> {
        if (Object.prototype.hasOwnProperty.call(this.request.session, key)) {
            delete this.request.session[key];
            return true;
        }
        return false;
    }
}
