/// <reference types="node" />
import { IncomingMessage, ServerResponse } from "http";
import { fhirclient } from ".";
declare type storageFactory = (options?: Record<string, any>) => fhirclient.Storage;
export default function smart(request: IncomingMessage, response: ServerResponse, storage?: fhirclient.Storage | storageFactory): fhirclient.SMART_API;
export {};
