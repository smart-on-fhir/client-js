import express, { NextFunction, Request, RequestHandler, Response, Express, Router } from "express"
import cors from "cors"
import { AddressInfo, Server } from "net"

export type requestMethod = 'all'|'get'|'post'|'put'|'delete'|'patch'|'options'|'head'

interface requestDescriptor {
    method: requestMethod
    path: string
}

export interface MockOptions {
    bodyParser?: RequestHandler
    handler?: RequestHandler
    headers?: Record<string, string>
    status?: number
    _delay?: number
    file?: string
    body?: string | Record<string, any>
}


function routeWrap(fn: RequestHandler) {
    return async (req: Request, res: Response, next: NextFunction) => {
        return Promise.resolve(fn(req, res, next)).catch(e => next(String(e)));
    }
}

export default class MockServer
{
    private server: Server | null = null;
    private app: Express;
    private router: Router;
    readonly name: string;
    private silent: boolean;

    private _baseUrl: string | null = null;

    get baseUrl(): string {
        if (!this._baseUrl) {
            throw new Error(`The ${this.name} is not started`)
        }
        return this._baseUrl
    }

    constructor(name = "Mock Server", silent = true) {
        this.name   = name
        this.silent = silent
        this.router = express.Router();
        this.app    = express()

        this.app.use(cors())

        this.app.use((req: Request, res: any, next: NextFunction) => {
            res.set({
                "cache-control": "no-cache, no-store, must-revalidate",
                "pragma"       : "no-cache",
                "expires"      : "0"
            });
            next();
        });

        this.app.use((req: Request, res: Response, next: NextFunction) => {
            this.router(req, res, next)
        })
        
        this.app.use((req: Request, res: Response, next: NextFunction) => {
            // console.log(`${this.name} ====> Not Found: ${this._baseUrl}${req.url}`)
            res.status(404).send(`Not Found (${req.method} ${req.url})`);
        })
        
        this.app.use((err: Error, _req: Request, res: any, next: NextFunction) => {
            console.log(`============= ${this.name} Error =============`)
            console.error(err)
            console.log("=============================================")
            res.status(500).send(String(err));
        });
    }
    
    mock(a: string | requestDescriptor, mock: MockOptions): MockServer {
        if (typeof a === "string") {
            return this.mock({ method: "get", path: a }, mock)
        }
    
        if (mock.bodyParser) {
            this.router[a.method](a.path, mock.bodyParser)
        }
        
        this.router[a.method](a.path, (req: Request, res: any, next: NextFunction) => {
    
            setTimeout(() => {
    
                if (mock.handler) {
                    return routeWrap(mock.handler)(req, res, next);
                }
        
                if (mock.headers) {
                    res.set(mock.headers);
                }
        
                if (mock.status) {
                    res.status(mock.status);
                }
        
                if (mock.body) {
                    res.send(
                        mock.body && typeof mock.body == "object" ?
                            JSON.stringify(mock.body) :
                            mock.body
                    );
                }
        
                if (mock.file) {
                    res.sendFile(mock.file, { root: __dirname });
                } else {
                    res.end();
                }
            }, mock._delay || 0);
        });
        
        return this
    }

    clear() {
        this.router = express.Router();
        return this
    }

    start(): Promise<MockServer> {
        return new Promise(resolve => {
            this.server = this.app.listen(0, "localhost", () => {
                const address = this.server!.address() as AddressInfo
                this._baseUrl = "http://localhost:" + address.port
                if (!this.silent) console.log(`${this.name} listening at ${this._baseUrl}`)
                resolve(this)
            })
        })
    }

    stop(): Promise<MockServer> {
        return new Promise((resolve, reject) => {
            if (this.server && this.server.listening) {
                this.server.close((error?: Error) => {
                    if (error) {
                        reject(error)
                    } else {
                        if (!this.silent) console.log(`${this.name} stopped`)
                        resolve(this)
                    }
                })
            } else {
                resolve(this)
            }
        })
    }
}

