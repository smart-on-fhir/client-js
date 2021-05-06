import { expect }   from "@hapi/code";
import * as Lab     from "@hapi/lab";
import { Response } from "cross-fetch";
import * as lib     from "../src/lib";
import HttpError    from "../src/HttpError";
import mockServer   from "./mocks/mockServer";
import ServerEnv    from "./mocks/ServerEnvironment";
import BrowserEnv   from "./mocks/BrowserEnvironment";
import { fhirclient } from "../src/types";

export const lab = Lab.script();
const { it, describe, beforeEach, afterEach } = lab;

describe("Lib", () => {

    describe("setPath", () => {
        it ("works as expected", () => {
            const data = { a: 1, b: [0, { a: 2 }] };
            expect(lib.setPath(data, "b.1.a", 3)).to.equal({ a: 1, b: [0, { a: 3 }] });
            expect(lib.setPath(data, "b.2"  , 7)).to.equal({ a: 1, b: [0, { a: 3 }, 7] });
        });

        it ("does nothing if the first argument is null", () => {
            // @ts-ignore
            expect(lib.setPath(null, "b.1.a", 3)).to.equal(null);
        });
    });

    describe("getPath", () => {
        it ("returns the first arg if no path", () => {
            const data = {};
            expect(lib.getPath(data)).to.equal(data);
        });

        it ("returns the first arg for empty path", () => {
            const data = {};
            expect(lib.getPath(data, "")).to.equal(data);
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
                expect(lib.getPath(data, path)).to.equal(map[path]);
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
            const access_token = "." + env.btoa(JSON.stringify({ exp: now + 10 })) + ".";
            expect(lib.getAccessTokenExpiration({ access_token }, env)).to.equal(now + 10);
        });

        it ("Using token.exp on the server", () => {
            const env = new ServerEnv();
            const now = Math.floor(Date.now() / 1000);
            const access_token = "." + env.btoa(JSON.stringify({ exp: now + 10 })) + ".";
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

    // describe("btoa", () => {
    //     it ("works in node", () => {
    //         expect(lib.btoa("abc")).to.equal("YWJj");
    //     });

    //     it ("works in browser", () => {
    //         // @ts-ignore
    //         global.window = 1;
    //         try {
    //             expect(lib.btoa("abc")).to.equal("YWJj");
    //         } catch (ex) {
    //             throw ex;
    //         } finally {
    //             // @ts-ignore
    //             delete global.window;
    //         }
    //     });
    // });

    describe("Request Functions", () => {

        let mockDataServer: any, mockUrl: string;


        beforeEach(() => {
            return new Promise((resolve, reject) => {
                // @ts-ignore
                mockDataServer = mockServer.listen(null, "0.0.0.0", (error: Error) => {
                    if (error) {
                        return reject(error);
                    }
                    const addr: any = mockDataServer.address();
                    mockUrl = `http://127.0.0.1:${addr.port}`;
                    // console.log(`Mock Data Server listening at ${mockUrl}`);
                    resolve(void 0);
                });
            });
        });

        afterEach(() => {
            if (mockDataServer && mockDataServer.listening) {
                return new Promise(resolve => {
                    mockUrl = "";
                    mockDataServer.close((error: Error) => {
                        if (error) {
                            console.log("Error shutting down the mock-data server: ", error);
                        }
                        // console.log("Mock Data Server CLOSED!");
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
                await expect(lib.fetchConformanceStatement("")).to.reject();
                // @ts-ignore
                await expect(lib.fetchConformanceStatement(null)).to.reject();
                await expect(lib.fetchConformanceStatement("whatever")).to.reject();
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
                expect(conformance).to.equal({resourceType: "Conformance"});
            });

            it("rejects on error", async () => {
                mockServer.mock({
                    status: 404,
                    body: "Not Found"
                });
                await expect(lib.fetchConformanceStatement(mockUrl)).to.reject(Error, /Not Found/);
            });
        });

        describe("request", () => {

            it ("follows the location header if the server replies with 201", async () => {
                mockServer.mock({
                    headers: { "location": mockUrl },
                    status : 201,
                    body   : null
                });
                mockServer.mock({
                    headers: { "content-type": "application/json" },
                    status : 200,
                    body   : { result: "success" }
                });
                const response = await lib.request(mockUrl);
                expect(response).to.equal({ result: "success" });
            });

            it ("correctly handles empty location header when the server replies with 201", async () => {
                mockServer.mock({
                    status : 201,
                    body   : null
                });
                // No location to redirect to, so no need for a second call to 
                // mockServer.mock().
                const response = await lib.request(mockUrl);
                expect(response.status).to.equal(201);
            });

            it ("respects the includeResponse option", async () => {
                mockServer.mock({
                    headers: { "content-type": "application/json" },
                    status : 200,
                    body   : { result: "success" }
                });

                const result = await lib.request<fhirclient.CombinedFetchResult>(mockUrl, { includeResponse: true });
                expect(result.body).to.equal({ result: "success" });
                expect(result.response.headers.get("Content-Type")).to.startWith("application/json");
            });
        });
    });
});
