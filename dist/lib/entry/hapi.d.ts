import { fhirclient } from "../types";
import { ResponseToolkit, Request } from "hapi";
export default function smart(request: Request, h: ResponseToolkit, storage?: fhirclient.Storage | fhirclient.storageFactory): fhirclient.SMART;
