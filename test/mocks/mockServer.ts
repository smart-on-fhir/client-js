import { Application, Request, Response } from "express";
import { AddressInfo } from "net";
import express from "express";
import cors    from "cors";

interface App extends Application {
    mock: (mock: any) => number;
    clear: () => any;
}

const app: App = express();
export default app;
app.use(cors());

const mocks: any[] = [];

app.mock = mock => mocks.push(mock);
app.clear = () => mocks.splice(0, mocks.length);


app.use((req, res, next) => {
    if (!mocks.length) {
        return next(new Error("No mocks defined for this request"));
    }
    const settings = mocks.shift();

    setTimeout(() => {
        if (settings.handler) {
            return settings.handler(req, res, next);
        }

        if (settings.headers) {
            res.set(settings.headers);
        }

        if (settings.status) {
            res.status(settings.status);
        }

        if (settings.body) {
            res.send(
                settings.body && typeof settings.body == "object" ?
                    JSON.stringify(settings.body) :
                    settings.body
            );
        }

        if (settings.file) {
            res.sendFile(settings.file, { root: __dirname });
        } else {
            res.end();
        }
    }, settings._delay || 0);
});

app.use((err: Error, _req: Request, res: Response, _next: () => any) => {
    res.status(500).send(err.message);
});

if (!module.parent) {
    const server = app.listen(3456, "0.0.0.0", () => {

        /**
         * @type any
         */
        const addr: AddressInfo = server.address() as AddressInfo;
        console.log(`Server listening at 0.0.0.0:${addr.port}`);
    });
}
