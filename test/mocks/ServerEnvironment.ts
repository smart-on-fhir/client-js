import ServerStorage  from "../../src/storage/ServerStorage";
import { fhirclient } from "../../src/types";
import * as security  from "../../src/security/server"
import { base64url }  from "jose"


export default class ServerEnvironment implements fhirclient.Adapter
{
    request: any;

    response: any;

    storage: any;

    options: fhirclient.JsonObject;

    security = security;

    constructor(request?: any, response?: any, storage?: any)
    {
        this.request  = request;
        this.response = response;

        if (storage) {
            if (typeof storage == "function") {
                this.storage = storage(request, response);
            } else {
                this.storage = storage;
            }
        } else {
            this.storage = new ServerStorage(this.request);
        }

        this.options = {
            request : this.request,
            response: this.response,
            storage : this.storage
        };
    }

    getUrl()
    {
        const req = this.request;
        const host = req.headers["x-forwarded-host"] || req.headers.host;
        const protocol = req.headers["x-forwarded-proto"] || req.protocol || "http";
        // if (!host) {
        //     const addr = req.socket.address() as AddressInfo;
        //     host = addr.address.replace("::1", "localhost");
        //     if ((addr.port != 80  && req.protocol == "http") ||
        //         (addr.port != 443 && req.protocol == "https"))
        //     {
        //         host += ":" + addr.port;
        //     }
        // }
        return new URL(req.originalUrl || req.path || req.url, protocol + "://" + host);
    }

    redirect(location: string)
    {
        this.response.writeHead(302, { location });
        this.response.end();
    }

    getStorage()
    {
        return this.storage;
    }

    relative(url: string)
    {
        return new URL(url, this.getUrl()).href;
    }

    base64encode(str: string): string
    {
        return Buffer.from(str).toString("base64");
    }

    base64decode(str: string): string
    {
        return Buffer.from(str, "base64").toString("ascii");
    }

    base64urlencode(input: string | Uint8Array)
    {
        return base64url.encode(input);
    }

    base64urldecode(input: string)
    {
        return base64url.decode(input).toString();
    }

    getSmartApi(): any
    {
        return false;
    }
}
