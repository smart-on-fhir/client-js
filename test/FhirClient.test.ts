// Mocks
import { expect } from "@hapi/code";
import * as Lab   from "@hapi/lab";
import { Bundle } from "fhir/r4";
import mockDebug  from "./mocks/mockDebug";
import mockServer from "./mocks/mockServer";
import FhirClient from "../src/FhirClient";

export const lab = Lab.script();
const { it, describe, before, after, afterEach } = lab;

const clientDebug = mockDebug.instances.find(instance => instance.namespace === "FHIR:FhirClient");

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


describe("FhirClient", () => {

    describe("constructor", () => {
        it ("throws if initialized without arguments", () => {
            //@ts-ignore
            expect(() => new FhirClient()).to.throw(/string parameter is required/);
        });

        it ("throws if initialized without serverUrl", () => {
            // @ts-ignore
            expect(() => new FhirClient({})).to.throw(/string parameter is required/);
        });

        it ("throws if initialized with invalid serverUrl", () => {
            // @ts-ignore
            expect(() => new FhirClient("invalid-url")).to.throw(/string parameter is required/);
        });
    });

    describe("getAllPages", () => {
        it ("works with string", async () => {
            
            // Page 1
            mockServer.mock({
                headers: { "content-type": "application/json" },
                status: 200,
                body: {
                    resourceType: "Bundle",
                    id: "page1",
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
                    id: "page2",
                    entry: []
                }
            });
            
            const client = new FhirClient(mockUrl);

            const results: any[] = [];
            
            for await (const page of client.pages("/Patient")) {
                results.push(page.id);
            }

            expect(results).to.equal(["page1", "page2"]);
        })

        it ("works with URL", async () => {
            
            // Page 1
            mockServer.mock({
                headers: { "content-type": "application/json" },
                status: 200,
                body: {
                    resourceType: "Bundle",
                    id: "page1",
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
                    id: "page2",
                    entry: []
                }
            });
            
            const client = new FhirClient(mockUrl);

            const results: any[] = [];
            
            for await (const page of client.pages(new URL("/Patient", mockUrl))) {
                results.push(page.id);
            }

            expect(results).to.equal(["page1", "page2"]);
        })

        it ("works with Bundle", async () => {
            
            // Page 1
            mockServer.mock({
                headers: { "content-type": "application/json" },
                status: 200,
                body: {
                    resourceType: "Bundle",
                    id: "page1",
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
                    id: "page2",
                    entry: []
                }
            });
            
            const client = new FhirClient(mockUrl);

            const bundle = await client.fhirRequest<Bundle>("/Patient")

            const results: any[] = [];
            
            for await (const page of client.pages(bundle)) {
                results.push(page.id);
            }

            expect(results).to.equal(["page1", "page2"]);
        })
    })

    describe("resolveReferences", () => {
        it ("on single resource", async () => {
            const client = new FhirClient(mockUrl);

            const resource: any = {
                resourceType: "Patient",
                id: "id",
                ref1: {
                    reference: "whatever"
                }
            };

            const reference: any = {
                resourceType: "Ref",
                id: "Ref-id"
            };

            mockServer.mock({
                headers: { "content-type": "application/json" },
                status: 200,
                body: reference
            });

            await client.resolveReferences(resource, ["ref1"])

            expect(resource).to.equal({
                resourceType: "Patient",
                id: "id",
                ref1: reference
            });
        });
    })

    describe("getReferences", () => {
        it ("on single resource", async () => {
            const client = new FhirClient(mockUrl);

            const resource: any = {
                resourceType: "Patient",
                id: "id",
                ref1: {
                    reference: "whatever"
                }
            };

            const reference: any = {
                resourceType: "Ref",
                id: "Ref-id"
            };

            mockServer.mock({
                headers: { "content-type": "application/json" },
                status: 200,
                body: reference
            });

            const result = await client.getReferences(resource, ["ref1"])

            expect(result).to.equal({ whatever: reference });
        });

        it ("on Bundle", async () => {
            const client = new FhirClient(mockUrl);

            const bundle: Bundle = {
                resourceType: "Bundle",
                type: "searchset",
                entry: [
                    {
                        resource: {
                            resourceType: "Patient",
                            id: "id1",
                            generalPractitioner: [{
                                reference: "doc1"
                            }]
                        }
                    },
                    {
                        resource: {
                            resourceType: "Patient",
                            id: "id2",
                            generalPractitioner: [{
                                reference: "doc1"
                            }]
                        }
                    },
                    {
                        resource: {
                            resourceType: "Patient",
                            id: "id3",
                            generalPractitioner: [{
                                reference: "doc2"
                            }]
                        }
                    }
                ]
            };

            const doc1: any = { resourceType: "Ref", id: "Ref-id-1" };
            const doc2: any = { resourceType: "Ref", id: "Ref-id-2" };

            mockServer.mock({
                headers: { "content-type": "application/json" },
                status: 200,
                body: doc1
            });

            mockServer.mock({
                headers: { "content-type": "application/json" },
                status: 200,
                body: doc2
            });

            const result = await client.getReferences(bundle, ["generalPractitioner"])

            // NOTE: The bundle has 3 references but two of them reference the
            // same resource. Verify that we have only gotten the two unique ones
            expect(result).to.equal({
                doc1: doc1,
                doc2: doc2
            });
        });
    })

    describe("fhirRequest", () => {

        it("rejects if no url is provided", async () => {
            const client = new FhirClient("http://localhost");
            // @ts-ignore
            await expect(client.fhirRequest()).to.reject();
        });

        it ("can fetch single resource", async () => {
            mockServer.mock({
                headers: { "content-type": "application/json" },
                status: 200,
                body: { id: "patient-id" }
            });

            const client = new FhirClient(mockUrl);
            const result = await client.fhirRequest("/Patient/patient-id");
            expect(result).to.include({ id: "patient-id" });
        });

        it ("works with URL", async () => {
            mockServer.mock({
                headers: { "content-type": "application/json" },
                status: 200,
                body: { id: "patient-id" }
            });
            const client = new FhirClient(mockUrl);
            const result = await client.fhirRequest(new URL("/Patient/patient-id", mockUrl));
            expect(result).to.include({ id: "patient-id" });
        });

        it ("resolve with falsy value if one is received", async () => {
            mockServer.mock({
                headers: { "content-type": "application/json" },
                status: 200,
                body: ""
            });
            const client = new FhirClient(mockUrl);
            const result = await client.fhirRequest("Patient");
            expect(result).to.equal("");
        });

        it ("can fetch a bundle", async () => {
            mockServer.mock({
                headers: { "content-type": "application/json" },
                status: 200,
                body: { resourceType: "Bundle", entry: [] }
            });
            const client = new FhirClient(mockUrl);
            const result = await client.fhirRequest("/Patient");
            expect(result).to.include({ resourceType: "Bundle" });
            expect(result).to.include("entry");
        });

        it ("can use custom cache map", async () => {
            const cache = new Map()

            mockServer.mock({
                headers: { "content-type": "application/json" },
                status: 200,
                body: { resourceType: "Bundle", entry: [] }
            });

            const client = new FhirClient(mockUrl);

            // mocks are one-time use. If we request the same URL twice but only
            // have one mock, the second request will fail. However, if cache is
            // used (and if we use the same cache for both requests), the second
            // request will not even be sent.
            await client.fhirRequest("/Patient", { cacheMap: cache });
            await client.fhirRequest("/Patient", { cacheMap: cache });
        })

        it ("can resolve refs on single resource", async () => {
            const client = new FhirClient(mockUrl);

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

            const result = await client.fhirRequest("/Patient/id");

            await client.resolveReferences(result, ["ref1"])

            expect(result).to.equal({
                resourceType: "Patient",
                id: "id",
                ref1: {
                    resourceType: "Ref",
                    id: "Ref-id"
                }
            });
        });

        it ("can resolve refs on pages", async () => {
            const client = new FhirClient(mockUrl);

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

            const pages: any[] = []
            for await(const page of client.pages("/Patient")) {
                await client.resolveReferences(page, ["ref1"])
                pages.push(page)
            }

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

    it ("create", async () => {
        const client = new FhirClient(mockUrl);

        const orig = client.fhirRequest

        try {
            const resource = { resourceType: "Patient" };

            let result: any;

            // Passing the includeResponse option ------------------------------
            mockServer.mock({
                status: 200,
                body: resource,
                headers: { "content-type": "application/json" }
            });
            result = await client.create(resource, { includeResponse: true });

            expect(result.body).to.equal(resource);
            expect(result.response.status).to.equal(200);

            // @ts-ignore
            client.fhirRequest = async (...args: any[]) => args;

            // Standard usage --------------------------------------------------
            result = await client.create(resource);
            expect(result).to.equal([
                "Patient",
                {
                    method : "POST",
                    body   : JSON.stringify(resource),
                    headers: {
                        "content-type": "application/json"
                    }
                }
            ]);

            // Passing options -------------------------------------------------
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
            expect(result).to.equal(["Patient", {
                url    : "a",
                method : "POST",
                body   : JSON.stringify(resource),
                signal : "whatever",
                headers: {
                    "x-custom": "value",
                    "content-type": "application/fhir+json"
                }
            }]);

            // Passing options but no headers ----------------------------------
            result = await client.create(resource, {
                method: "b",
                body  : "c",
                // @ts-ignore
                signal: "whatever"
            });
            expect(result).to.equal(["Patient", {
                method : "POST",
                body   : JSON.stringify(resource),
                signal : "whatever",
                headers: {
                    "content-type": "application/json"
                }
            }]);
        } finally {
            client.fhirRequest = orig
        }
    });

    it ("update", async () => {
        const client = new FhirClient(mockUrl);

        const orig = client.fhirRequest

        try {
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

            // @ts-ignore
            client.fhirRequest = async (...args: any[]) => args;

            // Standard usage --------------------------------------------------
            result = await client.update(resource);
            expect(result).to.equal(["Patient/2", {
                method : "PUT",
                body   : JSON.stringify(resource),
                headers: {
                    "content-type": "application/json",
                }
            }]);

            // Passing options -------------------------------------------------
            result = await client.update(resource, {
                method: "b",
                body  : "c",
                // @ts-ignore
                signal: "whatever",
                headers: {
                    "x-custom": "value",
                    "content-type": "application/fhir+json"
                }
            });
            expect(result).to.equal(["Patient/2", {
                method : "PUT",
                body   : JSON.stringify(resource),
                signal : "whatever",
                headers: {
                    "x-custom": "value",
                    "content-type": "application/fhir+json"
                }
            }]);

            // Passing options but no headers ----------------------------------
            result = await client.update(resource, {
                method: "b",
                body  : "c",
                // @ts-ignore
                signal: "whatever"
            });
            expect(result).to.equal(["Patient/2", {
                method : "PUT",
                body   : JSON.stringify(resource),
                signal: "whatever",
                headers: {
                    "content-type": "application/json"
                }
            }]);
        } finally {
            client.fhirRequest = orig
        }
    });

    it ("update with text body and includeResponse = true", async () => {
        const client = new FhirClient(mockUrl);

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
        const client = new FhirClient(mockUrl);

        mockServer.mock({
            status: 200,
            body: "text",
            headers: { "content-type": "text/plain" }
        });
        
        let result: any = await client.update({});
        expect(result).to.equal("text");
    })

    it ("update with empty body and includeResponse = true", async () => {
        const client = new FhirClient(mockUrl);
        
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
        const client = new FhirClient(mockUrl);
        
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
        const client = new FhirClient(mockUrl);
        
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

    it ("delete", async () => {
        const client = new FhirClient(mockUrl);
        
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

        const orig = client.fhirRequest

        try {

            // @ts-ignore
            client.fhirRequest = async (...args: any[]) => args;

            // Standard usage --------------------------------------------------
            result = await client.delete("Patient/2");
            expect(result).to.equal(["Patient/2", { method: "DELETE" }]);

            // Verify that method cannot be overridden -------------------------
            result = await client.delete("Patient/2", {
                method: "y",
                cache: "default"
            });
            expect(result).to.equal(["Patient/2", {
                method: "DELETE",
                cache: "default"
            }]);

            // Verify that abort signal is passed through ----------------------
            result = await client.delete("Patient/2", {
                // @ts-ignore
                signal: "whatever"
            });
            expect(result).to.equal(["Patient/2", {
                method: "DELETE",
                signal: "whatever"
            }]);
        } finally {
            client.fhirRequest = orig
        }
    });

    it ("patch", async () => {
        const client = new FhirClient(mockUrl);
        
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

        const orig = client.fhirRequest

        try {

            // @ts-ignore
            client.fhirRequest = async (...args: any[]) => args;

            // Standard usage --------------------------------------------------
            result = await client.patch("Patient/2", [{ op: "remove", path: "/x" }]);
            expect(result).to.equal(["Patient/2", {
                method: "PATCH",
                body: '[{"op":"remove","path":"/x"}]',
                headers: {
                    "prefer": "return=presentation",
                    "content-type": "application/json-patch+json; charset=UTF-8"
                }
            }]);

            // Test what can be overridden -------------------------------------
            result = await client.patch("Patient/2", [{ op: "remove", path: "/x" }], {
                method: "y",
                // @ts-ignore
                other : 3,
                headers: {
                    prefer: "test",
                    z: "22"
                }
            });
            expect(result).to.equal(["Patient/2", {
                method: "PATCH",
                body: '[{"op":"remove","path":"/x"}]',
                other: 3,
                headers: {
                    "prefer": "test",
                    "content-type": "application/json-patch+json; charset=UTF-8",
                    "z": "22"
                }
            }]);

            // Verify that abort signal is passed through ----------------------
            result = await client.patch("Patient/2", [{ op: "remove", path: "/x" }], {
                // @ts-ignore
                signal: "whatever"
            });
            expect(result[1]).to.include({ signal: "whatever" });

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
        } finally {
            client.fhirRequest = orig
        }
    });

    it ("getFhirVersion", async () => {
        const client = new FhirClient(mockUrl);

        // Mock the conformance statement
        mockServer.mock({
            headers: { "content-type": "application/json" },
            status: 200,
            body: { fhirVersion: "1.2.3" }
        });

        const version = await client.getFhirVersion();
        expect(version).to.equal("1.2.3");
    });

    it ("getFhirRelease", async () => {
        const client = new FhirClient(mockUrl);

        // Mock the conformance statement
        mockServer.mock({
            headers: { "content-type": "application/json" },
            status: 200,
            body: { fhirVersion: "3.3.0" }
        });

        const version = await client.getFhirRelease();
        expect(version).to.equal(4);
    });

    it ("getFhirRelease returns 0 for unknown versions", async () => {
        const client = new FhirClient(mockUrl);

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
