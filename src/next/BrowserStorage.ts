import { fhirclient } from ".";

export default class Storage implements fhirclient.Storage
{
    async get(key: string): Promise<any> {
        const value = sessionStorage[key as keyof typeof sessionStorage];
        if (value) {
            return JSON.parse(value);
        }
        return null;
    }

    async set(key: string, value: any): Promise<any> {
        sessionStorage[key as keyof typeof sessionStorage] = JSON.stringify(value);
        return value;
    }

    async unset(key: string): Promise<boolean> {
        if (key in sessionStorage) {
            delete sessionStorage[key as keyof typeof sessionStorage];
            return true;
        }
        return false;
    }
}
