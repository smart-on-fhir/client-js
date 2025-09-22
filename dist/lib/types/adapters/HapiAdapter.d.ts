import NodeAdapter from "./NodeAdapter";
import { fhirclient } from "../types";
import { ResponseToolkit, Request, ResponseObject } from "hapi";
export interface HapiAdapterOptions {
    request: Request;
    responseToolkit: ResponseToolkit;
    storage?: fhirclient.Storage | fhirclient.storageFactory;
}
export default class HapiAdapter extends NodeAdapter {
    private _responseToolkit;
    private _request;
    /**
     * Holds the Storage instance associated with this instance
     */
    protected _storage: fhirclient.Storage | null;
    /**
     * @param options Environment-specific options
     */
    constructor(options: HapiAdapterOptions);
    /**
     * Returns a ServerStorage instance
     */
    getStorage(): fhirclient.Storage;
    /**
     * Given the current environment, this method must redirect to the given
     * path
     * @param location The path to redirect to
     */
    redirect(location: string): ResponseObject;
    /**
     * This is the static entry point and MUST be provided
     * @param request The hapi request
     * @param h The hapi response toolkit
     * @param storage Custom storage instance or a storage factory function
     */
    static smart(request: Request, h: ResponseToolkit, storage?: fhirclient.Storage | fhirclient.storageFactory): fhirclient.SMART;
}
