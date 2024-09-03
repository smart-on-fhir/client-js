export default class Storage
{
    getItem(name: string) {
        return this[name as keyof typeof this];
    }

    setItem(name: string, value: any) {
        // @ts-ignore
        return this[name] = String(value);
    }

    removeItem(name: string) {
        delete this[name as keyof typeof this];
    }

    clear() {
        for (const key in this) {
            delete this[key as keyof typeof this];
        }
    }
}
