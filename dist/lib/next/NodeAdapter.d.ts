/// <reference types="node" />
/// <reference types="node" />
import { IncomingMessage, ServerResponse } from "http";
import { fhirclient } from ".";
import { digestSha256, generatePKCEChallenge, importJWK, randomBytes, signCompactJws } from "./server";
interface NodeAdapterOptions {
    request: IncomingMessage;
    response: ServerResponse;
    storage?: fhirclient.Storage | fhirclient.storageFactory;
}
/**
 * Node Adapter - works with native NodeJS and with Express
 */
export default class NodeAdapter implements fhirclient.Adapter {
    /**
     * Holds the Storage instance associated with this instance
     */
    protected _storage: fhirclient.Storage | null;
    options: NodeAdapterOptions;
    security: {
        randomBytes: typeof randomBytes;
        digestSha256: typeof digestSha256;
        generatePKCEChallenge: typeof generatePKCEChallenge;
        importJWK: typeof importJWK;
        signCompactJws: typeof signCompactJws;
    };
    /**
     * @param options Environment-specific options
     */
    constructor(options: NodeAdapterOptions);
    relative(path: string): string;
    getProtocol(): string;
    getUrl(): URL;
    redirect(location: string): void;
    getStorage(): fhirclient.Storage;
    base64urlencode(input: string | Uint8Array): string;
    base64urldecode(input: string): string;
    getSmartApi(): fhirclient.SMART_API;
}
export {};
