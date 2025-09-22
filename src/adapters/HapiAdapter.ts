import NodeAdapter from "./NodeAdapter";
import ServerStorage from "../storage/ServerStorage";
import { fhirclient } from "../types";
import { ResponseToolkit, Request, ResponseObject } from "hapi";

export interface HapiAdapterOptions {
    request: Request;
    responseToolkit: ResponseToolkit;
    storage?: fhirclient.Storage | fhirclient.storageFactory;
}

export default class HapiAdapter extends NodeAdapter
{
    private _responseToolkit: ResponseToolkit;

    private _request: Request;

    /**
     * Holds the Storage instance associated with this instance
     */
    protected _storage: fhirclient.Storage | null = null;

    /**
     * @param options Environment-specific options
     */
    constructor(options: HapiAdapterOptions)
    {
        super({
            request : options.request.raw.req,
            response: options.request.raw.res,
            storage : options.storage
        });

        this._request         = options.request;
        this._responseToolkit = options.responseToolkit;
    }

    /**
     * Returns a ServerStorage instance
     */
    getStorage(): fhirclient.Storage
    {
        if (!this._storage) {
            if (this.options.storage) {
                if (typeof this.options.storage == "function") {
                    this._storage = this.options.storage({ request: this._request });
                } else {
                    this._storage = this.options.storage;
                }
            } else {
                this._storage = new ServerStorage(this._request as any);
            }
        }
        return this._storage as fhirclient.Storage;
    }

    /**
     * Given the current environment, this method must redirect to the given
     * path
     * @param location The path to redirect to
     */
    redirect(location: string): ResponseObject
    {
        return this._responseToolkit.redirect(location);
    }

    // /**
    //  * Returns the protocol of the current request
    //  */
    // getProtocol(): string
    // {
    //     const req = this.options.request;
    //     return req.headers["x-forwarded-proto"] as string || String(
    //         this._request.url.protocol || "http"
    //     ).replace(":", "");
    // }

    /**
     * This is the static entry point and MUST be provided
     * @param request The hapi request
     * @param h The hapi response toolkit
     * @param storage Custom storage instance or a storage factory function
     */
    static smart(
        request: Request,
        h: ResponseToolkit,
        storage?: fhirclient.Storage | fhirclient.storageFactory
    )
    {
        return new HapiAdapter({
            request,
            responseToolkit: h,
            storage
        }).getSmartApi();
    }
}
