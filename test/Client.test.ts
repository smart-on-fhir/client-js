// Mocks
import { expect }     from "@hapi/code";
import * as Lab       from "@hapi/lab";
import * as FS        from "fs";
import * as jwt       from "jsonwebtoken"
import { Response }   from "cross-fetch";
import mockDebug      from "./mocks/mockDebug";
import mockServer     from "./mocks/mockServer";
import ServerEnv      from "./mocks/ServerEnvironment";
import BrowserEnv     from "./mocks/BrowserEnvironment";
import BrowserEnvFhir from "./mocks/BrowserEnvironmentWithFhirJs";
import Window         from "./mocks/Window";
import str            from "../src/strings";
import Client         from "../src/Client";
import { KEY }        from "../src/smart";
import Adapter        from "../src/adapters/BrowserAdapter";
import { fhirclient } from "../src/types";

export const lab = Lab.script();
const { it, describe, before, after, afterEach } = lab;

const clientDebug = mockDebug.instances.find(instance => instance.namespace === "FHIR:client");

let mockDataServer: any, mockUrl: string;

before(() => {
    return new Promise((resolve, reject) => {

        // @ts-ignore
        mockDataServer = mockServer.listen(null, "0.0.0.0", (error: Error) => {
            if (error) {
                return reject(error);
            }
            const addr = mockDataServer.address();
            mockUrl = `http://127.0.0.1:${addr.port}`;
            // console.log(`Mock Data Server listening at ${mockUrl}`);
            resolve(void 0);
        });
    });
});

after(() => {
    if (mockDataServer && mockDataServer.listening) {
        return new Promise((resolve, reject) => {
            mockUrl = "";
            delete (global as any).fetch;
            mockDataServer.close((error: Error) => {
                if (error) {
                    reject(new Error("Error shutting down the mock-data server: " + error));
                }
                // console.log("Mock Data Server CLOSED!");
                resolve(void 0);
            });
        });
    }
});

afterEach(() => {
    mockServer.clear();
    clientDebug._calls.length = 0;
    delete (global as any).sessionStorage;
});




function crossPlatformTest(callback: (env: Adapter) => void) {
    const tests: Record<string, any> = {
        "works in the browser": new BrowserEnv(),
        "works on the server" : new ServerEnv({ session: {} })
    };

    for (const name in tests) {
        it (name, () => callback(tests[name]));
    }
}

