import { EventEmitter } from "events";

export default class Location extends EventEmitter
{
    private _href: string;

    private _readonly = false;

    constructor(url: string = "http://localhost") {
        super();
        this._href = url;
    }

    get href()
    {
        return this._href;
    }

    set href(value)
    {
        if (this._readonly) {
            throw new Error("Cannot change window location");
        }
        this._href = value;
        this.emit("change", value);
    }

    get origin()
    {
        return new URL(this._href).origin;
    }

    get readonly()
    {
        return this._readonly;
    }

    set readonly(value: boolean)
    {
        this._readonly = !!value;
    }

    assign(href: string)
    {
        this.href = href;
        this.emit("change", href);
    }

    toString()
    {
        return this._href;
    }
}
