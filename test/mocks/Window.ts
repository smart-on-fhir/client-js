import MockLocation from "./Location";
import MockSessionStorage from "./SessionStorage";
import { EventEmitter } from "events";

class History
{
    _location: string;

    constructor()
    {
        this._location = "";
    }

    replaceState(a: any, b: any, loc: string)
    {
        this._location = loc;
    }
}

export default class Window extends EventEmitter
{
    FHIR: any;
    history: History;
    frames: any;
    parent: any;
    top: any;
    self: any;
    opener: any;
    location: MockLocation;
    name: string;
    features: string;
    sessionStorage: MockSessionStorage;

    constructor(url = "http://localhost", name = "", features = "")
    {
        super();
        this.name = name;
        this.features = features;
        this.history = new History();
        this.location = new MockLocation(url);
        this.sessionStorage = new MockSessionStorage();

        this.frames = {};
        this.parent = this;
        this.top = this;
        this.self = this;
        this.opener = null;

        this.FHIR = {
            // client: (...args) => new Client(env, ...args),
            oauth2: {
                settings: {
                    replaceBrowserHistory: true,
                    fullSessionStorageSupport: true
                },
                // ready: (...args) => smart.ready(env, ...args),
                // authorize: (...args) => smart.authorize(env, ...args)
                // $lab:coverage:on$
            }
        };
    }

    atob(str: string) {
        return Buffer.from(str, "base64").toString("ascii");
    }

    addEventListener(event: string, handler: (event?:any) => any)
    {
        this.on(event, handler);
    }

    removeEventListener(event: string, handler: (event?:any) => any)
    {
        this.removeListener(event, handler);
    }

    postMessage(event: any, origin?: string)
    {
        this.emit("message", {
            data: event,
            origin
        });
    }

    open(url: string, name: string, features: string)
    {
        let prevented = false;
        this.emit("beforeOpen", {
            prevent: () => {
                prevented = true;
            }
        });
        if (prevented) {
            return null;
        }
        return new Window(url, name, features);
    }

    close() {
        /* stub */
    }
}
