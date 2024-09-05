import { fhirclient } from ".";
export default class Storage implements fhirclient.Storage {
    get(key: string): Promise<any>;
    set(key: string, value: any): Promise<any>;
    unset(key: string): Promise<boolean>;
}
