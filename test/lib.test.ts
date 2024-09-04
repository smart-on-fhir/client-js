import { AddressInfo, Server } from "net"
import { Request, Response }   from "express"
import chai, { expect }        from "chai"
import chaiAsPromised          from "chai-as-promised"
import * as lib                from "../src/lib"
import mockServer              from "./mocks/mockServer"
import ServerEnv               from "./mocks/ServerEnvironment"
import BrowserEnv              from "./mocks/BrowserEnvironment"

chai.use(chaiAsPromised)

describe("Lib", () => {

    describe("setPath", () => {
        it ("works as expected", () => {
            const data = { a: 1, b: [0, { a: 2 }] };
            expect(lib.setPath(data, "b.1.a", 3)).to.deep.equal({ a: 1, b: [0, { a: 3 }] });
            expect(lib.setPath(data, "b.2"  , 7)).to.deep.equal({ a: 1, b: [0, { a: 3 }, 7] });
        });

        it ("does nothing if the first argument is null", () => {
            // @ts-ignore
            expect(lib.setPath(null, "b.1.a", 3)).to.equal(null);
        });
    });

    describe("getPath", () => {
        it ("returns the first arg if no path", () => {
            const data = {};
            expect(lib.getPath(data)).to.deep.equal(data);
        });

        it ("returns the first arg for empty path", () => {
            const data = {};
            expect(lib.getPath(data, "")).to.deep.equal(data);
        });

        it ("works as expected", () => {
            const data = { a: 1, b: [0, { a: 2 }] };
            expect(lib.getPath(data, "b.1.a")).to.equal(2);
            expect(lib.getPath(data, "b.4.a")).to.equal(undefined);
        });

        it ("dive into arrays", () => {
            const data = {
                a: [
                    { x: [ { y: 2, z: 3 } ] },
                    { x: [ { y: 4, z: 5 } ] }
                ]
            };

            const map = {
                "a"           : [ { x: [ { y: 2, z: 3 } ] }, { x: [ { y: 4, z: 5 } ] } ],
                "a."          : [ { x: [ { y: 2, z: 3 } ] }, { x: [ { y: 4, z: 5 } ] } ],
                "a.."         : [ { x: [ { y: 2, z: 3 } ] }, { x: [ { y: 4, z: 5 } ] } ],
                "a.length"    : 2,
                "a.0"         : { x: [ { y: 2, z: 3 } ] },
                "a.1"         : { x: [ { y: 4, z: 5 } ] },
                "a..x"        : [ [ { y: 2, z: 3 } ], [ { y: 4, z: 5 } ] ], // data.a.map(o => o.x),
                "a..x.length" : [ 1, 1 ], // data.a.map(o => o.x.length),
                "a..x.0"      : [ { y: 2, z: 3 }, { y: 4, z: 5 } ], // data.a.map(o => o.x[0]),
                "a..x.1"      : [ undefined, undefined ], // data.a.map(o => o.x[1]),
                "a..x.0.y"    : [ 2, 4 ], // data.a.map(o => o.x[0].y),
                "a..x.0.z"    : [ 3, 5 ], // data.a.map(o => o.x[0].z),
                "a..x..y"     : [[2], [4]], // data.a.map(o => o.x.map(o => o.y)),
                "a..x..z"     : [[3], [5]], // data.a.map(o => o.x.map(o => o.z)),
            };

            for (let path in map) {
                expect(lib.getPath(data, path)).to.deep.equal(map[path as keyof typeof map]);
            }
        });
    });

    describe("absolute", () => {
        it ("returns http, https or urn URI as is", () => {
            [
                "http://a/b/c",
                "https://a/b/c",
                "urn:a:b:c"
            ].forEach(uri => {
                expect(lib.absolute(uri)).to.equal(uri);
            });
        });

        // it ("if no serverUrl is provided returns URLs mounted to the current domain", () => {
        //     expect(lib.absolute("/")).to.equal(window.location.href);
        // });

        it ("returns URLs mounted to the given domain", () => {
            expect(lib.absolute("/", "http://google.com")).to.equal("http://google.com/");
            expect(lib.absolute("/a/b/c", "http://google.com")).to.equal("http://google.com/a/b/c");
            expect(lib.absolute("a/b/c", "http://google.com")).to.equal("http://google.com/a/b/c");
        });

        it ("returns site rooted paths if no baseUrl is provided", () => {
            expect(lib.absolute("/")).to.equal("/");
            expect(lib.absolute("a/b/c")).to.equal("/a/b/c");
            expect(lib.absolute("./a/b/c")).to.equal("/./a/b/c");
        });
    });

    describe("randomString", () => {
        it ("respects strLength", () => {
            expect(lib.randomString( ).length).to.equal(8);
            expect(lib.randomString(2).length).to.equal(2);
            expect(lib.randomString(9).length).to.equal(9);
        });

        it ("respects charSet", () => {
            expect(lib.randomString(8, "abc")).to.match(/^[abc]{8}$/);
            expect(lib.randomString(8, "xyz")).to.match(/^[xyz]{8}$/);
            expect(lib.randomString(8, "123")).to.match(/^[123]{8}$/);
        });
    });

    describe("getTimeInFuture", () => {
        it ("Add X seconds to a supplied date", () => {
            const now = new Date();
            const delta = 123;
            expect(lib.getTimeInFuture(delta, now)).to.equal(Math.floor(now.getTime() / 1000) + delta);
        })
    });

    describe("getAccessTokenExpiration", () => {

        it ("Using expires_in in the browser", () => {
            const now = Math.floor(Date.now() / 1000);
            expect(lib.getAccessTokenExpiration({ expires_in: 10 }, new BrowserEnv())).to.equal(now + 10);
        });

        it ("Using expires_in on the server", () => {
            const now = Math.floor(Date.now() / 1000);
            expect(lib.getAccessTokenExpiration({ expires_in: 10 }, new ServerEnv())).to.equal(now + 10);
        });

        it ("Using token.exp in the browser", () => {
            const env = new BrowserEnv();
            const now = Math.floor(Date.now() / 1000);
            const access_token = "." + env.base64encode(JSON.stringify({ exp: now + 10 })) + ".";
            expect(lib.getAccessTokenExpiration({ access_token }, env)).to.equal(now + 10);
        });

        it ("Using token.exp on the server", () => {
            const env = new ServerEnv();
            const now = Math.floor(Date.now() / 1000);
            const access_token = "." + env.base64encode(JSON.stringify({ exp: now + 10 })) + ".";
            expect(lib.getAccessTokenExpiration({ access_token }, env)).to.equal(now + 10);
        });

        it ("fails back to 5 min in the browser", () => {
            const env = new BrowserEnv();
            const now = Math.floor(Date.now() / 1000);
            const access_token = "x";
            expect(lib.getAccessTokenExpiration({ access_token }, env)).to.equal(now + 300);
        });

        it ("fails back to 5 min on the server", () => {
            const env = new ServerEnv();
            const now = Math.floor(Date.now() / 1000);
            const access_token = "x";
            expect(lib.getAccessTokenExpiration({ access_token }, env)).to.equal(now + 300);
        });
    });

    describe("Request Functions", () => {

        let mockDataServer: Server, mockUrl: string;

        beforeEach(() => {
            return new Promise((resolve, reject) => {
                mockDataServer = mockServer.listen(0, "0.0.0.0", (error?: Error) => {
                    if (error) {
                        return reject(error);
                    }
                    const addr = mockDataServer.address() as AddressInfo;
                    mockUrl = `http://127.0.0.1:${addr.port}`;
                    resolve(void 0);
                });
            });
        });

        afterEach(() => {
            if (mockDataServer && mockDataServer.listening) {
                return new Promise(resolve => {
                    mockUrl = "";
                    mockDataServer.close(error => {
                        if (error) {
                            console.log("Error shutting down the mock-data server: ", error);
                        }
                        resolve(void 0);
                    });
                });
            }
        });

        describe("getAndCache", () => {
            it ("returns second hit from cache", async () => {
                mockServer.mock({
                    headers: { "content-type": "text/plain" },
                    status: 200,
                    body: "abc"
                });

                const result = await lib.getAndCache(mockUrl, {}, false);
                expect(result).to.equal("abc");

                const result2 = await lib.getAndCache(mockUrl, {}, false);
                expect(result2).to.equal("abc");
            });

            it ("can force-load and update the cache", async () => {
                mockServer.mock({
                    headers: { "content-type": "text/plain" },
                    status: 200,
                    body: "abc"
                });

                const result = await lib.getAndCache(mockUrl, {}, false);
                expect(result).to.equal("abc");

                mockServer.mock({
                    headers: { "content-type": "text/plain" },
                    status: 200,
                    body: "123"
                });

                const result2 = await lib.getAndCache(mockUrl, {}, false);
                expect(result2).to.equal("abc");

                const result3 = await lib.getAndCache(mockUrl, {}, true);
                expect(result3).to.equal("123");
            });
        });

        describe("fetchConformanceStatement", () => {

            it ("rejects bad baseUrl values", async () => {
                await expect(lib.fetchConformanceStatement("")).to.eventually.be.rejected;
                // @ts-ignore
                await expect(lib.fetchConformanceStatement(null)).to.eventually.be.rejected;
                await expect(lib.fetchConformanceStatement("whatever")).to.eventually.be.rejected;
            });

            it("works", async () => {
                mockServer.mock({
                    headers: { "content-type": "application/json" },
                    status: 200,
                    body: {
                        resourceType: "Conformance"
                    }
                });
                const conformance = await lib.fetchConformanceStatement(mockUrl);
                // @ts-ignore
                expect(conformance).to.deep.equal({resourceType: "Conformance"});
            });

            it("rejects on error", async () => {
                mockServer.mock({
                    status: 404,
                    body: "Not Found"
                });
                await expect(lib.fetchConformanceStatement(mockUrl)).to.rejectedWith(Error, /Not Found/);
            });
        });

        describe("request", () => {

            it ("follows the location header if the server replies with 201", async () => {
                mockServer.mock({
                    headers: { location: mockUrl },
                    status : 201,
                    body   : null
                });
                mockServer.mock({
                    headers: { "content-type": "application/json" },
                    status : 200,
                    body   : { result: "success" }
                });
                const response: any = await lib.request(mockUrl);
                expect(response).to.deep.equal({ result: "success" });
            });

            it ("respects the includeResponse option", async () => {
                mockServer.mock({
                    headers: { "content-type": "application/json" },
                    status : 200,
                    body   : { result: "success" }
                });

                const result: any = await lib.request(mockUrl, { includeResponse: true });
                expect(result.body).to.deep.equal({ result: "success" });
                expect(result.response.headers.get("content-type") + "").to.include("application/json");
            });

            it ("returns the response object if the response body is undefined", async () => {
                mockServer.mock({
                    headers: { "content-type": "application/json" },
                    status : 200,
                    handler: (_: Request, res: Response) => res.end()
                });

                const result: any = await lib.request(mockUrl);
                expect(result).to.be.instanceOf(Response);
            });
        });
    });

    describe("units", () => {
        describe ("cm", () => {
            expect(lib.units.cm({ code: "cm", value: 3 })).to.equal(3);
            expect(lib.units.cm({ code: "m", value: 3 })).to.equal(300);
            expect(lib.units.cm({ code: "in", value: 3 })).to.equal(3 * 2.54);
            expect(lib.units.cm({ code: "[in_us]", value: 3 })).to.equal(3 * 2.54);
            expect(lib.units.cm({ code: "[in_i]", value: 3 })).to.equal(3 * 2.54);
            expect(lib.units.cm({ code: "ft", value: 3 })).to.equal(3 * 30.48);
            expect(lib.units.cm({ code: "[ft_us]", value: 3 })).to.equal(3 * 30.48);
            expect(() => lib.units.cm({ code: "xx", value: 3 })).to.throw();
            // @ts-ignore
            expect(() => lib.units.cm({ code: "m", value: "x" })).to.throw();
        });
        describe ("kg", () => {
            expect(lib.units.kg({ code: "kg", value: 3 })).to.equal(3);
            expect(lib.units.kg({ code: "g", value: 3 })).to.equal(3 / 1000);
            expect(lib.units.kg({ code: "lb", value: 3 })).to.equal(3 / 2.20462);
            expect(lib.units.kg({ code: "oz", value: 3 })).to.equal(3 / 35.274);
            expect(() => lib.units.kg({ code: "xx", value: 3 })).to.throw();
            // @ts-ignore
            expect(() => lib.units.kg({ code: "lb", value: "x" })).to.throw();
        });
        describe ("any", () => {
            // @ts-ignore
            expect(lib.units.any({ value: 3 })).to.equal(3);
            // @ts-ignore
            expect(() => lib.units.kg({ value: "x" })).to.throw();
        });
    });
});