describe("FHIR.client", () => {

    describe("constructor", () => {
        it ("throws if initialized without arguments", () => {
            // @ts-ignore
            expect(() => new Client()).to.throw();
        });

        it ("throws if initialized without serverUrl", () => {
            // @ts-ignore
            expect(() => new Client({}, {})).to.throw();
        });

        it ("throws if initialized with invalid serverUrl", () => {
            // @ts-ignore
            expect(() => new Client({}, "invalid-url")).to.throw();
        });

        it ("accepts string as second argument", () => {
            // @ts-ignore
            expect(new Client({}, "http://test").state).to.equal({ serverUrl: "http://test" });
        });
    });

    describe("patient.read", () => {

        describe("rejects with no patient", () => {
            crossPlatformTest(async (env) => {
                const client = new Client(env, {
                    serverUrl: mockUrl,
                    tokenResponse: {}
                });
                await expect(client.patient.read()).to.reject(
                    Error, "Patient is not available"
                );
            });
        });

        describe("can be aborted", () => {
            crossPlatformTest(async (env) => {
                const client = new Client(env, {
                    serverUrl: mockUrl,
                    tokenResponse: {
                        patient: "2e27c71e-30c8-4ceb-8c1c-5641e066c0a4"
                    }
                });

                mockServer.mock({
                    headers: { "content-type": "application/json" },
                    status: 200,
                    body: {
                        resourceType: "Patient",
                        id: "2e27c71e-30c8-4ceb-8c1c-5641e066c0a4"
                    },
                    _delay: 10
                });

                const AbortController = env.getAbortController();
                const abortController = new AbortController();
                const task = client.patient.read({ signal: abortController.signal });
                abortController.abort();
                await expect(task).to.reject(
                    Error, "The user aborted a request."
                );
            });
        });

        it ("works as expected", () => {
            crossPlatformTest(async (env) => {
                const mock = {
                    headers: { "content-type": "application/json" },
                    status: 200,
                    body: {
                        resourceType: "Patient",
                        id: "2e27c71e-30c8-4ceb-8c1c-5641e066c0a4"
                    }
                };

                const client = new Client(env, {
                    serverUrl: mockUrl,
                    tokenResponse: {
                        patient: "2e27c71e-30c8-4ceb-8c1c-5641e066c0a4"
                    }
                });
                mockServer.mock(mock);
                const result = await client.patient.read();
                expect(result).to.include({ resourceType: "Patient", id: "2e27c71e-30c8-4ceb-8c1c-5641e066c0a4" });
            });
        });

        it ("works with includeResponse: true", () => {
            crossPlatformTest(async (env) => {
                const mock = {
                    headers: { "content-type": "application/json" },
                    status: 200,
                    body: {
                        resourceType: "Patient",
                        id: "2e27c71e-30c8-4ceb-8c1c-5641e066c0a4"
                    }
                };

                const client = new Client(env, {
                    serverUrl: mockUrl,
                    tokenResponse: {
                        patient: "2e27c71e-30c8-4ceb-8c1c-5641e066c0a4"
                    }
                });

                mockServer.mock(mock);
                // const patient1 = await client.patient.read({});
                // const patient2 = await client.patient.read({ includeResponse: false });
                const result = await client.patient.read({ includeResponse: true });
                expect(result.body).to.include({ resourceType: "Patient", id: "2e27c71e-30c8-4ceb-8c1c-5641e066c0a4" });
                expect(result.response.status).to.equal(200);
            });
        });

    });

    describe("patient.request", () => {
        describe("rejects with no patient", () => {
            crossPlatformTest(async (env) => {
                const client = new Client(env, {
                    serverUrl: mockUrl,
                    tokenResponse: {}
                });
                await expect(client.patient.request("Observation")).to.reject(
                    Error, "Patient is not available"
                );
            });
        });

        describe("throws on incorrect path", () => {
            crossPlatformTest(async (env) => {
                const client = new Client(env, {
                    serverUrl: mockUrl,
                    tokenResponse: {
                        patient: "2e27c71e-30c8-4ceb-8c1c-5641e066c0a4"
                    }
                });
                await expect(client.patient.request("/")).to.reject(
                    Error, `Invalid url "${mockUrl + "/"}"`
                );
            });
        });

        describe("rejects for not supported resource types", () => {
            crossPlatformTest(async (env) => {
                const client = new Client(env, {
                    serverUrl: mockUrl,
                    tokenResponse: {
                        patient: "2e27c71e-30c8-4ceb-8c1c-5641e066c0a4"
                    }
                });

                // Mock the conformance statement
                mockServer.mock({
                    headers: { "content-type": "application/json" },
                    status: 200,
                    body: {}
                });

                mockServer.mock({
                    headers: { "content-type": "application/json" },
                    status: 200,
                    body: {
                        resourceType: "Observation",
                        id: "whatever"
                    }
                });

                await expect(client.patient.request("Observation")).to.reject(
                    Error,
                    "Resource \"Observation\" is not supported by this FHIR server"
                );
            });
        });

        describe("rejects if a search param cannot be determined", () => {
            crossPlatformTest(async (env) => {
                const client = new Client(env, {
                    serverUrl: mockUrl,
                    tokenResponse: {
                        patient: "2e27c71e-30c8-4ceb-8c1c-5641e066c0a4"
                    }
                });

                // Mock the conformance statement
                mockServer.mock({
                    headers: { "content-type": "application/json" },
                    status: 200,
                    body: {
                        rest: [{
                            resource: [{
                                type: "Observation"
                            }]
                        }]
                    }
                });

                mockServer.mock({
                    headers: { "content-type": "application/json" },
                    status: 200,
                    body: {
                        resourceType: "Observation",
                        id: "whatever"
                    }
                });

                await expect(client.patient.request("Observation")).to.reject(
                    Error,
                    "No search parameters supported for \"Observation\" on this FHIR server"
                );
            });
        });

        describe("rejects if a resource is not in the patient compartment", () => {
            crossPlatformTest(async (env) => {
                const client = new Client(env, {
                    serverUrl: mockUrl,
                    tokenResponse: {
                        patient: "2e27c71e-30c8-4ceb-8c1c-5641e066c0a4"
                    }
                });

                // Mock the conformance statement
                mockServer.mock({
                    headers: { "content-type": "application/json" },
                    status: 200,
                    body: {
                        rest: [{
                            resource: [{
                                type: "Test"
                            }]
                        }]
                    }
                });

                mockServer.mock({
                    headers: { "content-type": "application/json" },
                    status: 200,
                    body: {
                        resourceType: "Test",
                        id: "whatever"
                    }
                });

                await expect(client.patient.request("Test")).to.reject(
                    Error,
                    "Cannot filter \"Test\" resources by patient"
                );
            });
        });

        describe("works as expected with a string URL", () => {
            crossPlatformTest(async (env) => {
                const client = new Client(env, {
                    serverUrl: mockUrl,
                    tokenResponse: {
                        patient: "2e27c71e-30c8-4ceb-8c1c-5641e066c0a4"
                    }
                });

                // Mock the conformance statement
                mockServer.mock({
                    headers: { "content-type": "application/json" },
                    status: 200,
                    body: {
                        rest: [{
                            resource: [{
                                type: "Observation",
                                searchParam: [
                                    { name: "patient" }
                                ]
                            }]
                        }]
                    }
                });

                mockServer.mock({
                    headers: { "content-type": "application/json" },
                    status: 200,
                    body: {
                        resourceType: "Observation",
                        id: "whatever"
                    }
                });

                await client.patient.request("Observation");
            });
        });

        describe("works as expected with URL instance", () => {
            crossPlatformTest(async (env) => {
                const client = new Client(env, {
                    serverUrl: mockUrl,
                    tokenResponse: {
                        patient: "2e27c71e-30c8-4ceb-8c1c-5641e066c0a4"
                    }
                });

                // Mock the conformance statement
                mockServer.mock({
                    headers: { "content-type": "application/json" },
                    status: 200,
                    body: {
                        rest: [{
                            resource: [{
                                type: "Observation",
                                searchParam: [
                                    { name: "patient" }
                                ]
                            }]
                        }]
                    }
                });

                mockServer.mock({
                    headers: { "content-type": "application/json" },
                    status: 200,
                    body: {
                        resourceType: "Observation",
                        id: "whatever"
                    }
                });

                await client.patient.request(new URL("Observation", mockUrl));
            });
        });

        describe("works as expected with request options", () => {
            crossPlatformTest(async (env) => {
                const client = new Client(env, {
                    serverUrl: mockUrl,
                    tokenResponse: {
                        patient: "2e27c71e-30c8-4ceb-8c1c-5641e066c0a4"
                    }
                });

                // Mock the conformance statement
                mockServer.mock({
                    headers: { "content-type": "application/json" },
                    status: 200,
                    body: {
                        rest: [{
                            resource: [{
                                type: "Observation",
                                searchParam: [
                                    { name: "patient" }
                                ]
                            }]
                        }]
                    }
                });

                mockServer.mock({
                    headers: { "content-type": "application/json" },
                    status: 200,
                    body: {
                        resourceType: "Observation",
                        id: "whatever"
                    }
                });

                await client.patient.request({ url: "Observation" });
            });
        });

        describe("can be aborted", () => {
            crossPlatformTest(async (env) => {
                const client = new Client(env, {
                    serverUrl: mockUrl,
                    tokenResponse: {
                        patient: "2e27c71e-30c8-4ceb-8c1c-5641e066c0a4"
                    }
                });

                // Mock the conformance statement
                mockServer.mock({
                    headers: { "content-type": "application/json" },
                    status: 200,
                    body: {
                        rest: [{
                            resource: [{
                                type: "Observation",
                                searchParam: [
                                    { name: "patient" }
                                ]
                            }]
                        }]
                    },
                    _delay: 10
                });

                mockServer.mock({
                    headers: { "content-type": "application/json" },
                    status: 200,
                    body: {
                        resourceType: "Observation",
                        id: "whatever"
                    },
                    _delay: 10
                });

                const AbortController = env.getAbortController();
                const abortController = new AbortController();
                const task = client.patient.request({ url: "Observation", signal: abortController.signal });
                abortController.abort();
                await expect(task).to.reject(
                    Error, "The user aborted a request."
                );
            });
        });

        describe("works if the resource is Patient and _id param is supported", () => {
            crossPlatformTest(async (env) => {
                const client = new Client(env, {
                    serverUrl: mockUrl,
                    tokenResponse: {
                        patient: "2e27c71e-30c8-4ceb-8c1c-5641e066c0a4"
                    }
                });

                // Mock the conformance statement
                mockServer.mock({
                    headers: { "content-type": "application/json" },
                    status: 200,
                    body: {
                        rest: [{
                            resource: [{
                                type: "Patient",
                                searchParam: [
                                    { name: "_id" }
                                ]
                            }]
                        }]
                    }
                });

                mockServer.mock({
                    headers: { "content-type": "application/json" },
                    status: 200,
                    body: {
                        resourceType: "Patient",
                        id: "whatever"
                    }
                });

                await client.patient.request("Patient");
            });
        });

        describe("rejects if the resource is Patient and _id param is not supported", () => {
            crossPlatformTest(async (env) => {
                const client = new Client(env, {
                    serverUrl: mockUrl,
                    tokenResponse: {
                        patient: "2e27c71e-30c8-4ceb-8c1c-5641e066c0a4"
                    }
                });

                // Mock the conformance statement
                mockServer.mock({
                    headers: { "content-type": "application/json" },
                    status: 200,
                    body: {
                        rest: [{
                            resource: [{
                                type: "Patient",
                                searchParam: []
                            }]
                        }]
                    }
                });

                mockServer.mock({
                    headers: { "content-type": "application/json" },
                    status: 200,
                    body: {
                        resourceType: "Patient",
                        id: "whatever"
                    }
                });

                await expect(client.patient.request("Patient")).to.reject();
            });
        });

        describe("works as expected with includeResponse: true", () => {
            crossPlatformTest(async (env) => {
                const client = new Client(env, {
                    serverUrl: mockUrl,
                    tokenResponse: {
                        patient: "2e27c71e-30c8-4ceb-8c1c-5641e066c0a4"
                    }
                });

                // Mock the conformance statement
                mockServer.mock({
                    headers: { "content-type": "application/json" },
                    status: 200,
                    body: {
                        rest: [{
                            resource: [{
                                type: "Observation",
                                searchParam: [
                                    { name: "patient" }
                                ]
                            }]
                        }]
                    }
                });

                mockServer.mock({
                    headers: { "content-type": "application/json" },
                    status: 200,
                    body: {
                        resourceType: "Observation",
                        id: "whatever"
                    }
                });

                // const result = await client.patient.request<fhirclient.CombinedFetchResult<fhirclient.FHIR.Resource>>({
                //     url: "Observation",
                //     includeResponse: true
                // });
                const result = await client.patient.request<Record<string, any>>({
                    url: "Observation",
                    includeResponse: true
                });
                expect(result.body).to.include({ resourceType: "Observation", id: "whatever" });
                expect(result.response.status).to.equal(200);
            });
        });
    });

    describe("encounter.read", () => {
        describe("rejects with no encounter", () => {
            crossPlatformTest(async (env) => {
                const client = new Client(env, {
                    serverUrl: mockUrl,
                    tokenResponse: {}
                });
                await expect(client.encounter.read()).to.reject(
                    Error, "Encounter is not available"
                );

                mockServer.mock({
                    headers: { "content-type": "application/json" },
                    status: 200,
                    body: { resourceType: "Encounter", id: "encounter-id" }
                });
                (client.state.tokenResponse as any).encounter = "whatever";
                const encounter = await client.encounter.read();
                expect(encounter).to.equal({ resourceType: "Encounter", id: "encounter-id" });
            });
        });

        describe("can be aborted", () => {
            crossPlatformTest(async (env) => {
                const client = new Client(env, {
                    serverUrl: mockUrl,
                    tokenResponse: {
                        encounter: "x"
                    }
                });

                mockServer.mock({
                    headers: { "content-type": "application/json" },
                    status: 200,
                    body: { id: "encounter-id" },
                    _delay: 10
                });

                const AbortController = env.getAbortController();
                const abortController = new AbortController();
                const task = client.encounter.read({ signal: abortController.signal });
                abortController.abort();
                await expect(task).to.reject(
                    Error, "The user aborted a request."
                );
            });
        });

        describe("works with includeResponse: true", () => {
            crossPlatformTest(async (env) => {
                const client = new Client(env, {
                    serverUrl: mockUrl,
                    tokenResponse: {
                        encounter: "x"
                    }
                });

                mockServer.mock({
                    headers: { "content-type": "application/json" },
                    status: 200,
                    body: { resourceType: "Encounter", id: "encounter-id" }
                });

                const result = await client.encounter.read({ includeResponse: true });
                expect(result.body).to.equal({ resourceType: "Encounter", id: "encounter-id" });
                expect(result.response.status).to.equal(200);
            });
        });
    });

    describe("user.read", () => {
        describe("rejects with no user", () => {
            crossPlatformTest(async (env) => {
                const client = new Client(env, {
                    serverUrl: mockUrl,
                    tokenResponse: {}
                });
                await expect(client.user.read()).to.reject(
                    Error, "User is not available"
                );
                mockServer.mock({
                    headers: { "content-type": "application/json" },
                    status: 200,
                    body: { resourceType: "Patient", id: "user-id" }
                });
                (client.state.tokenResponse as any).id_token =
                "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9." +
                "eyJwcm9maWxlIjoiUHJhY3RpdGlvbmVyL3NtYXJ0LVByYWN0aXRpb2" +
                "5lci03MjA4MDQxNiIsImZoaXJVc2VyIjoiUHJhY3RpdGlvbmVyL3Nt" +
                "YXJ0LVByYWN0aXRpb25lci03MjA4MDQxNiIsInN1YiI6IjM2YTEwYm" +
                "M0ZDJhNzM1OGI0YWZkYWFhZjlhZjMyYmFjY2FjYmFhYmQxMDkxYmQ0" +
                "YTgwMjg0MmFkNWNhZGQxNzgiLCJpc3MiOiJodHRwOi8vbGF1bmNoLn" +
                "NtYXJ0aGVhbHRoaXQub3JnIiwiaWF0IjoxNTU5MzkyMjk1LCJleHAi" +
                "OjE1NTkzOTU4OTV9.niEs55G4AFJZtU_b9Y1Y6DQmXurUZZkh3WCud" +
                "ZgwvYasxVU8x3gJiX3jqONttqPhkh7418EFssCKnnaBlUDwsbhp7xd" +
                "WN4o1L1NvH4bp_R_zJ25F1s6jLmNm2Qp9LqU133PEdcRIqQPgBMyZB" +
                "WUTyxQ9ihKY1RAjlztAULQ3wKea-rfe0BXJZeUJBsQPzYCnbKY1dON" +
                "_NRd8N9pTImqf41MpIbEe7YEOHuirIb6HBpurhAHjTLDv1IuHpEAOx" +
                "pmtxVVHiVf-FYXzTFmn4cGe2PsNJfBl8R_zow2n6qaSANdvSxJDE4D" +
                "UgIJ6H18wiSJJHp6Plf_bapccAwxbx-zZCw";
                const user = await client.user.read();
                expect(user).to.equal({ resourceType: "Patient", id: "user-id" });
            });
        });

        describe("can be aborted", () => {
            crossPlatformTest(async (env) => {
                const client = new Client(env, {
                    serverUrl: mockUrl,
                    tokenResponse: {
                        id_token: "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9." +
                        "eyJwcm9maWxlIjoiUHJhY3RpdGlvbmVyL3NtYXJ0LVByYWN0aXRpb2" +
                        "5lci03MjA4MDQxNiIsImZoaXJVc2VyIjoiUHJhY3RpdGlvbmVyL3Nt" +
                        "YXJ0LVByYWN0aXRpb25lci03MjA4MDQxNiIsInN1YiI6IjM2YTEwYm" +
                        "M0ZDJhNzM1OGI0YWZkYWFhZjlhZjMyYmFjY2FjYmFhYmQxMDkxYmQ0" +
                        "YTgwMjg0MmFkNWNhZGQxNzgiLCJpc3MiOiJodHRwOi8vbGF1bmNoLn" +
                        "NtYXJ0aGVhbHRoaXQub3JnIiwiaWF0IjoxNTU5MzkyMjk1LCJleHAi" +
                        "OjE1NTkzOTU4OTV9.niEs55G4AFJZtU_b9Y1Y6DQmXurUZZkh3WCud" +
                        "ZgwvYasxVU8x3gJiX3jqONttqPhkh7418EFssCKnnaBlUDwsbhp7xd" +
                        "WN4o1L1NvH4bp_R_zJ25F1s6jLmNm2Qp9LqU133PEdcRIqQPgBMyZB" +
                        "WUTyxQ9ihKY1RAjlztAULQ3wKea-rfe0BXJZeUJBsQPzYCnbKY1dON" +
                        "_NRd8N9pTImqf41MpIbEe7YEOHuirIb6HBpurhAHjTLDv1IuHpEAOx" +
                        "pmtxVVHiVf-FYXzTFmn4cGe2PsNJfBl8R_zow2n6qaSANdvSxJDE4D" +
                        "UgIJ6H18wiSJJHp6Plf_bapccAwxbx-zZCw"
                    }
                });
                mockServer.mock({
                    headers: { "content-type": "application/json" },
                    status: 200,
                    body: { id: "user-id" },
                    _delay: 10
                });

                const AbortController = env.getAbortController();
                const abortController = new AbortController();
                const task = client.user.read({ signal: abortController.signal });
                abortController.abort();
                await expect(task).to.reject(
                    Error, "The user aborted a request."
                );
            });
        });

        it ("works with includeResponse: true", () => {
            crossPlatformTest(async (env) => {
                const mock = {
                    headers: { "content-type": "application/json" },
                    status: 200,
                    body: { resourceType: "Patient", id: "user-id" },
                    _delay: 10
                };

                const client = new Client(env, {
                    serverUrl: mockUrl,
                    tokenResponse: {
                        patient: "whatever"
                    }
                });

                mockServer.mock(mock);
                const result = await client.user.read({ includeResponse: true });
                expect(result.body).to.equal({ resourceType: "Patient", id: "user-id" });
                expect(result.response.status).to.equal(200);
            });
        });
    });

    describe("fhir.js api", { timeout: 5000 }, () => {
        it ("does not work without fhir.js", async () => {
            const env    = new BrowserEnv();
            // @ts-ignore
            const client = new Client(env, {
                serverUrl: "https://r2.smarthealthit.org",
                tokenResponse: {
                    patient: "bd7cb541-732b-4e39-ab49-ae507aa49326"
                }
            });
            expect(client.api).to.be.undefined();
            expect(client.patient.api).to.be.undefined();
        });

        it ("works in the browser", async () => {
            const env    = new BrowserEnvFhir();
            // @ts-ignore
            const client = new Client(env, {
                serverUrl: "https://r2.smarthealthit.org",
                tokenResponse: {
                    patient: "bd7cb541-732b-4e39-ab49-ae507aa49326"
                }
            });
            await (client.api as any).read({ type: "Patient", id: "bd7cb541-732b-4e39-ab49-ae507aa49326" });
            await (client.api as any).search({ type: "Patient" });
            await (client.patient.api as any).read({ type: "Patient", id: "bd7cb541-732b-4e39-ab49-ae507aa49326" });
        });
    });

    describe("client.connect", () => {
        it ("works as expected", () => {
            const env    = new BrowserEnv();
            // @ts-ignore
            const client = new Client(env, {
                serverUrl: "https://r2.smarthealthit.org",
                tokenResponse: {
                    access_token: "my access token"
                }
            });

            let _passedOptions: any = {};

            const fhirJs = (options: any) => {
                _passedOptions = options;
                return options;
            };

            client.connect(fhirJs);

            expect(_passedOptions.baseUrl).to.equal("https://r2.smarthealthit.org");
            expect(_passedOptions.auth).to.equal({ token: "my access token" });

            (client.state.tokenResponse as any).access_token = null;
            client.connect(fhirJs);
            expect(_passedOptions.auth).to.be.undefined();
            expect(client.patient.api).to.be.undefined();

            client.state.username = "my username";
            client.connect(fhirJs);
            expect(_passedOptions.auth).to.be.undefined();

            client.state.password = "my password";
            client.connect(fhirJs);
            expect(_passedOptions.auth).to.equal({
                user: "my username",
                pass: "my password"
            });

            client.state.password = "my password";
            client.connect(fhirJs);
            expect(_passedOptions.auth).to.equal({
                user: "my username",
                pass: "my password"
            });

            (client.state.tokenResponse as any).patient = "bd7cb541-732b-4e39-ab49-ae507aa49326";
            client.connect(fhirJs);
            expect(client.patient.api).to.not.be.undefined();
        });
    });

    describe("client.request", () => {

        // Argument validation -------------------------------------------------
        it("rejects if no url is provided", async () => {
            // @ts-ignore
            const client = new Client({}, "http://localhost");
            // @ts-ignore
            await expect(client.request()).to.reject();
        });

        // Token expiration and refresh ----------------------------------------

        describe ("throws if 401 and no accessToken", () => {
            crossPlatformTest(async (env) => {
                const client = new Client(env, mockUrl);
                mockServer.mock({ status: 401 });
                await expect(client.request("/")).to.reject();
            });
        });

        describe ("throws if 401 and no fhirOptions.useRefreshToken", () => {
            crossPlatformTest(async (env) => {
                const client = new Client(env, {
                    serverUrl: mockUrl,
                    tokenResponse: {
                        access_token: "whatever"
                    }
                });
                mockServer.mock({ status: 401 });
                await expect(client.request("/", {
                    useRefreshToken: false
                })).to.reject();
            });
        });

        describe ("throws if 401 and no refresh_token", () => {
            crossPlatformTest(async (env) => {
                const client = new Client(env, {
                    serverUrl: mockUrl,
                    tokenResponse: {
                        access_token: "whatever"
                    }
                });
                mockServer.mock({ status: 401 });
                await expect(client.request("/")).to.reject();
            });
        });

        describe ("throws if 401 after refresh", () => {
            crossPlatformTest(async (env) => {
                const client = new Client(env, {
                    serverUrl: mockUrl,
                    tokenResponse: {
                        access_token: "whatever",
                        refresh_token: "whatever"
                    }
                });
                mockServer.mock({ status: 401 });
                await expect(client.request("/")).to.reject();
            });
        });

        describe ("throws if 403 after refresh", () => {
            crossPlatformTest(async (env) => {
                const client = new Client(env, mockUrl);
                mockServer.mock({ status: 403 });
                await expect(client.request("/")).to.reject();
            });
        });

        describe("auto-refresh if access token is expired", () => {
            crossPlatformTest(async (env) => {
                const exp = Math.round(Date.now() / 1000) - 20;
                const access_token = `x.${env.btoa(`{"exp":${exp}}`)}.x`;
                const client = new Client(env, {
                    serverUrl: mockUrl,
                    tokenUri: mockUrl,
                    expiresAt: exp,
                    tokenResponse: {
                        access_token,
                        refresh_token: "whatever",
                        scope: "offline_access"
                    }
                });
                mockServer.mock({
                    status: 200,
                    headers: {
                        "content-type": "application/json"
                    },
                    body: {
                        access_token: "x"
                    }
                });
                mockServer.mock({
                    handler(req, res) {
                        res.json(req.headers.authorization)
                    }
                });
                const result = await client.request("/");
                expect(client.state.tokenResponse?.access_token).to.equal("x");
                expect(result).to.equal("Bearer x");
            });
        });

        describe("auto-refresh if access token is about to expire", () => {
            crossPlatformTest(async (env) => {
                const exp = Math.round(Date.now() / 1000) - 5;
                const access_token = `x.${env.btoa(`{"exp":${exp}}`)}.x`;
                const client = new Client(env, {
                    serverUrl: mockUrl,
                    tokenUri: mockUrl,
                    expiresAt: exp,
                    tokenResponse: {
                        access_token,
                        refresh_token: "whatever",
                        scope: "offline_access"
                    }
                });
                mockServer.mock({
                    status: 200,
                    headers: {
                        "content-type": "application/json"
                    },
                    body: {
                        access_token: "x"
                    }
                });
                mockServer.mock({ status: 200, body: "OK" });
                const result = await client.request("/");
                expect(result).to.equal("OK");
                expect(client.state.tokenResponse?.access_token).to.equal("x");
            });
        });

        describe("no auto-refresh if the access token is not expired", () => {
            crossPlatformTest(async (env) => {
                const exp = Math.round(Date.now() / 1000) + 50;
                const access_token = `x.${env.btoa(`{"exp":${exp}}`)}.x`;
                const client = new Client(env, {
                    serverUrl: mockUrl,
                    tokenUri: mockUrl,
                    expiresAt: exp,
                    tokenResponse: {
                        access_token,
                        refresh_token: "whatever",
                        scope: "offline_access"
                    }
                });
                mockServer.mock({ status: 200, body: "OK" });
                const result = await client.request("/");
                expect(result).to.equal("OK");
            });
        });

        // ---------------------------------------------------------------------

        describe ("can fetch single resource", () => {
            const mock = {
                headers: { "content-type": "application/json" },
                status: 200,
                body: { id: "patient-id" }
            };
            const tests: Record<string, any> = {
                "works in the browser": new BrowserEnv(),
                "works on the server" : new ServerEnv()
            };

            for (const name in tests) {
                it (name, async () => {
                    const client = new Client(tests[name], { serverUrl: mockUrl });
                    mockServer.mock(mock);
                    const result = await client.request("/Patient/patient-id");
                    expect(result).to.include({ id: "patient-id" });
                });
            }
        });

        describe ("works with URL", () => {
            const mock = {
                headers: { "content-type": "application/json" },
                status: 200,
                body: { id: "patient-id" }
            };
            const tests: Record<string, any> = {
                "works in the browser": new BrowserEnv(),
                "works on the server" : new ServerEnv()
            };

            for (const name in tests) {
                it (name, async () => {
                    const client = new Client(tests[name], { serverUrl: mockUrl });
                    mockServer.mock(mock);
                    const result = await client.request(new URL("/Patient/patient-id", mockUrl));
                    expect(result).to.include({ id: "patient-id" });
                });
            }
        });

        describe ("resolve with falsy value if one is received", () => {
            const mock = {
                headers: { "content-type": "application/json" },
                status: 200,
                body: ""
            };
            const tests: Record<string, any> = {
                "works in the browser": new BrowserEnv(),
                "works on the server" : new ServerEnv()
            };

            for (const name in tests) {
                it (name, async () => {
                    const client = new Client(tests[name], { serverUrl: mockUrl });
                    mockServer.mock(mock);
                    const result = await client.request("Patient");
                    expect(result).to.equal("");
                });
            }
        });

        describe ("ignores pageLimit if the result is not a bundle", () => {
            const mock = {
                headers: { "content-type": "application/json" },
                status: 200,
                body: { resourceType: "Patient" }
            };
            const tests: Record<string, any> = {
                "works in the browser": new BrowserEnv(),
                "works on the server" : new ServerEnv()
            };

            for (const name in tests) {
                it (name, async () => {
                    const client = new Client(tests[name], { serverUrl: mockUrl });
                    mockServer.mock(mock);
                    const result = await client.request("/Patient", { pageLimit: 1 });
                    expect(result).to.include({ resourceType: "Patient" });
                });
            }
        });

        describe("can fetch a bundle", () => {
            const mock = {
                headers: { "content-type": "application/json" },
                status: 200,
                body: { resourceType: "Bundle", entry: [] }
            };
            const tests: Record<string, any> = {
                "works in the browser": new BrowserEnv(),
                "works on the server" : new ServerEnv()
            };

            for (const name in tests) {
                it (name, async () => {
                    const client = new Client(tests[name], { serverUrl: mockUrl });
                    mockServer.mock(mock);
                    const result = await client.request("/Patient");
                    expect(result).to.include({ resourceType: "Bundle" });
                    expect(result).to.include("entry");
                });
            }
        });

        describe ("does not return an array if pageLimit is 1", () => {
            crossPlatformTest(async (env) => {
                const client = new Client(env, { serverUrl: mockUrl });
                mockServer.mock({
                    headers: { "content-type": "application/json" },
                    status: 200,
                    body: {
                        resourceType: "Bundle",
                        entry: []
                    }
                });
                const result = await client.request("/Patient", { pageLimit: 1 });
                expect(result).to.include({ resourceType: "Bundle" });
                expect(result).to.include("entry");
            });
        });

        describe ("can fetch multiple pages", () => {
            crossPlatformTest(async (env) => {
                const client = new Client(env, { serverUrl: mockUrl });
                // Page 1
                mockServer.mock({
                    headers: { "content-type": "application/json" },
                    status: 200,
                    body: {
                        resourceType: "Bundle",
                        entry: [],
                        link: [{ relation: "next", url: "whatever" }]
                    }
                });

                // Page 2
                mockServer.mock({
                    headers: { "content-type": "application/json" },
                    status: 200,
                    body: {
                        resourceType: "Bundle",
                        entry: []
                    }
                });
                const result = await client.request("/Patient", { pageLimit: 2 });
                expect(result).to.be.an.array();
                expect(result.length).to.equal(2);
                expect(result[0]).to.include({ resourceType: "Bundle" });
                expect(result[0]).to.include("entry");
                expect(result[1]).to.include({ resourceType: "Bundle" });
                expect(result[1]).to.include("entry");
            });
        });

        describe ("returns an array if pageLimit is different than 1, even if there is only one page", () => {
            crossPlatformTest(async (env) => {
                const client = new Client(env, { serverUrl: mockUrl });
                mockServer.mock({
                    headers: { "content-type": "application/json" },
                    status: 200,
                    body: {
                        resourceType: "Bundle",
                        entry: []
                    }
                });
                const result = await client.request("/Practitioner", { pageLimit: 0 });
                expect(result).to.be.an.array();
                expect(result.length).to.equal(1);
                expect(result[0]).to.include({ resourceType: "Bundle" });
                expect(result[0]).to.include("entry");
            });
        });

        describe ("can fetch all pages", () => {
            crossPlatformTest(async (env) => {
                const client = new Client(env, { serverUrl: mockUrl });

                // Page 1
                mockServer.mock({
                    headers: { "content-type": "application/json" },
                    status: 200,
                    body: {
                        resourceType: "Bundle",
                        entry: [],
                        link: [{ relation: "next", url: "whatever" }]
                    }
                });

                // Page 2
                mockServer.mock({
                    headers: { "content-type": "application/json" },
                    status: 200,
                    body: {
                        resourceType: "Bundle",
                        entry: []
                    }
                });

                const result = await client.request("/Patient", { pageLimit: 0 });
                expect(result).to.be.an.array();
                expect(result.length).to.equal(2);
            });
        });

        describe ("onPage callback", () => {
            crossPlatformTest(async (env) => {
                const client = new Client(env, { serverUrl: mockUrl });
                const pages: any[] = [];
                const onPage = (page: any) => pages.push(page);

                // Page 1
                mockServer.mock({
                    headers: { "content-type": "application/json" },
                    status: 200,
                    body: {
                        resourceType: "Bundle",
                        pageId: 1,
                        entry: [],
                        link: [{ relation: "next", url: "whatever" }]
                    }
                });

                // Page 2
                mockServer.mock({
                    headers: { "content-type": "application/json" },
                    status: 200,
                    body: {
                        resourceType: "Bundle",
                        pageId: 2,
                        entry: []
                    }
                });

                const result = await client.request("/Patient", {
                    pageLimit: 0,
                    onPage
                });
                expect(result, "Resolves with an object").to.equal(null);
                expect(pages.length, "onPage should be called twice").to.equal(2);
                expect(pages[0]).to.include({ pageId: 1 });
                expect(pages[1]).to.include({ pageId: 2 });
            });
        });

        describe ("stops fetching pages if onPage throws", () => {
            crossPlatformTest(async (env) => {
                const client = new Client(env, { serverUrl: mockUrl });
                const pages: any[] = [];
                const onPage = (page: any) => {
                    pages.push(page);
                    throw new Error("test error");
                };

                // Page 1
                mockServer.mock({
                    headers: { "content-type": "application/json" },
                    status: 200,
                    body: {
                        resourceType: "Bundle",
                        pageId: 1,
                        entry: [],
                        link: [{ relation: "next", url: "whatever" }]
                    }
                });

                await client.request("/Patient", {
                    pageLimit: 0,
                    onPage
                }).catch(error => {
                    expect(error).to.be.error(Error, "test error");
                });
                expect(pages.length, "onPage should be called once").to.equal(1);
                expect(pages[0]).to.include({ pageId: 1 });
            });
        });

        describe ("stops fetching pages if onPage rejects", () => {
            crossPlatformTest(async (env) => {
                const client = new Client(env, { serverUrl: mockUrl });
                const pages: any[] = [];
                const onPage = (page: any) => {
                    pages.push(page);
                    return Promise.reject(new Error("test error"));
                };

                // Page 1
                mockServer.mock({
                    headers: { "content-type": "application/json" },
                    status: 200,
                    body: {
                        resourceType: "Bundle",
                        pageId: 1,
                        entry: [],
                        link: [{ relation: "next", url: "whatever" }]
                    }
                });

                await client.request("/Patient", {
                    pageLimit: 0,
                    onPage
                }).catch(error => {
                    expect(error).to.be.error(Error, "test error");
                });
                expect(pages.length, "onPage should be called once").to.equal(1);
                expect(pages[0]).to.include({ pageId: 1 });
            });
        });

        describe ("awaits for the onPage callback", () => {
            crossPlatformTest(async (env) => {
                const client = new Client(env, { serverUrl: mockUrl });
                const pages: any[] = [];
                const onPage = (page: any) => {
                    return new Promise(resolve => {
                        setTimeout(() => {
                            pages.push(page);
                            resolve(void 0);
                        }, 100);
                    });
                };

                // Page 1
                mockServer.mock({
                    headers: { "content-type": "application/json" },
                    status: 200,
                    body: {
                        resourceType: "Bundle",
                        pageId: 1,
                        entry: [],
                        link: [{ relation: "next", url: "whatever" }]
                    }
                });

                // Page 2
                mockServer.mock({
                    headers: { "content-type": "application/json" },
                    status: 200,
                    body: {
                        resourceType: "Bundle",
                        pageId: 2,
                        entry: []
                    }
                });

                const result = await client.request("/Patient", {
                    pageLimit: 0,
                    onPage
                });
                expect(result, "Resolves with an object").to.equal(null);
                expect(pages.length, "onPage should be called twice").to.equal(2);
                expect(pages[0]).to.include({ pageId: 1 });
                expect(pages[1]).to.include({ pageId: 2 });
            });
        });

        describe ("can resolve refs on single resource", () => {
            crossPlatformTest(async (env) => {
                const client = new Client(env, { serverUrl: mockUrl });

                // Main page
                mockServer.mock({
                    headers: { "content-type": "application/json" },
                    status: 200,
                    body: {
                        resourceType: "Patient",
                        id: "id",
                        ref1: {
                            reference: "whatever"
                        }
                    }
                });

                // Referenced page
                mockServer.mock({
                    headers: { "content-type": "application/json" },
                    status: 200,
                    body: {
                        resourceType: "Ref",
                        id: "Ref-id"
                    }
                });

                const result = await client.request(
                    "/Patient/id",
                    { resolveReferences: "ref1" }
                );
                expect(result).to.equal({
                    resourceType: "Patient",
                    id: "id",
                    ref1: {
                        resourceType: "Ref",
                        id: "Ref-id"
                    }
                });
            });
        });

        describe ("does not fetch the same ref twice", () => {
            crossPlatformTest(async (env) => {
                const client = new Client(env, {
                    serverUrl: mockUrl
                });

                mockServer.mock({
                    headers: { "content-type": "application/json" },
                    status: 200,
                    body: {
                        patient: { reference: "ref/1" },
                        subject: { reference: "ref/1" }
                    }
                });

                mockServer.mock({
                    headers: { "content-type": "application/json" },
                    status: 200,
                    body: { resourceType: "Patient" }
                });

                const result = await client.request("Observation/id", {
                    resolveReferences: [ "patient", "subject" ]
                });

                expect(result).to.equal({
                    patient: { resourceType: "Patient" },
                    subject: { resourceType: "Patient" }
                });
            });
        });

        describe ("mixed example #88", () => {
            const json = {
                contained: [
                    {
                        subject: {
                            reference: "Patient/1"
                        }
                    },
                    {
                        beneficiary: {
                            reference: "Patient/1"
                        }
                    }
                ],
                patient: {
                    reference: "Patient/1"
                }
            };

            crossPlatformTest(async (env) => {
                const client = new Client(env, {
                    serverUrl: mockUrl
                });

                mockServer.mock({
                    headers: { "content-type": "application/json" },
                    status: 200,
                    body: json
                });

                mockServer.mock({
                    headers: { "content-type": "application/json" },
                    status: 200,
                    body: { resourceType: "Patient", id: 1 }
                });

                const result = await client.request(
                    "ExplanationOfBenefit/17",
                    {
                        resolveReferences: [
                            "patient",
                            "contained.0.subject",
                            "contained.1.beneficiary"
                        ],
                        graph: true
                    }
                );

                expect(result.patient).to.equal({ resourceType: "Patient", id: 1 });
                expect(result.contained[0].subject).to.equal({ resourceType: "Patient", id: 1 });
                expect(result.contained[1].beneficiary).to.equal({ resourceType: "Patient", id: 1 });
            });
        });

        describe ("mixed example #73", () => {
            const json = {
                identifier: [
                    {
                        assigner: {
                            reference: "Organization/2"
                        }
                    },
                    {
                        assigner: {
                            reference: "Organization/3"
                        }
                    }
                ]
            };

            crossPlatformTest(async (env) => {
                const client = new Client(env, {
                    serverUrl: mockUrl
                });

                mockServer.mock({
                    headers: { "content-type": "application/json" },
                    status: 200,
                    body: json
                });

                mockServer.mock({
                    headers: { "content-type": "application/json" },
                    status: 200,
                    body: { resourceType: "Organization", id: 2 }
                });

                mockServer.mock({
                    headers: { "content-type": "application/json" },
                    status: 200,
                    body: { resourceType: "Organization", id: 3 }
                });

                const result = await client.request(
                    "ExplanationOfBenefit/17",
                    {
                        resolveReferences: "identifier..assigner",
                        graph: true
                    }
                );

                expect(result.identifier).to.equal([
                    {
                        assigner: {
                            resourceType: "Organization",
                            id: 2
                        }
                    },
                    {
                        assigner: {
                            resourceType: "Organization",
                            id: 3
                        }
                    }
                ]);
            });
        });

        describe ("ignores missing ref", () => {
            crossPlatformTest(async (env) => {
                const client = new Client(env, {
                    serverUrl: mockUrl
                });

                mockServer.mock({
                    headers: { "content-type": "application/json" },
                    status: 200,
                    body: {
                        patient: { reference: "ref/1" }
                    }
                });

                mockServer.mock({
                    status: 404,
                    body: "Not Found"
                });

                const result = await client.request("Observation/id", {
                    resolveReferences: "patient"
                });

                expect(result).to.equal({
                    patient: { reference: "ref/1" }
                });
            });
        });

        describe ("ignores missing ref from source", () => {
            crossPlatformTest(async (env) => {
                const client = new Client(env, {
                    serverUrl: mockUrl
                });

                mockServer.mock({
                    headers: { "content-type": "application/json" },
                    status: 200,
                    body: {
                        patient: { reference: null }
                    }
                });

                const result = await client.request("Observation/id", {
                    resolveReferences: "patient"
                });

                expect(result).to.equal({
                    patient: { reference: null }
                });
            });
        });

        describe ("warns about duplicate ref paths", () => {
            crossPlatformTest(async (env) => {
                const client = new Client(env, {
                    serverUrl: mockUrl
                });

                mockServer.mock({
                    headers: { "content-type": "application/json" },
                    status: 200,
                    body: {
                        patient: { reference: "ref/1" }
                    }
                });

                mockServer.mock({
                    headers: { "content-type": "application/json" },
                    status: 200,
                    body: { resourceType: "Patient" }
                });

                const result = await client.request("Observation/id", {
                    resolveReferences: ["patient", "patient"]
                });

                expect(result).to.equal({
                    patient: { resourceType: "Patient" }
                });

                expect(clientDebug._calls.find((o: any) => o[0] === "Duplicated reference path \"%s\"")).to.exist();
            });
        });

        describe ("can resolve nested refs", () => {
            crossPlatformTest(async (env) => {
                const client = new Client(env, { serverUrl: mockUrl });

                // This is how the user had defined the list, If it works properly,
                // the request function should resolve them in different order:
                // 1. subject and encounter (in parallel)
                // 2. encounter.serviceProvider
                const refsToResolve = [
                    "subject",
                    "encounter.serviceProvider",
                    "encounter"
                ];

                function createHandler(json) {
                    return function handler(req, res, next) {
                        try {
                            expect(req.headers['x-custom-header'], "Custom headers not sent on ref requests").to.equal('someCustomKey');
                            res.json(json)
                        } catch (ex) {
                            next(ex)
                        }
                    }
                }

                // 1. Observation
                // this request should be sent first!
                mockServer.mock({
                    handler: createHandler({
                        resourceType: "Observation",
                        encounter: { reference: "encounter/1" },
                        subject: { reference: "subject/1" }
                    })
                });

                // 2. Patient (Observation.subject)
                // this request should be sent second (even though it might
                // reply after #3)
                mockServer.mock({
                    handler: createHandler({ resourceType: "Patient" })
                });

                // 3. Encounter
                // this request should be sent third (even though it might
                // reply before #2)
                mockServer.mock({
                    handler: createHandler({
                        resourceType: "Encounter",
                        serviceProvider: { reference: "Organization/1" }
                    })
                });

                // 4. Organization (Encounter.serviceProvider)
                // this request should be sent AFTER we have handled the response
                // from #3!
                mockServer.mock({
                    handler: createHandler({ resourceType: "Organization" })
                });

                const result = await client.request({
                    url: "Observation/id",
                    headers: {
                        'X-Custom-Header': 'someCustomKey',
                    }
                }, {
                    resolveReferences: refsToResolve
                });

                expect(result).to.equal({
                    resourceType: "Observation",
                    encounter: {
                        resourceType: "Encounter",
                        serviceProvider: {
                            resourceType: "Organization"
                        }
                    },
                    subject: {
                        resourceType: "Patient"
                    }
                });
            });
        });

        describe ("can resolve refs on single resource with `graph: false`", () => {
            crossPlatformTest(async (env) => {
                const client = new Client(env, { serverUrl: mockUrl });

                // Main page
                mockServer.mock({
                    headers: { "content-type": "application/json" },
                    status: 200,
                    body: {
                        resourceType: "Patient",
                        id: "id",
                        ref1: {
                            reference: "whatever"
                        }
                    }
                });

                // Referenced page
                mockServer.mock({
                    headers: { "content-type": "application/json" },
                    status: 200,
                    body: {
                        resourceType: "Ref",
                        id: "Ref-id"
                    }
                });

                const result = await client.request(
                    "/Patient/id",
                    {
                        resolveReferences: "ref1",
                        graph: false
                    }
                );
                expect(result).to.equal({
                    data: {
                        resourceType: "Patient",
                        id: "id",
                        ref1: {
                            reference: "whatever"
                        }
                    },
                    references: {
                        whatever: {
                            resourceType: "Ref",
                            id: "Ref-id"
                        }
                    }
                });
            });
        });

        describe ("can resolve refs on pages", () => {
            crossPlatformTest(async (env) => {
                const client = new Client(env, { serverUrl: mockUrl });

                // Main page 1
                mockServer.mock({
                    headers: { "content-type": "application/json" },
                    status: 200,
                    body: {
                        resourceType: "Bundle",
                        pageId: 1,
                        link: [{ relation: "next", url: "whatever" }],
                        entry: [{
                            resource: {
                                resourceType: "Patient",
                                id: "pt-1",
                                ref1: {
                                    reference: "whatever-1"
                                }
                            }
                        }]
                    }
                });

                // Referenced page 1
                mockServer.mock({
                    headers: { "content-type": "application/json" },
                    status: 200,
                    body: {
                        resourceType: "Ref",
                        id: "Ref-whatever-1"
                    }
                });

                // Main page 2
                mockServer.mock({
                    headers: { "content-type": "application/json" },
                    status: 200,
                    body: {
                        resourceType: "Bundle",
                        pageId: 2,
                        entry: [{
                            resource: {
                                resourceType: "Patient",
                                id: "pt-2",
                                ref1: {
                                    reference: "whatever-2"
                                }
                            }
                        }]
                    }
                });

                // Referenced page 2
                mockServer.mock({
                    headers: { "content-type": "application/json" },
                    status: 200,
                    body: {
                        resourceType: "Ref",
                        id: "Ref-whatever-2"
                    }
                });

                const result = await client.request(
                    "/Patient",
                    {
                        resolveReferences: "ref1",
                        pageLimit: 0
                    }
                );
                expect(result).to.equal([
                    {
                        resourceType: "Bundle",
                        pageId: 1,
                        link: [{ relation: "next", url: "whatever" }],
                        entry: [{
                            resource: {
                                resourceType: "Patient",
                                id: "pt-1",
                                ref1: {
                                    resourceType: "Ref",
                                    id: "Ref-whatever-1"
                                }
                            }
                        }]
                    },
                    {
                        resourceType: "Bundle",
                        pageId: 2,
                        entry: [{
                            resource: {
                                resourceType: "Patient",
                                id: "pt-2",
                                ref1: {
                                    resourceType: "Ref",
                                    id: "Ref-whatever-2"
                                }
                            }
                        }]
                    }
                ]);
            });
        });

        describe ("can resolve refs on pages with `graph: false`", () => {
            crossPlatformTest(async (env) => {
                const client = new Client(env, { serverUrl: mockUrl });

                // Main page 1
                mockServer.mock({
                    headers: { "content-type": "application/json" },
                    status: 200,
                    body: {
                        resourceType: "Bundle",
                        pageId: 1,
                        link: [{ relation: "next", url: "whatever" }],
                        entry: [{
                            resource: {
                                resourceType: "Patient",
                                id: "pt-1",
                                ref1: {
                                    reference: "Ref-whatever-1"
                                }
                            }
                        }]
                    }
                });

                // Referenced page 1
                mockServer.mock({
                    headers: { "content-type": "application/json" },
                    status: 200,
                    body: {
                        resourceType: "Ref",
                        id: "Ref-whatever-1"
                    }
                });

                // Main page 2
                mockServer.mock({
                    headers: { "content-type": "application/json" },
                    status: 200,
                    body: {
                        resourceType: "Bundle",
                        pageId: 2,
                        entry: [{
                            resource: {
                                resourceType: "Patient",
                                id: "pt-2",
                                ref1: {
                                    reference: "Ref-whatever-2"
                                }
                            }
                        }]
                    }
                });

                // Referenced page 2
                mockServer.mock({
                    headers: { "content-type": "application/json" },
                    status: 200,
                    body: {
                        resourceType: "Ref",
                        id: "Ref-whatever-2"
                    }
                });

                const result = await client.request(
                    "/Patient",
                    {
                        resolveReferences: "ref1",
                        pageLimit: 0,
                        graph: false
                    }
                );
                expect(result).to.equal({
                    data: [
                        {
                            resourceType: "Bundle",
                            pageId: 1,
                            link: [{ relation: "next", url: "whatever" }],
                            entry: [{
                                resource: {
                                    resourceType: "Patient",
                                    id: "pt-1",
                                    ref1: {
                                        reference: "Ref-whatever-1"
                                    }
                                }
                            }]
                        },
                        {
                            resourceType: "Bundle",
                            pageId: 2,
                            entry: [{
                                resource: {
                                    resourceType: "Patient",
                                    id: "pt-2",
                                    ref1: {
                                        reference: "Ref-whatever-2"
                                    }
                                }
                            }]
                        }
                    ],
                    references: {
                        "Ref-whatever-1": {
                            resourceType: "Ref",
                            id: "Ref-whatever-1"
                        },
                        "Ref-whatever-2": {
                            resourceType: "Ref",
                            id: "Ref-whatever-2"
                        }
                    }
                });
            });
        });

        describe ("can resolve refs on pages with `onPage`", () => {
            crossPlatformTest(async (env) => {
                const client = new Client(env, { serverUrl: mockUrl });

                // Main page 1
                mockServer.mock({
                    headers: { "content-type": "application/json" },
                    status: 200,
                    body: {
                        resourceType: "Bundle",
                        pageId: 1,
                        link: [{ relation: "next", url: "whatever" }],
                        entry: [{
                            resource: {
                                resourceType: "Patient",
                                id: "pt-1",
                                ref1: {
                                    reference: "whatever-1"
                                }
                            }
                        }]
                    }
                });

                // Referenced page 1
                mockServer.mock({
                    headers: { "content-type": "application/json" },
                    status: 200,
                    body: {
                        resourceType: "Ref",
                        id: "Ref-whatever-1"
                    }
                });

                // Main page 2
                mockServer.mock({
                    headers: { "content-type": "application/json" },
                    status: 200,
                    body: {
                        resourceType: "Bundle",
                        pageId: 2,
                        entry: [{
                            resource: {
                                resourceType: "Patient",
                                id: "pt-2",
                                ref1: {
                                    reference: "whatever-2"
                                }
                            }
                        }]
                    }
                });

                // Referenced page 2
                mockServer.mock({
                    headers: { "content-type": "application/json" },
                    status: 200,
                    body: {
                        resourceType: "Ref",
                        id: "Ref-whatever-2"
                    }
                });

                const pages: any[] = [];
                const result = await client.request(
                    "/Patient",
                    {
                        resolveReferences: "ref1",
                        pageLimit: 0,
                        onPage(data) {
                            pages.push(data);
                        }
                    }
                );
                expect(result).to.equal(null);
                expect(pages).to.equal([
                    {
                        resourceType: "Bundle",
                        pageId: 1,
                        link: [{ relation: "next", url: "whatever" }],
                        entry: [{
                            resource: {
                                resourceType: "Patient",
                                id: "pt-1",
                                ref1: {
                                    resourceType: "Ref",
                                    id: "Ref-whatever-1"
                                }
                            }
                        }]
                    },
                    {
                        resourceType: "Bundle",
                        pageId: 2,
                        entry: [{
                            resource: {
                                resourceType: "Patient",
                                id: "pt-2",
                                ref1: {
                                    resourceType: "Ref",
                                    id: "Ref-whatever-2"
                                }
                            }
                        }]
                    }
                ]);
            });
        });

        describe ("can resolve refs on pages with `onPage` and `graph: false`", () => {
            crossPlatformTest(async (env) => {
                const client = new Client(env, { serverUrl: mockUrl });

                // Main page 1
                mockServer.mock({
                    headers: { "content-type": "application/json" },
                    status: 200,
                    body: {
                        resourceType: "Bundle",
                        pageId: 1,
                        link: [{ relation: "next", url: "whatever" }],
                        entry: [{
                            resource: {
                                resourceType: "Patient",
                                id: "pt-1",
                                ref1: {
                                    reference: "whatever-1"
                                }
                            }
                        }]
                    }
                });

                // Referenced page 1
                mockServer.mock({
                    headers: { "content-type": "application/json" },
                    status: 200,
                    body: {
                        resourceType: "Ref",
                        id: "Ref-whatever-1"
                    }
                });

                // Main page 2
                mockServer.mock({
                    headers: { "content-type": "application/json" },
                    status: 200,
                    body: {
                        resourceType: "Bundle",
                        pageId: 2,
                        entry: [{
                            resource: {
                                resourceType: "Patient",
                                id: "pt-2",
                                ref1: {
                                    reference: "whatever-2"
                                }
                            }
                        }]
                    }
                });

                // Referenced page 2
                mockServer.mock({
                    headers: { "content-type": "application/json" },
                    status: 200,
                    body: {
                        resourceType: "Ref",
                        id: "Ref-whatever-2"
                    }
                });

                const pages: any[] = [];
                const refs: any[] = [];
                const result = await client.request(
                    "/Patient",
                    {
                        resolveReferences: "ref1",
                        pageLimit: 0,
                        graph: false,
                        onPage(data, references) {
                            pages.push(data);
                            refs.push(references);
                        }
                    }
                );
                expect(result).to.equal(null);
                expect(pages).to.equal([
                    {
                        resourceType: "Bundle",
                        pageId: 1,
                        link: [{ relation: "next", url: "whatever" }],
                        entry: [{
                            resource: {
                                resourceType: "Patient",
                                id: "pt-1",
                                ref1: {
                                    reference: "whatever-1"
                                }
                            }
                        }]
                    },
                    {
                        resourceType: "Bundle",
                        pageId: 2,
                        entry: [{
                            resource: {
                                resourceType: "Patient",
                                id: "pt-2",
                                ref1: {
                                    reference: "whatever-2"
                                }
                            }
                        }]
                    }
                ]);
                expect(refs).to.equal([
                    {
                        "whatever-1": {
                            resourceType: "Ref",
                            id: "Ref-whatever-1"
                        }
                    },
                    {
                        "whatever-1": {
                            resourceType: "Ref",
                            id: "Ref-whatever-1"
                        },
                        "whatever-2": {
                            resourceType: "Ref",
                            id: "Ref-whatever-2"
                        }
                    }
                ]);
            });
        });

        describe ("resolve all refs if it points to an array", () => {
            crossPlatformTest(async (env) => {
                const client = new Client(env, mockUrl);

                // Main page
                mockServer.mock({
                    headers: { "content-type": "application/json" },
                    status: 200,
                    body: {
                        resourceType: "Patient",
                        id: "id",
                        ref1: [
                            { reference: "whatever-1" },
                            { reference: "whatever-2" }
                        ]
                    }
                });

                // Referenced page 1
                mockServer.mock({
                    headers: { "content-type": "application/json" },
                    status: 200,
                    body: { resourceType: "Ref", id: "Ref-id-1" }
                });

                // Referenced page 2
                mockServer.mock({
                    headers: { "content-type": "application/json" },
                    status: 200,
                    body: { resourceType: "Ref", id: "Ref-id-2" }
                });

                const result = await client.request(
                    "/Patient/id",
                    { resolveReferences: "ref1" }
                );
                expect(result).to.equal({
                    resourceType: "Patient",
                    id: "id",
                    ref1: [
                        { resourceType: "Ref", id: "Ref-id-1" },
                        { resourceType: "Ref", id: "Ref-id-2" }
                    ]
                });
            });
        });


        // flat ----------------------------------------------------------------

        describe("flat", () => {
            crossPlatformTest(async (env) => {
                const client = new Client(env, mockUrl);

                // Main page
                mockServer.mock({
                    headers: { "content-type": "application/json" },
                    status: 200,
                    body: {
                        resourceType: "Bundle",
                        entry: [
                            { resource: "resource-1" },
                            { resource: "resource-2" }
                        ]
                    }
                });

                const result = await client.request("/Patient/id", { flat: true });

                expect(result).to.equal([
                    "resource-1",
                    "resource-2"
                ]);
            });
        });

        describe("flat on multiple pages", () => {
            crossPlatformTest(async (env) => {
                const client = new Client(env, mockUrl);

                // Page 1
                mockServer.mock({
                    headers: { "content-type": "application/json" },
                    status: 200,
                    body: {
                        resourceType: "Bundle",
                        link: [{ relation: "next", url: "whatever" }],
                        entry: [
                            { resource: "resource-1" },
                            { resource: "resource-2" }
                        ]
                    }
                });

                // Page 2
                mockServer.mock({
                    headers: { "content-type": "application/json" },
                    status: 200,
                    body: {
                        resourceType: "Bundle",
                        entry: [
                            { resource: "resource-3" }
                        ]
                    }
                });

                const result = await client.request("/Patient/id", {
                    flat: true,
                    pageLimit: 0
                });

                expect(result).to.equal([
                    "resource-1",
                    "resource-2",
                    "resource-3"
                ]);
            });
        });

        describe("flat on multiple pages with references and onPage", () => {
            crossPlatformTest(async (env) => {
                const client = new Client(env, mockUrl);

                const results: any[] = [];

                // Page 1
                mockServer.mock({
                    headers: { "content-type": "application/json" },
                    status: 200,
                    body: {
                        resourceType: "Bundle",
                        link: [{ relation: "next", url: "whatever" }],
                        entry: [
                            { resource: "resource-1" },
                            {
                                resource: {
                                    subject: {
                                        reference: "Patient/1"
                                    }
                                }
                            }
                        ]
                    }
                });

                // Referenced page 1
                mockServer.mock({
                    headers: { "content-type": "application/json" },
                    status: 200,
                    body: {
                        resourceType: "Patient",
                        id: "Patient-1"
                    }
                });

                // Page 2
                mockServer.mock({
                    headers: { "content-type": "application/json" },
                    status: 200,
                    body: {
                        resourceType: "Bundle",
                        link: [{ relation: "next", url: "whatever" }],
                        entry: [
                            { resource: "resource-3" }
                        ]
                    }
                });

                // Page 3
                mockServer.mock({
                    headers: { "content-type": "application/json" },
                    status: 200,
                    body: {
                        resourceType: "Bundle",
                        entry: [
                            { resource: "resource-4" },
                            { resource: "resource-5" }
                        ]
                    }
                });

                const result = await client.request("/Patient/id", {
                    flat: true,
                    pageLimit: 0,
                    resolveReferences: "subject",
                    onPage: data => results.push(data)
                });

                expect(result).to.equal(null);
                expect(results).to.equal([
                    [
                        "resource-1",
                        {
                            subject: {
                                resourceType: "Patient",
                                id: "Patient-1"
                            }
                        }
                    ],
                    ["resource-3"],
                    ["resource-4", "resource-5"]
                ]);
            });

        });

        describe("flat on multiple pages with references and onPage and graph=false", () => {
            crossPlatformTest(async (env) => {
                const client = new Client(env, mockUrl);

                const results: any[] = [];
                const references = {};

                // Page 1
                mockServer.mock({
                    headers: { "content-type": "application/json" },
                    status: 200,
                    body: {
                        resourceType: "Bundle",
                        link: [{ relation: "next", url: "whatever" }],
                        entry: [
                            { resource: "resource-1" },
                            {
                                resource: {
                                    subject: {
                                        reference: "Patient/1"
                                    }
                                }
                            }
                        ]
                    }
                });

                // Referenced page 1
                mockServer.mock({
                    headers: { "content-type": "application/json" },
                    status: 200,
                    body: {
                        resourceType: "Patient",
                        id: "Patient-1"
                    }
                });

                // Page 2
                mockServer.mock({
                    headers: { "content-type": "application/json" },
                    status: 200,
                    body: {
                        resourceType: "Bundle",
                        link: [{ relation: "next", url: "whatever" }],
                        entry: [
                            { resource: "resource-3" }
                        ]
                    }
                });

                // Page 3
                mockServer.mock({
                    headers: { "content-type": "application/json" },
                    status: 200,
                    body: {
                        resourceType: "Bundle",
                        entry: [
                            { resource: "resource-4" },
                            { resource: "resource-5" }
                        ]
                    }
                });

                const result = await client.request("/Patient/id", {
                    flat: true,
                    pageLimit: 0,
                    resolveReferences: "subject",
                    graph: false,
                    onPage: (data, refs) => {
                        results.push(data);
                        Object.assign(references, refs);
                    }
                });

                expect(result).to.equal(null);
                expect(results).to.equal([
                    [ "resource-1", {
                        subject: {
                            reference: "Patient/1"
                        }
                    } ],
                    [ "resource-3"               ],
                    [ "resource-4", "resource-5" ]
                ]);
                expect(references).to.equal({
                    "Patient/1": {
                        resourceType: "Patient",
                        id: "Patient-1"
                    }
                });
            });

        });

        describe("flat on multiple pages with references", () => {
            crossPlatformTest(async (env) => {
                const client = new Client(env, mockUrl);

                // Page 1
                mockServer.mock({
                    headers: { "content-type": "application/json" },
                    status: 200,
                    body: {
                        resourceType: "Bundle",
                        link: [{ relation: "next", url: "whatever" }],
                        entry: [
                            { resource: "resource-1" },
                            {
                                resource: {
                                    subject: {
                                        reference: "Patient/1"
                                    }
                                }
                            }
                        ]
                    }
                });

                // Referenced page 1
                mockServer.mock({
                    headers: { "content-type": "application/json" },
                    status: 200,
                    body: {
                        resourceType: "Patient",
                        id: "Patient-1"
                    }
                });

                // Page 2
                mockServer.mock({
                    headers: { "content-type": "application/json" },
                    status: 200,
                    body: {
                        resourceType: "Bundle",
                        link: [{ relation: "next", url: "whatever" }],
                        entry: [
                            { resource: "resource-3" }
                        ]
                    }
                });

                // Page 3 (this should be ignored because pageLimit is 2)
                mockServer.mock({
                    headers: { "content-type": "application/json" },
                    status: 200,
                    body: {
                        resourceType: "Bundle",
                        entry: [
                            { resource: "resource-4" },
                            { resource: "resource-5" }
                        ]
                    }
                });

                const result = await client.request("/Patient/id", {
                    flat: true,
                    pageLimit: 2,
                    resolveReferences: "subject"
                });

                expect(result).to.equal([
                    "resource-1",
                    {
                        subject: {
                            resourceType: "Patient",
                            id: "Patient-1"
                        }
                    },
                    "resource-3"
                ]);
            });
        });

        describe("flat on multiple pages with references and graph=false", () => {
            crossPlatformTest(async (env) => {
                const client = new Client(env, mockUrl);

                // Page 1
                mockServer.mock({
                    headers: { "content-type": "application/json" },
                    status: 200,
                    body: {
                        resourceType: "Bundle",
                        link: [{ relation: "next", url: "whatever" }],
                        entry: [
                            { resource: "resource-1" },
                            {
                                resource: {
                                    subject: {
                                        reference: "Patient/1"
                                    }
                                }
                            }
                        ]
                    }
                });

                // Referenced page 1
                mockServer.mock({
                    headers: { "content-type": "application/json" },
                    status: 200,
                    body: {
                        resourceType: "Patient",
                        id: "Patient-1"
                    }
                });

                // Page 2
                mockServer.mock({
                    headers: { "content-type": "application/json" },
                    status: 200,
                    body: {
                        resourceType: "Bundle",
                        link: [{ relation: "next", url: "whatever" }],
                        entry: [
                            { resource: "resource-3" }
                        ]
                    }
                });

                // Page 3 (this should be ignored because pageLimit is 2)
                mockServer.mock({
                    headers: { "content-type": "application/json" },
                    status: 200,
                    body: {
                        resourceType: "Bundle",
                        entry: [
                            { resource: "resource-4" },
                            { resource: "resource-5" }
                        ]
                    }
                });

                const result = await client.request("/Patient/id", {
                    flat: true,
                    pageLimit: 2,
                    graph: false,
                    resolveReferences: "subject"
                });

                expect(result).to.equal({
                    data: [
                        "resource-1",
                        {
                            subject: {
                                reference: "Patient/1"
                            }
                        },
                        "resource-3"
                    ],
                    references: {
                        "Patient/1": {
                            resourceType: "Patient",
                            id: "Patient-1"
                        }
                    }
                });
            });
        });

        describe("can fetch text", () => {
            crossPlatformTest(async (env) => {
                const client = new Client(env, mockUrl);

                mockServer.mock({
                    headers: { "content-type": "text/plain" },
                    status: 200,
                    body: "This is a text"
                });

                const result = await client.request("/");

                expect(result).to.equal("This is a text");
            });
        });

        describe("can fetch binary", () => {
            crossPlatformTest(async (env) => {
                const client = new Client(env, mockUrl);

                const file   = FS.readFileSync(__dirname + "/mocks/json.png");
                const goal64 = file.toString("base64");

                mockServer.mock({
                    headers: { "content-type": "image/png" },
                    status: 200,
                    file: "json.png"
                });

                const result = await client.request("/");
                // const text   = await result.text();
                const buffer = await result.arrayBuffer();
                // const base64 = Buffer.from(buffer).toString("base64");
                expect(Buffer.from(buffer).toString("base64")).to.equal(goal64);

                // const client = new Client(env, "https://r2.smarthealthit.org");
                // const result = await client.request("Binary/smart-Binary-1-document");

                // // Using blob() ------------------------------------------------

                // // Using arrayBuffer() -----------------------------------------

                // const buffer = await result.arrayBuffer();
                // // console.log(URL.createObjectURL(blob));
                // // const text   = await result.text();
                // var base64Image = Buffer.from(buffer).toString('base64');
                // console.log(base64Image);
                // expect(result).to.equal("This is a text");
            });
        });

        // Aborting ------------------------------------------------------------
        describe ("can be aborted", () => {
            const mock = {
                headers: { "content-type": "application/json" },
                status: 200,
                body: { id: "patient-id" },
                _delay: 10
            };
            const tests: Record<string, any> = {
                "works in the browser": new BrowserEnv(),
                "works on the server" : new ServerEnv()
            };

            for (const name in tests) {
                it (name, async () => {
                    const client = new Client(tests[name], { serverUrl: mockUrl });
                    mockServer.mock(mock);
                    const AbortController = tests[name].getAbortController();
                    const abortController = new AbortController();
                    const task = client.request({ url: "/Patient/patient-id", signal: abortController.signal });
                    abortController.abort();
                    await expect(task).to.reject(
                        Error, "The user aborted a request."
                    );
                });
            }
        });

        describe ("aborts nested page requests", () => {
            crossPlatformTest(async (env) => {
                const client = new Client(env, { serverUrl: mockUrl });
                const pages: any[] = [];
                const AbortController = env.getAbortController();
                const abortController = new AbortController();
                const onPage = (page: any) => {
                    if (pages.push(page) == 2) {

                        // On the second call to onPage the main request is complete
                        // (the one that got page 1) and the first child request
                        // (the one that got page 2) is complete. At this point,
                        // even though the main request itself is complete, aborting
                        // it should propagate to any nested requests and cancel them.
                        // We should not get to page 3!
                        abortController.abort();
                    }
                };

                // Page 1
                mockServer.mock({
                    headers: { "content-type": "application/json" },
                    status: 200,
                    body: {
                        resourceType: "Bundle",
                        pageId: 1,
                        entry: [],
                        link: [{ relation: "next", url: "whatever" }]
                    },
                    _delay: 10
                });

                // Page 2
                mockServer.mock({
                    headers: { "content-type": "application/json" },
                    status: 200,
                    body: {
                        resourceType: "Bundle",
                        pageId: 2,
                        entry: [],
                        link: [{ relation: "next", url: "whatever" }]
                    },
                    _delay: 10
                });

                // Page 3
                mockServer.mock({
                    headers: { "content-type": "application/json" },
                    status: 200,
                    body: {
                        resourceType: "Bundle",
                        pageId: 3,
                        entry: []
                    },
                    _delay: 10
                });

                const task = client.request({
                    url: "/Patient",
                    signal: abortController.signal
                 }, {
                    pageLimit: 0,
                    onPage
                });

                await expect(task).to.reject(Error, "The user aborted a request.");
                expect(pages.length, "onPage should be called twice").to.equal(2);
                expect(pages[0]).to.include({ pageId: 1 });
                expect(pages[1]).to.include({ pageId: 2 });
            });
        });

        describe ("aborts nested reference requests", () => {
            crossPlatformTest(async (env) => {
                const client = new Client(env, { serverUrl: mockUrl });
                const AbortController = env.getAbortController();
                const abortController = new AbortController();

                // Page 1
                mockServer.mock({
                    headers: { "content-type": "application/json" },
                    status: 200,
                    body: {
                        patient: { reference: "ref/1" },
                        subject: { reference: "ref/2" }
                    },
                    _delay: 10
                });

                // Page 2
                mockServer.mock({
                    headers: { "content-type": "application/json" },
                    status: 200,
                    body: { resourceType: "Patient" },
                    _delay: 10
                });

                // Page 3
                mockServer.mock({
                    headers: { "content-type": "application/json" },
                    status: 200,
                    body: { resourceType: "Patient" },
                    _delay: 1000
                });

                const task = client.request({
                    url: "/Patient",
                    signal: abortController.signal
                 }, {
                    resolveReferences: [
                        "patient",
                        "subject"
                    ]
                });

                // After 30ms the main resource should be fetched and the patient
                // reference should be resolved. The subject reference should
                // still be pending because it takes 1000ms to reply. If we abort
                // at that point, we should get our client.request promise
                // rejected with abort error.
                setTimeout(() => abortController.abort(), 30);

                await expect(task).to.reject(Error, "The user aborted a request.");
            });
        });

        // includeResponse -----------------------------------------------------
        describe ("can fetch single resource with includeResponse: true", () => {
            const mock = {
                headers: { "content-type": "application/json" },
                status: 200,
                body: { id: "patient-id" }
            };
            const tests: Record<string, any> = {
                "works in the browser": new BrowserEnv(),
                "works on the server" : new ServerEnv()
            };

            for (const name in tests) {
                it (name, async () => {
                    const client = new Client(tests[name], { serverUrl: mockUrl });
                    mockServer.mock(mock);
                    const result = await client.request<fhirclient.CombinedFetchResult>({
                        url: "/Patient/patient-id",
                        includeResponse: true
                    });
                    // @ts-ignore
                    expect(result.body).to.include({ id: "patient-id" });
                    expect(result.response.status).to.equal(200);
                });
            }
        });

        describe ("can fetch all pages with includeResponse: true", () => {
            crossPlatformTest(async (env) => {
                const client = new Client(env, { serverUrl: mockUrl });

                // Page 1
                mockServer.mock({
                    headers: { "content-type": "application/json" },
                    status: 200,
                    body: {
                        resourceType: "Bundle",
                        entry: [],
                        link: [{ relation: "next", url: "whatever" }]
                    }
                });

                // Page 2
                mockServer.mock({
                    headers: { "content-type": "application/json" },
                    status: 200,
                    body: {
                        resourceType: "Bundle",
                        entry: []
                    }
                });

                const result = await client.request<fhirclient.CombinedFetchResult>({
                    url: "/Patient",
                    includeResponse: true
                }, { pageLimit: 0 });
                expect(result.body).to.be.an.array();
                expect(result.body?.length).to.equal(2);
                expect(result.response.status).to.equal(200);
            });
        });

        describe ("can resolve refs on pages with includeResponse: true", () => {
            crossPlatformTest(async (env) => {
                const client = new Client(env, { serverUrl: mockUrl });

                // Main page 1
                mockServer.mock({
                    headers: {
                        "content-type": "application/json",
                        "x-custom": "test"
                    },
                    status: 200,
                    body: {
                        resourceType: "Bundle",
                        pageId: 1,
                        link: [{ relation: "next", url: "whatever" }],
                        entry: [{
                            resource: {
                                resourceType: "Patient",
                                id: "pt-1",
                                ref1: {
                                    reference: "whatever-1"
                                }
                            }
                        }]
                    }
                });

                // Referenced page 1
                mockServer.mock({
                    headers: { "content-type": "application/json" },
                    status: 200,
                    body: {
                        resourceType: "Ref",
                        id: "Ref-whatever-1"
                    }
                });

                // Main page 2
                mockServer.mock({
                    headers: { "content-type": "application/json" },
                    status: 200,
                    body: {
                        resourceType: "Bundle",
                        pageId: 2,
                        entry: [{
                            resource: {
                                resourceType: "Patient",
                                id: "pt-2",
                                ref1: {
                                    reference: "whatever-2"
                                }
                            }
                        }]
                    }
                });

                // Referenced page 2
                mockServer.mock({
                    headers: { "content-type": "application/json" },
                    status: 200,
                    body: {
                        resourceType: "Ref",
                        id: "Ref-whatever-2"
                    }
                });

                const result = await client.request<fhirclient.CombinedFetchResult>(
                    {
                        url: "/Patient",
                        includeResponse: true
                    },
                    {
                        resolveReferences: "ref1",
                        pageLimit: 0
                    }
                );

                expect(result.response.status).to.equal(200);
                expect(result.response.headers.get("x-custom")).to.equal("test");
                expect(result.body as any).to.equal([
                    {
                        resourceType: "Bundle",
                        pageId: 1,
                        link: [{ relation: "next", url: "whatever" }],
                        entry: [{
                            resource: {
                                resourceType: "Patient",
                                id: "pt-1",
                                ref1: {
                                    resourceType: "Ref",
                                    id: "Ref-whatever-1"
                                }
                            }
                        }]
                    },
                    {
                        resourceType: "Bundle",
                        pageId: 2,
                        entry: [{
                            resource: {
                                resourceType: "Patient",
                                id: "pt-2",
                                ref1: {
                                    resourceType: "Ref",
                                    id: "Ref-whatever-2"
                                }
                            }
                        }]
                    }
                ]);
            });
        });

    });

    describe ("client.user", () => {
        const idToken = "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJwcm9maWxlIjoiUHJhY3RpdGlvbmVyL3NtYXJ0LVByYWN0aXRpb25lci03MjA4MDQxNiIsImZoaXJVc2VyIjoiUHJhY3RpdGlvbmVyL3NtYXJ0LVByYWN0aXRpb25lci03MjA4MDQxNiIsInN1YiI6IjM2YTEwYmM0ZDJhNzM1OGI0YWZkYWFhZjlhZjMyYmFjY2FjYmFhYmQxMDkxYmQ0YTgwMjg0MmFkNWNhZGQxNzgiLCJpc3MiOiJodHRwOi8vbGF1bmNoLnNtYXJ0aGVhbHRoaXQub3JnIiwiaWF0IjoxNTU5MzkyMjk1LCJleHAiOjE1NTkzOTU4OTV9.niEs55G4AFJZtU_b9Y1Y6DQmXurUZZkh3WCudZgwvYasxVU8x3gJiX3jqONttqPhkh7418EFssCKnnaBlUDwsbhp7xdWN4o1L1NvH4bp_R_zJ25F1s6jLmNm2Qp9LqU133PEdcRIqQPgBMyZBWUTyxQ9ihKY1RAjlztAULQ3wKea-rfe0BXJZeUJBsQPzYCnbKY1dON_NRd8N9pTImqf41MpIbEe7YEOHuirIb6HBpurhAHjTLDv1IuHpEAOxpmtxVVHiVf-FYXzTFmn4cGe2PsNJfBl8R_zow2n6qaSANdvSxJDE4DUgIJ6H18wiSJJHp6Plf_bapccAwxbx-zZCw";
        crossPlatformTest(async (env) => {
            const client1 = new Client(env, {
                serverUrl: mockUrl,
                tokenResponse: {}
            });
            expect(client1.user.id).to.equal(null);
            expect(client1.getUserId()).to.equal(null);
            expect(client1.getFhirUser()).to.equal(null);
            expect(client1.getUserType()).to.equal(null);

            const client2 = new Client(env, {
                serverUrl: mockUrl,
                tokenResponse: { id_token: idToken }
            });
            expect(client2.user.id).to.equal("smart-Practitioner-72080416");
            expect(client2.getUserId()).to.equal("smart-Practitioner-72080416");
            expect(client2.getFhirUser()).to.equal("Practitioner/smart-Practitioner-72080416");
            expect(client2.getUserType()).to.equal("Practitioner");
        });
    });

    describe ("client.getAuthorizationHeader", () => {
        crossPlatformTest(async (env) => {
            const client = new Client(env, {
                serverUrl: mockUrl,
                tokenResponse: {}
            });

            expect(client.getAuthorizationHeader()).to.equal(null);

            client.state.username = "my-username";
            expect(client.getAuthorizationHeader()).to.equal(null);

            client.state.password = "my-password";
            expect(client.getAuthorizationHeader()).to.equal(
                "Basic " + Buffer.from("my-username:my-password", "ascii").toString("base64")
            );

            (client.state.tokenResponse as any).access_token = "my-token";
            expect(client.getAuthorizationHeader()).to.equal("Bearer my-token");
        });
    });

    describe ("client.refresh", () => {
        
        it ("Validates state and throws if needed", async () => {

            expect(
                // @ts-ignore
                () => (new Client({}, {
                    serverUrl: "http://whatever",
                    tokenUri : "whatever",
                    tokenResponse: {
                        access_token: "whatever",
                        scope       : "test"
                    }
                }).refresh()),
                "throws with no refreshToken"
            ).to.throw(Error, /\brefresh_token\b/);

            expect(
                // @ts-ignore
                () => new Client({}, {
                    serverUrl: "http://whatever",
                    tokenResponse: {
                        access_token : "whatever",
                        refresh_token: "whatever",
                        scope        : "test"
                    }
                }).refresh(),
                "throws with no tokenUri"
            ).to.throw(Error, /\btokenUri\b/);

            expect(
                // @ts-ignore
                () => new Client({}, {
                    serverUrl: "http://whatever",
                    tokenUri : "whatever",
                    tokenResponse: {
                        access_token : "whatever",
                        refresh_token: "whatever",
                        scope        : "test"
                    }
                }).refresh(),
                "throws with no offline_access or online_access scope"
            ).to.throw(Error, /\boffline_access\b/);

            expect(
                // @ts-ignore
                () => new Client({}, {
                    serverUrl: "http://whatever",
                    tokenUri : "whatever",
                    tokenResponse: {
                        access_token : "whatever",
                        refresh_token: "whatever"
                    }
                }).refresh(),
                "throws with no scope"
            ).to.throw(Error, /\boffline_access\b/);

            await expect(
                (() => {
                    const env = new BrowserEnv();
                    mockServer.mock({
                        headers: { "content-type": "application/json" },
                        status: 200,
                        body: { result: false }
                    });
                    // @ts-ignore
                    const client = new Client(env, {
                        serverUrl: "http://whatever",
                        tokenUri : mockUrl,
                        tokenResponse: {
                            access_token : "whatever",
                            refresh_token: "whatever",
                            scope        : "offline_access"
                        }
                    });
                    return client.refresh();
                })(),
                "throws if the token endpoint does not return access_token"
            ).to.reject(Error, "No access token received");

            await expect(
                (() => {
                    const env = new BrowserEnv();
                    mockServer.mock({
                        headers: { "content-type": "application/json" },
                        status: 200,
                        body: { result: false }
                    });
                    // @ts-ignore
                    const client = new Client(env, {
                        serverUrl: "http://whatever",
                        tokenUri : mockUrl,
                        tokenResponse: {
                            access_token : "whatever",
                            refresh_token: "whatever",
                            scope        : "online_access"
                        }
                    });
                    return client.refresh();
                })(),
                "throws if the token endpoint does not return access_token for online_access"
            ).to.reject(Error, "No access token received");
        });

        it ("Includes auth header for confidential clients", async () => {
            const self    = new Window();
            (global as any).sessionStorage = self.sessionStorage;
            const env     = new BrowserEnv();
            const storage = env.getStorage();
            const key     = "my-key";
            const state = {
                serverUrl: mockUrl,
                tokenUri: mockUrl,
                clientSecret: "MyClientSecret",
                clientId: "my_web_app",
                tokenResponse: {
                    "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJjb250ZXh0Ijp7Im5lZWRfcGF0aWVudF9iYW5uZXIiOnRydWUsInNtYXJ0X3N0eWxlX3VybCI6Imh0dHBzOi8vbGF1bmNoLnNtYXJ0aGVhbHRoaXQub3JnL3NtYXJ0LXN0eWxlLmpzb24iLCJwYXRpZW50IjoiZWIzMjcxZTEtYWUxYi00NjQ0LTkzMzItNDFlMzJjODI5NDg2IiwiZW5jb3VudGVyIjoiMzFiMThhYTAtMGRhNy00NDYwLTk2MzMtMDRhZjQxNDY2ZDc2In0sImNsaWVudF9pZCI6Im15X3dlYl9hcHAiLCJzY29wZSI6Im9wZW5pZCBmaGlyVXNlciBvZmZsaW5lX2FjY2VzcyB1c2VyLyouKiBwYXRpZW50LyouKiBsYXVuY2gvZW5jb3VudGVyIGxhdW5jaC9wYXRpZW50IHByb2ZpbGUiLCJ1c2VyIjoiUHJhY3RpdGlvbmVyL3NtYXJ0LVByYWN0aXRpb25lci03MTQ4MjcxMyIsImlhdCI6MTU1ODcxMDk2NCwiZXhwIjoxNTkwMjQ2OTY1fQ.f5yNY-yKKDe0a59_eFgp6s0rHSgPLXgmAWDPz_hEUgs",
                    "expires_in"   : 1,
                    "access_token" : "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJuZWVkX3BhdGllbnRfYmFubmVyIjp0cnVlLCJzbWFydF9zdHlsZV91cmwiOiJodHRwczovL2xhdW5jaC5zbWFydGhlYWx0aGl0Lm9yZy9zbWFydC1zdHlsZS5qc29uIiwicGF0aWVudCI6ImViMzI3MWUxLWFlMWItNDY0NC05MzMyLTQxZTMyYzgyOTQ4NiIsImVuY291bnRlciI6IjMxYjE4YWEwLTBkYTctNDQ2MC05NjMzLTA0YWY0MTQ2NmQ3NiIsInJlZnJlc2hfdG9rZW4iOiJleUowZVhBaU9pSktWMVFpTENKaGJHY2lPaUpJVXpJMU5pSjkuZXlKamIyNTBaWGgwSWpwN0ltNWxaV1JmY0dGMGFXVnVkRjlpWVc1dVpYSWlPblJ5ZFdVc0luTnRZWEowWDNOMGVXeGxYM1Z5YkNJNkltaDBkSEJ6T2k4dmJHRjFibU5vTG5OdFlYSjBhR1ZoYkhSb2FYUXViM0puTDNOdFlYSjBMWE4wZVd4bExtcHpiMjRpTENKd1lYUnBaVzUwSWpvaVpXSXpNamN4WlRFdFlXVXhZaTAwTmpRMExUa3pNekl0TkRGbE16SmpPREk1TkRnMklpd2laVzVqYjNWdWRHVnlJam9pTXpGaU1UaGhZVEF0TUdSaE55MDBORFl3TFRrMk16TXRNRFJoWmpReE5EWTJaRGMySW4wc0ltTnNhV1Z1ZEY5cFpDSTZJbTE1WDNkbFlsOWhjSEFpTENKelkyOXdaU0k2SW05d1pXNXBaQ0JtYUdseVZYTmxjaUJ2Wm1ac2FXNWxYMkZqWTJWemN5QjFjMlZ5THlvdUtpQndZWFJwWlc1MEx5b3VLaUJzWVhWdVkyZ3ZaVzVqYjNWdWRHVnlJR3hoZFc1amFDOXdZWFJwWlc1MElIQnliMlpwYkdVaUxDSjFjMlZ5SWpvaVVISmhZM1JwZEdsdmJtVnlMM050WVhKMExWQnlZV04wYVhScGIyNWxjaTAzTVRRNE1qY3hNeUlzSW1saGRDSTZNVFUxT0RjeE1EazJOQ3dpWlhod0lqb3hOVGt3TWpRMk9UWTFmUS5mNXlOWS15S0tEZTBhNTlfZUZncDZzMHJIU2dQTFhnbUFXRFB6X2hFVWdzIiwidG9rZW5fdHlwZSI6ImJlYXJlciIsInNjb3BlIjoib3BlbmlkIGZoaXJVc2VyIG9mZmxpbmVfYWNjZXNzIHVzZXIvKi4qIHBhdGllbnQvKi4qIGxhdW5jaC9lbmNvdW50ZXIgbGF1bmNoL3BhdGllbnQgcHJvZmlsZSIsImNsaWVudF9pZCI6Im15X3dlYl9hcHAiLCJleHBpcmVzX2luIjozNjAwLCJpZF90b2tlbiI6ImV5SjBlWEFpT2lKS1YxUWlMQ0poYkdjaU9pSlNVekkxTmlKOS5leUp3Y205bWFXeGxJam9pVUhKaFkzUnBkR2x2Ym1WeUwzTnRZWEowTFZCeVlXTjBhWFJwYjI1bGNpMDNNVFE0TWpjeE15SXNJbVpvYVhKVmMyVnlJam9pVUhKaFkzUnBkR2x2Ym1WeUwzTnRZWEowTFZCeVlXTjBhWFJwYjI1bGNpMDNNVFE0TWpjeE15SXNJbUYxWkNJNkltMTVYM2RsWWw5aGNIQWlMQ0p6ZFdJaU9pSmtZakl6WkRCa1pUSTFOamM0WlRZM01EazVZbU0wTXpRek1qTmtZekJrT1RZMU1UTmlOVFV5TW1RMFlqYzBNV05pWVRNNVpqZGpPVEprTUdNME5tRmxJaXdpYVhOeklqb2lhSFIwY0RvdkwyeGhkVzVqYUM1emJXRnlkR2hsWVd4MGFHbDBMbTl5WnlJc0ltbGhkQ0k2TVRVMU9EY3hNRGsyTlN3aVpYaHdJam94TlRVNE56RTBOVFkxZlEuVzFPSmdWUl9wOTdERlRaSmZhLWI2aWRmNktZMTUtbE81WU9nNHROZkJ5X3dmUHVpbHBUeXZBcDFHRnc2TFpGMnFhNkFWYV9oc1BoXy1GSTJKNkN6MGlqZkFZbVMzdFZwYVZYSGhpMjZsUG5QdUIxVjFUbWJ6YVhDWmJYaC1pdjl4WTNZQXFFRTgyMjFjTXRzQ3FXUFM3aUlMYmJJZmozQnlNMm04aXNRVS1pOGhxLUdTV2ZKNTlwczRGMFZNdlI0QmlPUUdIOXQ5TFQ0TDVxNnNsLU9ONUpJVnJFdnEweFJQVjBrTnpqbUVheklLbV9MMllZM09yMVYwbE02Q0otM2U4RkdkUElIRlRpMjJXcVc1dXhBU2NDVm1hZ1h4S2l5T2xNRWc3dGtjUHA3MjJtS3B0MTMwT3lzaUZyOGpZaElYZkdhX3VGN0tDVFhTZ0RrZEV1WlNRIiwiaWF0IjoxNTU4NzEwOTY1LCJleHAiOjE1NTg3MTQ1NjV9.FDRzViWLg4rMfDzr7Bx01pt5t7CapzcJwQcaFTVcu3E",
                    "scope": "offline_access"
                },
                key
            };

            storage.set(KEY, key);
            storage.set(key, state);

            const client = new Client(env, state);

            mockServer.mock({
                handler(req, res) {
                    res.json({
                        headers: req.headers,
                        expires_in: 3600,
                        access_token: "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJuZWVkX3BhdGllbnRfYmFubmVyIjp0cnVlLCJzbWFydF9zdHlsZV91cmwiOiJodHRwczovL2xhdW5jaC5zbWFydGhlYWx0aGl0Lm9yZy9zbWFydC1zdHlsZS5qc29uIiwicGF0aWVudCI6ImViMzI3MWUxLWFlMWItNDY0NC05MzMyLTQxZTMyYzgyOTQ4NiIsImVuY291bnRlciI6IjMxYjE4YWEwLTBkYTctNDQ2MC05NjMzLTA0YWY0MTQ2NmQ3NiIsInJlZnJlc2hfdG9rZW4iOiJleUowZVhBaU9pSktWMVFpTENKaGJHY2lPaUpJVXpJMU5pSjkuZXlKamIyNTBaWGgwSWpwN0ltNWxaV1JmY0dGMGFXVnVkRjlpWVc1dVpYSWlPblJ5ZFdVc0luTnRZWEowWDNOMGVXeGxYM1Z5YkNJNkltaDBkSEJ6T2k4dmJHRjFibU5vTG5OdFlYSjBhR1ZoYkhSb2FYUXViM0puTDNOdFlYSjBMWE4wZVd4bExtcHpiMjRpTENKd1lYUnBaVzUwSWpvaVpXSXpNamN4WlRFdFlXVXhZaTAwTmpRMExUa3pNekl0TkRGbE16SmpPREk1TkRnMklpd2laVzVqYjNWdWRHVnlJam9pTXpGaU1UaGhZVEF0TUdSaE55MDBORFl3TFRrMk16TXRNRFJoWmpReE5EWTJaRGMySW4wc0ltTnNhV1Z1ZEY5cFpDSTZJbTE1WDNkbFlsOWhjSEFpTENKelkyOXdaU0k2SW05d1pXNXBaQ0JtYUdseVZYTmxjaUJ2Wm1ac2FXNWxYMkZqWTJWemN5QjFjMlZ5THlvdUtpQndZWFJwWlc1MEx5b3VLaUJzWVhWdVkyZ3ZaVzVqYjNWdWRHVnlJR3hoZFc1amFDOXdZWFJwWlc1MElIQnliMlpwYkdVaUxDSjFjMlZ5SWpvaVVISmhZM1JwZEdsdmJtVnlMM050WVhKMExWQnlZV04wYVhScGIyNWxjaTAzTVRRNE1qY3hNeUlzSW1saGRDSTZNVFUxT0RjeE1EazJOQ3dpWlhod0lqb3hOVGt3TWpRMk9UWTFmUS5mNXlOWS15S0tEZTBhNTlfZUZncDZzMHJIU2dQTFhnbUFXRFB6X2hFVWdzIiwidG9rZW5fdHlwZSI6ImJlYXJlciIsInNjb3BlIjoib3BlbmlkIGZoaXJVc2VyIG9mZmxpbmVfYWNjZXNzIHVzZXIvKi4qIHBhdGllbnQvKi4qIGxhdW5jaC9lbmNvdW50ZXIgbGF1bmNoL3BhdGllbnQgcHJvZmlsZSIsImNsaWVudF9pZCI6Im15X3dlYl9hcHAiLCJleHBpcmVzX2luIjozNjAwLCJpZF90b2tlbiI6ImV5SjBlWEFpT2lKS1YxUWlMQ0poYkdjaU9pSlNVekkxTmlKOS5leUp3Y205bWFXeGxJam9pVUhKaFkzUnBkR2x2Ym1WeUwzTnRZWEowTFZCeVlXTjBhWFJwYjI1bGNpMDNNVFE0TWpjeE15SXNJbVpvYVhKVmMyVnlJam9pVUhKaFkzUnBkR2x2Ym1WeUwzTnRZWEowTFZCeVlXTjBhWFJwYjI1bGNpMDNNVFE0TWpjeE15SXNJbUYxWkNJNkltMTVYM2RsWWw5aGNIQWlMQ0p6ZFdJaU9pSmtZakl6WkRCa1pUSTFOamM0WlRZM01EazVZbU0wTXpRek1qTmtZekJrT1RZMU1UTmlOVFV5TW1RMFlqYzBNV05pWVRNNVpqZGpPVEprTUdNME5tRmxJaXdpYVhOeklqb2lhSFIwY0RvdkwyeGhkVzVqYUM1emJXRnlkR2hsWVd4MGFHbDBMbTl5WnlJc0ltbGhkQ0k2TVRVMU9EY3hNRGsyTlN3aVpYaHdJam94TlRVNE56RTBOVFkxZlEuVzFPSmdWUl9wOTdERlRaSmZhLWI2aWRmNktZMTUtbE81WU9nNHROZkJ5X3dmUHVpbHBUeXZBcDFHRnc2TFpGMnFhNkFWYV9oc1BoXy1GSTJKNkN6MGlqZkFZbVMzdFZwYVZYSGhpMjZsUG5QdUIxVjFUbWJ6YVhDWmJYaC1pdjl4WTNZQXFFRTgyMjFjTXRzQ3FXUFM3aUlMYmJJZmozQnlNMm04aXNRVS1pOGhxLUdTV2ZKNTlwczRGMFZNdlI0QmlPUUdIOXQ5TFQ0TDVxNnNsLU9ONUpJVnJFdnEweFJQVjBrTnpqbUVheklLbV9MMllZM09yMVYwbE02Q0otM2U4RkdkUElIRlRpMjJXcVc1dXhBU2NDVm1hZ1h4S2l5T2xNRWc3dGtjUHA3MjJtS3B0MTMwT3lzaUZyOGpZaElYZkdhX3VGN0tDVFhTZ0RrZEV1WlNRIiwiaWF0IjoxNTU4NzEwOTY1LCJleHAiOjE1NTg3MTQ1NjV9.FDRzViWLg4rMfDzr7Bx01pt5t7CapzcJwQcaFTVcu3E"
                    });
                }
            });

            await client.refresh();
            expect((client.state.tokenResponse as any).headers.authorization).to.exist();
        });

        it ("Ignores parallel invocations", async () => {
            const self    = new Window();
            (global as any).sessionStorage = self.sessionStorage;
            const env     = new BrowserEnv();
            const storage = env.getStorage();
            const key     = "my-key";
            const state = {
                serverUrl: mockUrl,
                tokenUri: mockUrl,
                tokenResponse: {
                    refresh_token: "test_refresh_token",
                    expires_in   : 1,
                    access_token : "test_access_token",
                    scope        : "offline_access"
                },
                key
            };

            storage.set(KEY, key);
            storage.set(key, state);

            const client = new Client(env, state);

            mockServer.mock({
                handler(req, res) {
                    res.json({
                        headers: req.headers,
                        expires_in: 3600,
                        access_token: "x"
                    });
                }
            });

            const job1 = client.refresh();
            const job2 = client.refresh();
            await job1;
            await job2;
            expect(job1).to.equal(job2);
        });

        it ("Allows passing headers", async () => {
            const self    = new Window();
            (global as any).sessionStorage = self.sessionStorage;
            const env     = new BrowserEnv();
            const storage = env.getStorage();
            const key     = "my-key";
            const state = {
                serverUrl: mockUrl,
                tokenUri: mockUrl,
                tokenResponse: {
                    refresh_token: "test_refresh_token",
                    expires_in   : 1,
                    access_token : "test_access_token",
                    scope        : "offline_access"
                },
                key
            };

            storage.set(KEY, key);
            storage.set(key, state);

            const client = new Client(env, state);

            mockServer.mock({
                handler(req, res) {
                    res.json({
                        headers: req.headers,
                        expires_in: 3600,
                        access_token: "x"
                    });
                }
            });

            await client.refresh({ headers: { "x-test": "test-value" }});
            expect((client.state.tokenResponse as any).headers).to.contain({ "x-test": "test-value" });
        });

        it ("Allows passing custom authorization header", async () => {
            const self    = new Window();
            (global as any).sessionStorage = self.sessionStorage;
            const env     = new BrowserEnv();
            const storage = env.getStorage();
            const key     = "my-key";
            const state = {
                serverUrl: mockUrl,
                tokenUri: mockUrl,
                tokenResponse: {
                    refresh_token: "test_refresh_token",
                    expires_in   : 1,
                    access_token : "test_access_token",
                    scope        : "offline_access"
                },
                key
            };

            storage.set(KEY, key);
            storage.set(key, state);

            const client = new Client(env, state);

            mockServer.mock({
                handler(req, res) {
                    res.json({
                        headers: req.headers,
                        expires_in: 3600,
                        access_token: "x"
                    });
                }
            });

            await client.refresh({ headers: { "authorization": "test-value" }});
            expect((client.state.tokenResponse as any).headers).to.contain({ "authorization": "test-value" });
        });

        it ("Works as expected", async () => {
            const self    = new Window();
            (global as any).sessionStorage = self.sessionStorage;
            const env     = new BrowserEnv();
            const storage = env.getStorage();
            const key     = "my-key";
            const state = {
                serverUrl: mockUrl,
                tokenUri: mockUrl,
                tokenResponse: {
                    "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJjb250ZXh0Ijp7Im5lZWRfcGF0aWVudF9iYW5uZXIiOnRydWUsInNtYXJ0X3N0eWxlX3VybCI6Imh0dHBzOi8vbGF1bmNoLnNtYXJ0aGVhbHRoaXQub3JnL3NtYXJ0LXN0eWxlLmpzb24iLCJwYXRpZW50IjoiZWIzMjcxZTEtYWUxYi00NjQ0LTkzMzItNDFlMzJjODI5NDg2IiwiZW5jb3VudGVyIjoiMzFiMThhYTAtMGRhNy00NDYwLTk2MzMtMDRhZjQxNDY2ZDc2In0sImNsaWVudF9pZCI6Im15X3dlYl9hcHAiLCJzY29wZSI6Im9wZW5pZCBmaGlyVXNlciBvZmZsaW5lX2FjY2VzcyB1c2VyLyouKiBwYXRpZW50LyouKiBsYXVuY2gvZW5jb3VudGVyIGxhdW5jaC9wYXRpZW50IHByb2ZpbGUiLCJ1c2VyIjoiUHJhY3RpdGlvbmVyL3NtYXJ0LVByYWN0aXRpb25lci03MTQ4MjcxMyIsImlhdCI6MTU1ODcxMDk2NCwiZXhwIjoxNTkwMjQ2OTY1fQ.f5yNY-yKKDe0a59_eFgp6s0rHSgPLXgmAWDPz_hEUgs",
                    "expires_in"   : 1,
                    "access_token" : "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJuZWVkX3BhdGllbnRfYmFubmVyIjp0cnVlLCJzbWFydF9zdHlsZV91cmwiOiJodHRwczovL2xhdW5jaC5zbWFydGhlYWx0aGl0Lm9yZy9zbWFydC1zdHlsZS5qc29uIiwicGF0aWVudCI6ImViMzI3MWUxLWFlMWItNDY0NC05MzMyLTQxZTMyYzgyOTQ4NiIsImVuY291bnRlciI6IjMxYjE4YWEwLTBkYTctNDQ2MC05NjMzLTA0YWY0MTQ2NmQ3NiIsInJlZnJlc2hfdG9rZW4iOiJleUowZVhBaU9pSktWMVFpTENKaGJHY2lPaUpJVXpJMU5pSjkuZXlKamIyNTBaWGgwSWpwN0ltNWxaV1JmY0dGMGFXVnVkRjlpWVc1dVpYSWlPblJ5ZFdVc0luTnRZWEowWDNOMGVXeGxYM1Z5YkNJNkltaDBkSEJ6T2k4dmJHRjFibU5vTG5OdFlYSjBhR1ZoYkhSb2FYUXViM0puTDNOdFlYSjBMWE4wZVd4bExtcHpiMjRpTENKd1lYUnBaVzUwSWpvaVpXSXpNamN4WlRFdFlXVXhZaTAwTmpRMExUa3pNekl0TkRGbE16SmpPREk1TkRnMklpd2laVzVqYjNWdWRHVnlJam9pTXpGaU1UaGhZVEF0TUdSaE55MDBORFl3TFRrMk16TXRNRFJoWmpReE5EWTJaRGMySW4wc0ltTnNhV1Z1ZEY5cFpDSTZJbTE1WDNkbFlsOWhjSEFpTENKelkyOXdaU0k2SW05d1pXNXBaQ0JtYUdseVZYTmxjaUJ2Wm1ac2FXNWxYMkZqWTJWemN5QjFjMlZ5THlvdUtpQndZWFJwWlc1MEx5b3VLaUJzWVhWdVkyZ3ZaVzVqYjNWdWRHVnlJR3hoZFc1amFDOXdZWFJwWlc1MElIQnliMlpwYkdVaUxDSjFjMlZ5SWpvaVVISmhZM1JwZEdsdmJtVnlMM050WVhKMExWQnlZV04wYVhScGIyNWxjaTAzTVRRNE1qY3hNeUlzSW1saGRDSTZNVFUxT0RjeE1EazJOQ3dpWlhod0lqb3hOVGt3TWpRMk9UWTFmUS5mNXlOWS15S0tEZTBhNTlfZUZncDZzMHJIU2dQTFhnbUFXRFB6X2hFVWdzIiwidG9rZW5fdHlwZSI6ImJlYXJlciIsInNjb3BlIjoib3BlbmlkIGZoaXJVc2VyIG9mZmxpbmVfYWNjZXNzIHVzZXIvKi4qIHBhdGllbnQvKi4qIGxhdW5jaC9lbmNvdW50ZXIgbGF1bmNoL3BhdGllbnQgcHJvZmlsZSIsImNsaWVudF9pZCI6Im15X3dlYl9hcHAiLCJleHBpcmVzX2luIjozNjAwLCJpZF90b2tlbiI6ImV5SjBlWEFpT2lKS1YxUWlMQ0poYkdjaU9pSlNVekkxTmlKOS5leUp3Y205bWFXeGxJam9pVUhKaFkzUnBkR2x2Ym1WeUwzTnRZWEowTFZCeVlXTjBhWFJwYjI1bGNpMDNNVFE0TWpjeE15SXNJbVpvYVhKVmMyVnlJam9pVUhKaFkzUnBkR2x2Ym1WeUwzTnRZWEowTFZCeVlXTjBhWFJwYjI1bGNpMDNNVFE0TWpjeE15SXNJbUYxWkNJNkltMTVYM2RsWWw5aGNIQWlMQ0p6ZFdJaU9pSmtZakl6WkRCa1pUSTFOamM0WlRZM01EazVZbU0wTXpRek1qTmtZekJrT1RZMU1UTmlOVFV5TW1RMFlqYzBNV05pWVRNNVpqZGpPVEprTUdNME5tRmxJaXdpYVhOeklqb2lhSFIwY0RvdkwyeGhkVzVqYUM1emJXRnlkR2hsWVd4MGFHbDBMbTl5WnlJc0ltbGhkQ0k2TVRVMU9EY3hNRGsyTlN3aVpYaHdJam94TlRVNE56RTBOVFkxZlEuVzFPSmdWUl9wOTdERlRaSmZhLWI2aWRmNktZMTUtbE81WU9nNHROZkJ5X3dmUHVpbHBUeXZBcDFHRnc2TFpGMnFhNkFWYV9oc1BoXy1GSTJKNkN6MGlqZkFZbVMzdFZwYVZYSGhpMjZsUG5QdUIxVjFUbWJ6YVhDWmJYaC1pdjl4WTNZQXFFRTgyMjFjTXRzQ3FXUFM3aUlMYmJJZmozQnlNMm04aXNRVS1pOGhxLUdTV2ZKNTlwczRGMFZNdlI0QmlPUUdIOXQ5TFQ0TDVxNnNsLU9ONUpJVnJFdnEweFJQVjBrTnpqbUVheklLbV9MMllZM09yMVYwbE02Q0otM2U4RkdkUElIRlRpMjJXcVc1dXhBU2NDVm1hZ1h4S2l5T2xNRWc3dGtjUHA3MjJtS3B0MTMwT3lzaUZyOGpZaElYZkdhX3VGN0tDVFhTZ0RrZEV1WlNRIiwiaWF0IjoxNTU4NzEwOTY1LCJleHAiOjE1NTg3MTQ1NjV9.FDRzViWLg4rMfDzr7Bx01pt5t7CapzcJwQcaFTVcu3E",
                    "scope": "offline_access"
                },
                key
            };

            storage.set(KEY, key);
            storage.set(key, state);

            const client = new Client(env, state);
            // console.log("===> ", env, storage);

            const fakeTokenResponse = {
                headers: { "content-type": "application/json" },
                status: 200,
                body: {
                    "expires_in": 3600,
                    "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJuZWVkX3BhdGllbnRfYmFubmVyIjp0cnVlLCJzbWFydF9zdHlsZV91cmwiOiJodHRwczovL2xhdW5jaC5zbWFydGhlYWx0aGl0Lm9yZy9zbWFydC1zdHlsZS5qc29uIiwicGF0aWVudCI6ImViMzI3MWUxLWFlMWItNDY0NC05MzMyLTQxZTMyYzgyOTQ4NiIsImVuY291bnRlciI6IjMxYjE4YWEwLTBkYTctNDQ2MC05NjMzLTA0YWY0MTQ2NmQ3NiIsInJlZnJlc2hfdG9rZW4iOiJleUowZVhBaU9pSktWMVFpTENKaGJHY2lPaUpJVXpJMU5pSjkuZXlKamIyNTBaWGgwSWpwN0ltNWxaV1JmY0dGMGFXVnVkRjlpWVc1dVpYSWlPblJ5ZFdVc0luTnRZWEowWDNOMGVXeGxYM1Z5YkNJNkltaDBkSEJ6T2k4dmJHRjFibU5vTG5OdFlYSjBhR1ZoYkhSb2FYUXViM0puTDNOdFlYSjBMWE4wZVd4bExtcHpiMjRpTENKd1lYUnBaVzUwSWpvaVpXSXpNamN4WlRFdFlXVXhZaTAwTmpRMExUa3pNekl0TkRGbE16SmpPREk1TkRnMklpd2laVzVqYjNWdWRHVnlJam9pTXpGaU1UaGhZVEF0TUdSaE55MDBORFl3TFRrMk16TXRNRFJoWmpReE5EWTJaRGMySW4wc0ltTnNhV1Z1ZEY5cFpDSTZJbTE1WDNkbFlsOWhjSEFpTENKelkyOXdaU0k2SW05d1pXNXBaQ0JtYUdseVZYTmxjaUJ2Wm1ac2FXNWxYMkZqWTJWemN5QjFjMlZ5THlvdUtpQndZWFJwWlc1MEx5b3VLaUJzWVhWdVkyZ3ZaVzVqYjNWdWRHVnlJR3hoZFc1amFDOXdZWFJwWlc1MElIQnliMlpwYkdVaUxDSjFjMlZ5SWpvaVVISmhZM1JwZEdsdmJtVnlMM050WVhKMExWQnlZV04wYVhScGIyNWxjaTAzTVRRNE1qY3hNeUlzSW1saGRDSTZNVFUxT0RjeE1EazJOQ3dpWlhod0lqb3hOVGt3TWpRMk9UWTFmUS5mNXlOWS15S0tEZTBhNTlfZUZncDZzMHJIU2dQTFhnbUFXRFB6X2hFVWdzIiwidG9rZW5fdHlwZSI6ImJlYXJlciIsInNjb3BlIjoib3BlbmlkIGZoaXJVc2VyIG9mZmxpbmVfYWNjZXNzIHVzZXIvKi4qIHBhdGllbnQvKi4qIGxhdW5jaC9lbmNvdW50ZXIgbGF1bmNoL3BhdGllbnQgcHJvZmlsZSIsImNsaWVudF9pZCI6Im15X3dlYl9hcHAiLCJleHBpcmVzX2luIjozNjAwLCJpZF90b2tlbiI6ImV5SjBlWEFpT2lKS1YxUWlMQ0poYkdjaU9pSlNVekkxTmlKOS5leUp3Y205bWFXeGxJam9pVUhKaFkzUnBkR2x2Ym1WeUwzTnRZWEowTFZCeVlXTjBhWFJwYjI1bGNpMDNNVFE0TWpjeE15SXNJbVpvYVhKVmMyVnlJam9pVUhKaFkzUnBkR2x2Ym1WeUwzTnRZWEowTFZCeVlXTjBhWFJwYjI1bGNpMDNNVFE0TWpjeE15SXNJbUYxWkNJNkltMTVYM2RsWWw5aGNIQWlMQ0p6ZFdJaU9pSmtZakl6WkRCa1pUSTFOamM0WlRZM01EazVZbU0wTXpRek1qTmtZekJrT1RZMU1UTmlOVFV5TW1RMFlqYzBNV05pWVRNNVpqZGpPVEprTUdNME5tRmxJaXdpYVhOeklqb2lhSFIwY0RvdkwyeGhkVzVqYUM1emJXRnlkR2hsWVd4MGFHbDBMbTl5WnlJc0ltbGhkQ0k2TVRVMU9EY3hNRGsyTlN3aVpYaHdJam94TlRVNE56RTBOVFkxZlEuVzFPSmdWUl9wOTdERlRaSmZhLWI2aWRmNktZMTUtbE81WU9nNHROZkJ5X3dmUHVpbHBUeXZBcDFHRnc2TFpGMnFhNkFWYV9oc1BoXy1GSTJKNkN6MGlqZkFZbVMzdFZwYVZYSGhpMjZsUG5QdUIxVjFUbWJ6YVhDWmJYaC1pdjl4WTNZQXFFRTgyMjFjTXRzQ3FXUFM3aUlMYmJJZmozQnlNMm04aXNRVS1pOGhxLUdTV2ZKNTlwczRGMFZNdlI0QmlPUUdIOXQ5TFQ0TDVxNnNsLU9ONUpJVnJFdnEweFJQVjBrTnpqbUVheklLbV9MMllZM09yMVYwbE02Q0otM2U4RkdkUElIRlRpMjJXcVc1dXhBU2NDVm1hZ1h4S2l5T2xNRWc3dGtjUHA3MjJtS3B0MTMwT3lzaUZyOGpZaElYZkdhX3VGN0tDVFhTZ0RrZEV1WlNRIiwiaWF0IjoxNTU4NzEwOTY1LCJleHAiOjE1NTg3MTQ1NjV9.FDRzViWLg4rMfDzr7Bx01pt5t7CapzcJwQcaFTVcu3E"
                }
            };

            mockServer.mock(fakeTokenResponse);

            // 1. Manual refresh
            await client.refresh();
            expect((client.state.tokenResponse as any).expires_in).to.equal(3600);

            // 2. Automatic refresh
            client.state.expiresAt = 0;
            mockServer.mock(fakeTokenResponse);
            mockServer.mock({
                status: 200,
                headers: {
                    "content-type": "application/json"
                },
                body: {
                    msg: "successful after all"
                }
            });
            const result = await client.request("/Patient");
            expect(result).to.equal({ msg: "successful after all" });
        });
    });

    describe("getPatientId() returns null without tokenResponse", () => {
        crossPlatformTest(async (env) => {
            const client = new Client(env, mockUrl);
            expect(client.getPatientId()).to.equal(null);
            expect(clientDebug._calls).to.equal([[str.noFreeContext, "selected patient"]]);
        });
    });

    describe("getPatientId() complains about authorizeUri", () => {
        crossPlatformTest(async (env) => {
            const client = new Client(env, {
                serverUrl: mockUrl,
                authorizeUri: "whatever"
            });
            expect(client.getPatientId()).to.equal(null);
            expect(clientDebug._calls).to.equal([[str.noIfNoAuth, "the ID of the selected patient"]]);
        });
    });

    describe("getPatientId() complains about scopes", () => {
        crossPlatformTest(async (env) => {
            const client = new Client(env, {
                serverUrl: mockUrl,
                tokenResponse: {}
            });
            expect(client.getPatientId()).to.equal(null);
            expect(clientDebug._calls).to.equal([[str.noScopeForId, "patient", "patient"]]);
        });
    });

    describe("getPatientId() complains about server support", () => {
        crossPlatformTest(async (env) => {
            const client = new Client(env, {
                serverUrl: mockUrl,
                scope: "launch",
                tokenResponse: {}
            });
            expect(client.getPatientId()).to.equal(null);
            expect(clientDebug._calls).to.equal([[
                "The ID of the selected patient is not available. " +
                "Please check if your server supports that."
            ]]);
        });
    });

    describe("getEncounterId() returns null without tokenResponse", () => {
        crossPlatformTest(async (env) => {
            const client = new Client(env, mockUrl);
            expect(client.getEncounterId()).to.equal(null);
            expect(clientDebug._calls).to.equal([[str.noFreeContext, "selected encounter"]]);
        });
    });

    describe("getEncounterId() complains about authorizeUri", () => {
        crossPlatformTest(async (env) => {
            const client = new Client(env, {
                serverUrl: mockUrl,
                authorizeUri: "whatever"
            });
            expect(client.getEncounterId()).to.equal(null);
            expect(clientDebug._calls).to.equal([[str.noIfNoAuth, "the ID of the selected encounter"]]);
        });
    });

    describe("getEncounterId() complains about scopes", () => {
        crossPlatformTest(async (env) => {
            const client = new Client(env, {
                serverUrl: mockUrl,
                tokenResponse: {}
            });
            expect(client.getEncounterId()).to.equal(null);
            expect(clientDebug._calls).to.equal([[str.noScopeForId, "encounter", "encounter"]]);
        });
    });

    describe("getEncounterId() complains about server support", () => {
        crossPlatformTest(async (env) => {
            const client = new Client(env, {
                serverUrl: mockUrl,
                scope: "launch",
                tokenResponse: {}
            });
            expect(client.getEncounterId()).to.equal(null);
            expect(clientDebug._calls).to.equal([[
                "The ID of the selected encounter is not available. " +
                "Please check if your server supports that, and that " +
                "the selected patient has any recorded encounters."
            ]]);
        });
    });

    describe("getIdToken() returns null without tokenResponse", () => {
        crossPlatformTest(async (env) => {
            const client = new Client(env, mockUrl);
            expect(client.getIdToken()).to.equal(null);
            expect(clientDebug._calls).to.equal([[str.noFreeContext, "id_token"]]);
        });
    });

    describe("getIdToken() complains about authorizeUri", () => {
        crossPlatformTest(async (env) => {
            const client = new Client(env, {
                serverUrl   : mockUrl,
                authorizeUri: "whatever"
            });
            expect(client.getIdToken()).to.equal(null);
            expect(clientDebug._calls).to.equal([[str.noIfNoAuth, "the id_token"]]);
        });
    });

    describe("getIdToken() complains about scopes", () => {
        crossPlatformTest(async (env) => {
            const client = new Client(env, {
                serverUrl: mockUrl,
                scope: "fhirUser",
                tokenResponse: {}
            });
            expect(client.getIdToken()).to.equal(null);
            expect(clientDebug._calls).to.equal([["You are trying to get the id_token but you are not using the right scopes. Please add 'openid' and 'fhirUser' or 'profile' to the scopes you are requesting."]]);
        });
    });

    describe("getIdToken() complains about server support", () => {
        crossPlatformTest(async (env) => {
            const client = new Client(env, {
                serverUrl: mockUrl,
                scope: "openid fhirUser",
                tokenResponse: {}
            });
            expect(client.getIdToken()).to.equal(null);
            expect(clientDebug._calls).to.equal([[
                "The id_token is not available. Please check if your " +
                "server supports that."
            ]]);
        });
    });

    describe("getFhirUser()", () => {
        describe("works with fhirUser", () => {
            crossPlatformTest(async (env) => {
                const client = new Client(env, {
                    serverUrl: mockUrl,
                    scope: "openid fhirUser",
                    tokenResponse: {
                        id_token: jwt.sign({ fhirUser: "Patient/123" }, "secret")
                    }
                });
                expect(client.getFhirUser()).to.equal("Patient/123");
            });
        })

        describe("handles full urls in fhirUser", () => {
            crossPlatformTest(async (env) => {
                const client = new Client(env, {
                    serverUrl: mockUrl,
                    scope: "openid fhirUser",
                    tokenResponse: {
                        id_token: jwt.sign({ fhirUser: "http://fhir.dev/r5/Patient/123" }, "secret")
                    }
                });
                expect(client.getFhirUser()).to.equal("Patient/123");
            });
        })

        describe("works with profile", () => {
            crossPlatformTest(async (env) => {
                const client = new Client(env, {
                    serverUrl: mockUrl,
                    scope: "openid profile",
                    tokenResponse: {
                        id_token: jwt.sign({ profile: "Patient/123" }, "secret")
                    }
                });
                expect(client.getFhirUser()).to.equal("Patient/123");
            });
        })
    })

    describe("_clearState()", () => {
        crossPlatformTest(async (env) => {
            const self    = new Window();
            (global as any).sessionStorage = self.sessionStorage;
            const client = new Client(env, {
                serverUrl: mockUrl,
                scope: "openid fhirUser",
                tokenResponse: { a: "b" }
            });
            const storage = env.getStorage();
            const key = "my-key";
            await storage.set(KEY, key);
            await storage.set(key, "whatever");
            // @ts-ignore
            await client._clearState();
            expect(client.state.tokenResponse).to.equal({});
            expect(storage.get(KEY)).to.be.empty();
            expect(storage.get(key)).to.be.empty();
        });
    });

    describe("byCode", () => {
        crossPlatformTest(async (env) => {
            const client = new Client(env, "http://localhost");
            const observation1 = require("./mocks/Observation-1.json");
            const observation2 = require("./mocks/Observation-2.json");

            const resources = [
                observation1,
                observation2,
                {},
                {
                    resourceType: "Observation",
                    category: [
                        null,
                        {
                            codding: null
                        }
                    ]
                },
                {
                    resourceType: "Observation",
                    category: [
                        {
                            coding: [
                                {
                                    code: null
                                }
                            ]
                        }
                    ]
                }
            ];

            expect<fhirclient.ObservationMap>(client.byCode(resources, "code")).to.equal({
                "55284-4": [ observation1 ],
                "6082-2" : [ observation2 ]
            });

            expect<fhirclient.ObservationMap>(client.byCode(resources, "category")).to.equal({
                "vital-signs": [ observation1 ],
                "laboratory" : [ observation2 ]
            });

            expect<fhirclient.ObservationMap>(client.byCode(resources, "missing")).to.equal({});
        });
    });

    describe("byCodes", () => {
        crossPlatformTest(async (env) => {
            const client = new Client(env, "http://localhost");
            const observation1 = require("./mocks/Observation-1.json");
            const observation2 = require("./mocks/Observation-2.json");

            const resources = [
                observation1,
                observation2,
                observation1,
                observation2
            ];

            expect(client.byCodes(resources, "code")("55284-4")).to.equal([observation1, observation1]);

            expect(client.byCodes(resources, "code")("6082-2")).to.equal([observation2, observation2]);

            expect(client.byCodes(resources, "category")("laboratory")).to.equal([observation2, observation2]);
        });
    });

    describe("units", () => {
        describe ("cm", () => {
            crossPlatformTest(async (env) => {
                const client = new Client(env, "http://localhost");
                expect(client.units.cm({ code: "cm", value: 3 })).to.equal(3);
                expect(client.units.cm({ code: "m", value: 3 })).to.equal(300);
                expect(client.units.cm({ code: "in", value: 3 })).to.equal(3 * 2.54);
                expect(client.units.cm({ code: "[in_us]", value: 3 })).to.equal(3 * 2.54);
                expect(client.units.cm({ code: "[in_i]", value: 3 })).to.equal(3 * 2.54);
                expect(client.units.cm({ code: "ft", value: 3 })).to.equal(3 * 30.48);
                expect(client.units.cm({ code: "[ft_us]", value: 3 })).to.equal(3 * 30.48);
                expect(() => client.units.cm({ code: "xx", value: 3 })).to.throw();
                // @ts-ignore
                expect(() => client.units.cm({ code: "m", value: "x" })).to.throw();
            });
        });
        describe ("kg", () => {
            crossPlatformTest(async (env) => {
                const client = new Client(env, "http://localhost");
                expect(client.units.kg({ code: "kg", value: 3 })).to.equal(3);
                expect(client.units.kg({ code: "g", value: 3 })).to.equal(3 / 1000);
                expect(client.units.kg({ code: "lb", value: 3 })).to.equal(3 / 2.20462);
                expect(client.units.kg({ code: "oz", value: 3 })).to.equal(3 / 35.274);
                expect(() => client.units.kg({ code: "xx", value: 3 })).to.throw();
                // @ts-ignore
                expect(() => client.units.kg({ code: "lb", value: "x" })).to.throw();
            });
        });
        describe ("any", () => {
            crossPlatformTest(async (env) => {
                const client = new Client(env, "http://localhost");
                // @ts-ignore
                expect(client.units.any({ value: 3 })).to.equal(3);
                // @ts-ignore
                expect(() => client.units.kg({ value: "x" })).to.throw();
            });
        });
    });

    describe("getPath", () => {
        it ("returns the first arg if no path", () => {
            // @ts-ignore
            const client = new Client({}, "http://localhost");
            const data = {};
            expect(client.getPath(data)).to.equal(data);
        });
        it ("returns the first arg for empty path", () => {
            // @ts-ignore
            const client = new Client({}, "http://localhost");
            const data = {};
            expect(client.getPath(data, "")).to.equal(data);
        });
        it ("works as expected", () => {
            // @ts-ignore
            const client = new Client({}, "http://localhost");
            const data = { a: 1, b: [0, { a: 2 }] };
            expect(client.getPath(data, "b.1.a")).to.equal(2);
            expect(client.getPath(data, "b.4.a")).to.equal(undefined);
        });
    });

    describe("getState", () => {
        it ("returns the entire state", () => {
            const state = { a: { b: [ { c: 2 } ] }, serverUrl: "http://x" };
            // @ts-ignore
            const client = new Client({}, state);
            expect(client.getState()).to.equal(state);
        });

        it ("can get single path", () => {
            const state = { a: { b: [ { c: 2 } ] }, serverUrl: "http://x" };
            // @ts-ignore
            const client = new Client({}, state);
            expect(client.getState("serverUrl")).to.equal(state.serverUrl);
        });

        it ("can get nested path", () => {
            const state = { a: { b: [ { c: 2 } ] }, serverUrl: "http://x" };
            // @ts-ignore
            const client = new Client({}, state);
            expect(client.getState("a.b.0.c")).to.equal(2);
        });

        it ("keeps state immutable", () => {
            const state = { a: { b: [ { c: 2 } ] }, serverUrl: "http://x" };
            // @ts-ignore
            const client = new Client({}, state);
            const result = client.getState();
            result.a = 5;
            expect(client.getState("a")).to.equal(state.a);
        });
    });

    describe("create", () => {
        crossPlatformTest(async (env) => {
            const client = new Client(env, mockUrl);
            const resource = { resourceType: "Patient" };

            let result: any;

            // Passing the includeResponse option
            mockServer.mock({
                status: 200,
                body: resource,
                headers: { "content-type": "application/json" }
            });
            result = await client.create(resource, { includeResponse: true });
            expect(result.body).to.equal(resource);
            expect(result.response.status).to.equal(200);

            client.request = async (options: any) => options;

            // Standard usage
            result = await client.create(resource);
            expect(result).to.equal({
                url    : "Patient",
                method : "POST",
                body   : JSON.stringify(resource),
                headers: {
                    "content-type": "application/json"
                }
            });

            // Passing options
            result = await client.create(resource, {
                url   : "a",
                method: "b",
                body  : "c",
                // @ts-ignore
                signal: "whatever",
                headers: {
                    "x-custom": "value",
                    "content-type": "application/fhir+json"
                }
            });
            expect(result).to.equal({
                url    : "Patient",
                method : "POST",
                body   : JSON.stringify(resource),
                signal : "whatever",
                headers: {
                    "x-custom": "value",
                    "content-type": "application/fhir+json"
                }
            });

            // Passing options but no headers
            result = await client.create(resource, {
                url   : "a",
                method: "b",
                body  : "c",
                // @ts-ignore
                signal: "whatever"
            });
            expect(result).to.equal({
                url    : "Patient",
                method : "POST",
                body   : JSON.stringify(resource),
                signal : "whatever",
                headers: {
                    "content-type": "application/json"
                }
            });
        });
    });

    describe("update", () => {
        crossPlatformTest(async (env) => {
            const client = new Client(env, mockUrl);
            const resource = { resourceType: "Patient", id: "2" };
            let result: any;

            // Passing the includeResponse option
            mockServer.mock({
                status: 200,
                body: resource,
                headers: { "content-type": "application/json" }
            });
            result = await client.update(resource, { includeResponse: true });
            expect(result.body).to.equal(resource);
            expect(result.response.status).to.equal(200);

            client.request = async (options: any) => options;

            // Standard usage
            result = await client.update(resource);
            expect(result).to.equal({
                url    : "Patient/2",
                method : "PUT",
                body   : JSON.stringify(resource),
                headers: {
                    "content-type": "application/json"
                }
            });

            // Passing options
            result = await client.update(resource, {
                url   : "a",
                method: "b",
                body  : "c",
                // @ts-ignore
                signal: "whatever",
                headers: {
                    "x-custom": "value",
                    "content-type": "application/fhir+json"
                }
            });
            expect(result).to.equal({
                url    : "Patient/2",
                method : "PUT",
                body   : JSON.stringify(resource),
                signal: "whatever",
                headers: {
                    "x-custom": "value",
                    "content-type": "application/fhir+json"
                }
            });

            // Passing options but no headers
            result = await client.update(resource, {
                url   : "a",
                method: "b",
                body  : "c",
                // @ts-ignore
                signal: "whatever"
            });
            expect(result).to.equal({
                url    : "Patient/2",
                method : "PUT",
                body   : JSON.stringify(resource),
                signal: "whatever",
                headers: {
                    "content-type": "application/json"
                }
            });
        });

        it ("update with text body and includeResponse = true", async () => {
            const env    = new BrowserEnv()
            const client = new Client(env, mockUrl);

            mockServer.mock({
                status: 200,
                body: "text",
                headers: { "content-type": "text/plain" }
            });

            let result: any = await client.update({}, { includeResponse: true });

            expect(result.body).to.equal("text");
            expect(result.response).to.exist();
            expect(result.response.status).to.equal(200);
        })

        it ("update with text body and includeResponse = false", async () => {
            const env    = new BrowserEnv()
            const client = new Client(env, mockUrl);

            mockServer.mock({
                status: 200,
                body: "text",
                headers: { "content-type": "text/plain" }
            });
            
            let result: any = await client.update({});
            expect(result).to.equal("text");
        })

        it ("update with empty body and includeResponse = true", async () => {
            const env    = new BrowserEnv()
            const client = new Client(env, mockUrl);
            
            mockServer.mock({
                status: 200,
                body  : "",
                headers: { "content-type": "application/json" }
            });
            
            let result: any = await client.update({}, { includeResponse: true });

            expect(result.body).to.equal("");
            expect(result.response).to.exist();
            expect(result.response.status).to.equal(200);
        })

        it ("update with falsy body and includeResponse = true", async () => {
            const env    = new BrowserEnv()
            const client = new Client(env, mockUrl);
            
            mockServer.mock({
                status: 200,
                body  : "null",
                headers: { "content-type": "application/json" }
            });
            
            let result: any = await client.update({}, { includeResponse: true });

            expect(result.body).to.equal(null);
            expect(result.response).to.exist();
            expect(result.response.status).to.equal(200);
        })

        it ("update with Response body and includeResponse = true", async () => {
            const env    = new BrowserEnv()
            const client = new Client(env, mockUrl);
            
            mockServer.mock({
                status: 200,
                body  : new Response(),
                headers: { "content-type": "application/json" }
            });
            
            let result: any = await client.update({}, { includeResponse: true });

            expect(result.body).to.exist();
            expect(result.response).to.exist();
            expect(result.response.status).to.equal(200);
        })
    });

    describe("delete", () => {
        crossPlatformTest(async (env) => {
            const client = new Client(env, mockUrl);
            
            let result: any;

            // Passing the includeResponse option
            mockServer.mock({
                status: 200,
                body: { result: "success" },
                headers: { "content-type": "application/json" }
            });
            
            result = await client.delete("Patient/2", { includeResponse: true });
            expect(result.body).to.equal({ result: "success" });
            expect(result.response.status).to.equal(200);

            client.request = async (options: any) => options;

            // Standard usage
            result = await client.delete("Patient/2");
            expect(result).to.equal({
                url   : "Patient/2",
                method: "DELETE"
            });

            // Verify that method and url cannot be overridden
            result = await client.delete("Patient/2", {
                // @ts-ignore
                url   : "x",
                method: "y",
                other : 3
            });
            expect(result).to.equal({
                url   : "Patient/2",
                method: "DELETE",
                other : 3
            });

            // Verify that abort signal is passed through
            result = await client.delete("Patient/2", {
                // @ts-ignore
                signal: "whatever"
            });
            expect(result).to.equal({
                url   : "Patient/2",
                method: "DELETE",
                signal: "whatever"
            });
        });
    });

    describe("patch", () => {
        crossPlatformTest(async (env) => {
            const client = new Client(env, mockUrl);
            
            let result: any;

            // Standard usage
            mockServer.mock({
                status: 200,
                body: { result: "success" },
                headers: { "content-type": "application/json" }
            });
            
            result = await client.patch("Patient/2", [{ op: "remove", path: "/x" }], { includeResponse: true });
            expect(result.body).to.equal({ result: "success" });
            expect(result.response.status).to.equal(200);

            // Modify the request method to return the request options
            client.request = async (options: any) => options;

            // Standard usage
            result = await client.patch("Patient/2", [{ op: "remove", path: "/x" }]);
            expect(result).to.equal({
                url   : "Patient/2",
                method: "PATCH",
                body: '[{"op":"remove","path":"/x"}]',
                headers: {
                    "prefer": "return=presentation",
                    "content-type": "application/json-patch+json; charset=UTF-8"
                }
            });

            // Test what can be overridden
            result = await client.patch("Patient/2", [{ op: "remove", path: "/x" }], {
                // @ts-ignore
                url   : "x",
                method: "y",
                other : 3,
                headers: {
                    prefer: "test",
                    z: "22"
                }
            });
            expect(result).to.equal({
                url   : "Patient/2",
                method: "PATCH",
                body: '[{"op":"remove","path":"/x"}]',
                other: 3,
                headers: {
                    "prefer": "test",
                    "content-type": "application/json-patch+json; charset=UTF-8",
                    "z": "22"
                }
            });

            // Verify that abort signal is passed through
            result = await client.patch("Patient/2", [{ op: "remove", path: "/x" }], {
                // @ts-ignore
                signal: "whatever"
            });
            expect(result).to.include({ signal: "whatever" });

            // Validations ----------------------------------------------------

            // @ts-ignore
            expect(client.patch("x", null)).to.reject("The JSON patch must be an array");
            
            expect(client.patch("x", [])).to.reject("The JSON patch array should not be empty");
            
            // @ts-ignore
            expect(client.patch("x", [{}])).to.reject(/Each patch operation must have an "op" property/);

            expect(client.patch("x", [
                // @ts-ignore
                { op: "x" }
            ])).to.reject(/Each patch operation must have an "op" property/);

            expect(client.patch("x", [
                // @ts-ignore
                { op: "add" }
            ])).to.reject(/Missing "path" property/);

            expect(client.patch("x", [
                // @ts-ignore
                { op: "add", path: "/x" }
            ])).to.reject(/Missing "value" property/);

            expect(client.patch("x", [
                // @ts-ignore
                { op: "replace", path: "/x" }
            ])).to.reject(/Missing "value" property/);

            expect(client.patch("x", [
                // @ts-ignore
                { op: "test", path: "/x", value: 4, custom: true }
            ])).to.reject(/Contains unknown properties/);

            expect(client.patch("x", [
                // @ts-ignore
                { op: "move", path: "/x" }
            ])).to.reject(/Requires a string "from" property/);

            expect(client.patch("x", [
                // @ts-ignore
                { op: "copy", path: "/x" }
            ])).to.reject(/Requires a string "from" property/);

            expect(client.patch("x", [
                // @ts-ignore
                { op: "move", path: "/x", from: "/y", custom: true }
            ])).to.reject(/Contains unknown properties/);

            expect(client.patch("x", [
                // @ts-ignore
                { op: "remove", path: "/x", custom: true }
            ])).to.reject(/Contains unknown properties/);
        });
    });

    describe("getFhirVersion", () => {
        crossPlatformTest(async (env) => {
            const client = new Client(env, mockUrl);

            // Mock the conformance statement
            mockServer.mock({
                headers: { "content-type": "application/json" },
                status: 200,
                body: { fhirVersion: "1.2.3" }
            });

            const version = await client.getFhirVersion();
            expect(version).to.equal("1.2.3");
        });
    });

    describe("getFhirRelease", () => {
        crossPlatformTest(async (env) => {
            const client = new Client(env, mockUrl);

            // Mock the conformance statement
            mockServer.mock({
                headers: { "content-type": "application/json" },
                status: 200,
                body: { fhirVersion: "3.3.0" }
            });

            const version = await client.getFhirRelease();
            expect(version).to.equal(4);
        });

        describe("returns 0 for unknown versions", () => {
            crossPlatformTest(async (env) => {
                const client = new Client(env, mockUrl);

                // Mock the conformance statement
                mockServer.mock({
                    headers: { "content-type": "application/json" },
                    status: 200,
                    body: { fhirVersion: "8.3.0" }
                });

                const version = await client.getFhirRelease();
                expect(version).to.equal(0);
            });
        });
    });
});
