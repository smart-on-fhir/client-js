const chai           = require("chai");
const express        = require("express");
const jose           = require('jose');
const cors           = require("cors");
const mockServer     = require("../mocks/mockServer2");
const chaiAsPromised = require("chai-as-promised");
// const { default: fetch } = require("cross-fetch");
const path = require("path");

chai.use(chaiAsPromised);
chai.should();

const { expect } = chai;

/**
 * NOTE: These variables are NOT used! They are only declared here to avoid lint
 * warnings. Instead, they should exist within the tested window scope at runtime
 * @type {any}
 */
let FHIR, SMART_CLIENT, PRIVATE_KEY;



const KEY_SET_URL    = "https://client.example.org/.well-known/jwks.json"
const CLIENT_ID      = "my_web_app"
const PATIENT_ID     = "b2536dd3-bccd-4d22-8355-ab20acdf240b"
const ENCOUNTER_ID   = "e3ec2d15-4c27-4607-a45c-2f84962b0700"
const USER_ID        = "smart-Practitioner-71482713"
const USER_TYPE      = "Practitioner"





function navigate(url) {
    return new Promise((resolve, reject) => {
        browser.url(url, result => {
            // @ts-ignore
            result.error ? reject(result.error) : resolve(result.value)
        });
    })
}

function execute(fn, ...args) {
    return new Promise((resolve, reject) => {
        browser.execute(fn, args, result => {
            // @ts-ignore
            result.error ? reject(result.error) : resolve(result.value)
        });
    })
}

function executeAsync(fn, ...args) {
    return new Promise(resolve => {
        browser.executeAsyncScript(fn, args, resolve);
    }).then(result => {
        if (!result) {
            throw new Error(`Calling ${fn} returned no result`)
        }
        
        if (result.value?.error) {
            throw new Error(result.value.error + "")
        }

        return result.value
    });
}

async function assertThrows(fn, e) {
    try {
        await fn();
    } catch (ex) {
        if (typeof e == "string") {
            expect(ex.toString(), "Invalid error message").to.contain(e)
        } else if (e && e instanceof RegExp) {
            expect(ex.toString(), "Invalid error message").to.match(e)
        }
        return
    }

    throw new Error("Did not throw")
}

function generateTokenResponse(state = {}) {
    const resp = {
        "need_patient_banner": true,
        "smart_style_url": "https://launch.smarthealthit.org/smart-style.json",
        "patient": PATIENT_ID,
        "encounter": ENCOUNTER_ID,
        "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJjb250ZXh0Ijp7Im5lZWRfcGF0aWVudF9iYW5uZXIiOnRydWUsInNtYXJ0X3N0eWxlX3VybCI6I" +
            "mh0dHBzOi8vbGF1bmNoLnNtYXJ0aGVhbHRoaXQub3JnL3NtYXJ0LXN0eWxlLmpzb24iLCJwYXRpZW50IjoiYjI1MzZkZDMtYmNjZC00ZDIyLTgzNTUtYWIyMGFjZGYy" +
            "NDBiIiwiZW5jb3VudGVyIjoiZTNlYzJkMTUtNGMyNy00NjA3LWE0NWMtMmY4NDk2MmIwNzAwIn0sImNsaWVudF9pZCI6Im15X3dlYl9hcHAiLCJzY29wZSI6Im9wZW5" +
            "pZCBmaGlyVXNlciBvZmZsaW5lX2FjY2VzcyB1c2VyLyouKiBwYXRpZW50LyouKiBsYXVuY2gvZW5jb3VudGVyIGxhdW5jaC9wYXRpZW50IHByb2ZpbGUiLCJ1c2VyIj" +
            "oiUHJhY3RpdGlvbmVyL3NtYXJ0LVByYWN0aXRpb25lci03MTQ4MjcxMyIsImlhdCI6MTU1OTEzODkxMywiZXhwIjoxNTkwNjc0OTE0fQ.-Ey7wdFSlmfoQrm7HNxAgJ" +
            "QBJPKdtfH7kL1Z91L60_8",
        "token_type": "bearer",
        "scope": "openid fhirUser offline_access user/*.* patient/*.* launch/encounter launch/patient profile",
        "client_id": CLIENT_ID,
        "expires_in": 3600,
        "id_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJwcm9maWxlIjoiUHJhY3RpdGlvbmVyL3NtYXJ0LVByYWN0aXRpb25lci03MTQ4MjcxMyIsImZoaXJVc2" +
            "VyIjoiUHJhY3RpdGlvbmVyL3NtYXJ0LVByYWN0aXRpb25lci03MTQ4MjcxMyIsImF1ZCI6Im15X3dlYl9hcHAiLCJzdWIiOiJkYjIzZDBkZTI1Njc4ZTY3MDk5YmM0M" +
            "zQzMjNkYzBkOTY1MTNiNTUyMmQ0Yjc0MWNiYTM5ZjdjOTJkMGM0NmFlIiwiaXNzIjoiaHR0cDovL2xhdW5jaC5zbWFydGhlYWx0aGl0Lm9yZyIsImlhdCI6MTU1OTEz" +
            "ODkxNCwiZXhwIjoxNTU5MTQyNTE0fQ.OtbIcs5nyEKaD2kAPasm1DYFixHvVbkC1wQys3oa3T-4Tf8wxW56hzUK0ZQeOK_gEIxiSFn9tLoUvKau_M1WRVD11FPyulvs" +
            "1Q8EbG5PQ83MBudcpZQJ_uuFbVcGsDMy2xEa_8jAHkHPAVNjj8FRsQCRZC0Hfg0NbXli3yOhAFK1LqTUcrnjfwD-sak0UGQS1H6OgILnTYLrlTTIonfnWRdpWJjjIh3" +
            "_GCk5k-8LU8AARaPcSE3ZhezoKTSfwQn1XO101g5h337pZleaIlFlhxPRFSKtpXz7BEezkUi5CJqN4d2qNoBK9kapljFYEVdPjRqaBnt4blmyFRXjhdMNwA",
        "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJuZWVkX3BhdGllbnRfYmFubmVyIjp0cnVlLCJzbWFydF9zdHlsZV91cmwiOiJodHRwczovL2xhdW" +
            "5jaC5zbWFydGhlYWx0aGl0Lm9yZy9zbWFydC1zdHlsZS5qc29uIiwicGF0aWVudCI6ImIyNTM2ZGQzLWJjY2QtNGQyMi04MzU1LWFiMjBhY2RmMjQwYiIsImVuY291b" +
            "nRlciI6ImUzZWMyZDE1LTRjMjctNDYwNy1hNDVjLTJmODQ5NjJiMDcwMCIsInJlZnJlc2hfdG9rZW4iOiJleUowZVhBaU9pSktWMVFpTENKaGJHY2lPaUpJVXpJMU5p" +
            "SjkuZXlKamIyNTBaWGgwSWpwN0ltNWxaV1JmY0dGMGFXVnVkRjlpWVc1dVpYSWlPblJ5ZFdVc0luTnRZWEowWDNOMGVXeGxYM1Z5YkNJNkltaDBkSEJ6T2k4dmJHRjF" +
            "ibU5vTG5OdFlYSjBhR1ZoYkhSb2FYUXViM0puTDNOdFlYSjBMWE4wZVd4bExtcHpiMjRpTENKd1lYUnBaVzUwSWpvaVlqSTFNelprWkRNdFltTmpaQzAwWkRJeUxUZ3" +
            "pOVFV0WVdJeU1HRmpaR1l5TkRCaUlpd2laVzVqYjNWdWRHVnlJam9pWlRObFl6SmtNVFV0TkdNeU55MDBOakEzTFdFME5XTXRNbVk0TkRrMk1tSXdOekF3SW4wc0ltT" +
            "nNhV1Z1ZEY5cFpDSTZJbTE1WDNkbFlsOWhjSEFpTENKelkyOXdaU0k2SW05d1pXNXBaQ0JtYUdseVZYTmxjaUJ2Wm1ac2FXNWxYMkZqWTJWemN5QjFjMlZ5THlvdUtp" +
            "QndZWFJwWlc1MEx5b3VLaUJzWVhWdVkyZ3ZaVzVqYjNWdWRHVnlJR3hoZFc1amFDOXdZWFJwWlc1MElIQnliMlpwYkdVaUxDSjFjMlZ5SWpvaVVISmhZM1JwZEdsdmJ" +
            "tVnlMM050WVhKMExWQnlZV04wYVhScGIyNWxjaTAzTVRRNE1qY3hNeUlzSW1saGRDSTZNVFUxT1RFek9Ea3hNeXdpWlhod0lqb3hOVGt3TmpjME9URTBmUS4tRXk3d2" +
            "RGU2xtZm9Rcm03SE54QWdKUUJKUEtkdGZIN2tMMVo5MUw2MF84IiwidG9rZW5fdHlwZSI6ImJlYXJlciIsInNjb3BlIjoib3BlbmlkIGZoaXJVc2VyIG9mZmxpbmVfY" +
            "WNjZXNzIHVzZXIvKi4qIHBhdGllbnQvKi4qIGxhdW5jaC9lbmNvdW50ZXIgbGF1bmNoL3BhdGllbnQgcHJvZmlsZSIsImNsaWVudF9pZCI6Im15X3dlYl9hcHAiLCJl" +
            "eHBpcmVzX2luIjozNjAwLCJpZF90b2tlbiI6ImV5SjBlWEFpT2lKS1YxUWlMQ0poYkdjaU9pSlNVekkxTmlKOS5leUp3Y205bWFXeGxJam9pVUhKaFkzUnBkR2x2Ym1" +
            "WeUwzTnRZWEowTFZCeVlXTjBhWFJwYjI1bGNpMDNNVFE0TWpjeE15SXNJbVpvYVhKVmMyVnlJam9pVUhKaFkzUnBkR2x2Ym1WeUwzTnRZWEowTFZCeVlXTjBhWFJwYj" +
            "I1bGNpMDNNVFE0TWpjeE15SXNJbUYxWkNJNkltMTVYM2RsWWw5aGNIQWlMQ0p6ZFdJaU9pSmtZakl6WkRCa1pUSTFOamM0WlRZM01EazVZbU0wTXpRek1qTmtZekJrT" +
            "1RZMU1UTmlOVFV5TW1RMFlqYzBNV05pWVRNNVpqZGpPVEprTUdNME5tRmxJaXdpYVhOeklqb2lhSFIwY0RvdkwyeGhkVzVqYUM1emJXRnlkR2hsWVd4MGFHbDBMbTl5" +
            "WnlJc0ltbGhkQ0k2TVRVMU9URXpPRGt4TkN3aVpYaHdJam94TlRVNU1UUXlOVEUwZlEuT3RiSWNzNW55RUthRDJrQVBhc20xRFlGaXhIdlZia0Mxd1F5czNvYTNULTR" +
            "UZjh3eFc1Nmh6VUswWlFlT0tfZ0VJeGlTRm45dExvVXZLYXVfTTFXUlZEMTFGUHl1bHZzMVE4RWJHNVBRODNNQnVkY3BaUUpfdXVGYlZjR3NETXkyeEVhXzhqQUhrSF" +
            "BBVk5qajhGUnNRQ1JaQzBIZmcwTmJYbGkzeU9oQUZLMUxxVFVjcm5qZndELXNhazBVR1FTMUg2T2dJTG5UWUxybFRUSW9uZm5XUmRwV0pqakloM19HQ2s1ay04TFU4Q" +
            "UFSYVBjU0UzWmhlem9LVFNmd1FuMVhPMTAxZzVoMzM3cFpsZWFJbEZsaHhQUkZTS3RwWHo3QkVlemtVaTVDSnFONGQycU5vQks5a2FwbGpGWUVWZFBqUnFhQm50NGJs" +
            "bXlGUlhqaGRNTndBIiwiaWF0IjoxNTU5MTM4OTE0LCJleHAiOjE1NTkxNDI1MTR9.lhfmhXYfoaI4QcJYvFnr2FMn_RHO8aXSzzkXzwNpc7w",
        "code": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJjb250ZXh0Ijp7Im5lZWRfcGF0aWVudF9iYW5uZXIiOnRydWUsInNtYXJ0X3N0eWxlX3VybCI6Imh0dHBzOi" +
            "8vbGF1bmNoLnNtYXJ0aGVhbHRoaXQub3JnL3NtYXJ0LXN0eWxlLmpzb24iLCJwYXRpZW50IjoiYjI1MzZkZDMtYmNjZC00ZDIyLTgzNTUtYWIyMGFjZGYyNDBiIiwiZ" +
            "W5jb3VudGVyIjoiZTNlYzJkMTUtNGMyNy00NjA3LWE0NWMtMmY4NDk2MmIwNzAwIn0sImNsaWVudF9pZCI6Im15X3dlYl9hcHAiLCJzY29wZSI6Im9wZW5pZCBmaGly" +
            "VXNlciBvZmZsaW5lX2FjY2VzcyB1c2VyLyouKiBwYXRpZW50LyouKiBsYXVuY2gvZW5jb3VudGVyIGxhdW5jaC9wYXRpZW50IHByb2ZpbGUiLCJ1c2VyIjoiUHJhY3R" +
            "pdGlvbmVyL3NtYXJ0LVByYWN0aXRpb25lci03MTQ4MjcxMyIsImlhdCI6MTU1OTEzODkxMywiZXhwIjoxNTU5MTM5MjEzfQ.G2dLcSnjpwM_joWTxWLfL48vhdlj3zG" +
            "V9Os5cKREYcY",
        state
    };


    return resp
}

async function startFileServer(context) {
    return new Promise(resolve => {
        const app = express();
        app.use(cors());
        app.use((req, res, next) => {
            res.set({
                "cache-control": "no-cache, no-store, must-revalidate",
                "pragma"       : "no-cache",
                "expires"      : "0"
            });
            next();
        });
        app.use("/", express.static(
            process.env.GITHUB_WORKSPACE || path.resolve(__dirname, "../../")
        ));

        context.fileServer = app.listen(0, "127.0.0.1", () => {
            const address = context.fileServer.address()
            context.FILE_SERVER_BASE_URL = "http://127.0.0.1:" + address.port
            context.LAUNCH_URL   = context.FILE_SERVER_BASE_URL + "/test/specs/launch.html"
            context.REDIRECT_URL = context.FILE_SERVER_BASE_URL + "/test/specs/"
            console.log("File server listening on " + context.FILE_SERVER_BASE_URL);
            resolve(context);
        })
    })
}

async function stopFileServer(context) {
    return new Promise((resolve, reject) => {
        if (context.fileServer && context.fileServer.listening) {
            context.fileServer.close((error) => {
                if (error) {
                    console.log("Error shutting down the file server: ", error);
                    reject(error)
                } else {
                    resolve(context);
                }
            });
        } else {
            resolve(context);
        }
    })
}

async function startMockServer(context) {
    return new Promise(resolve => {
        context.mockDataServer = mockServer.listen(context.mockDataServer, "127.0.0.1", () => {
            context.MOCK_PORT = context.mockDataServer.address().port
            context.MOCK_BASE_URL  = "http://127.0.0.1:" + context.MOCK_PORT
            context.FHIR_URL       = `${context.MOCK_BASE_URL}/fhir/`
            context.AUTHORIZE_URL  = `${context.MOCK_BASE_URL}/auth/authorize`
            context.TOKEN_URL      = `${context.MOCK_BASE_URL}/auth/token`
            context.INTROSPECT_URL = `${context.MOCK_BASE_URL}/auth/introspect`
            context.REGISTER_URL   = `${context.MOCK_BASE_URL}/auth/register`
            console.log("Mock server listening on " + context.MOCK_BASE_URL)
            resolve(context);
        })
    });
}

async function stopMockServer(context) {
    return new Promise((resolve, reject) => {
        if (context.mockDataServer && context.mockDataServer.listening) {
            context.mockDataServer.close((error) => {
                if (error) {
                    console.log("Error shutting down the mock server: ", error);
                    reject(error)
                } else {
                    resolve(context);
                }
            });
        } else {
            resolve(context);
        }
    })
}

function mockWellKnownJson(context) {
    return {
        registration_endpoint : context.REGISTER_URL,
        authorization_endpoint: context.AUTHORIZE_URL,
        token_endpoint        : context.TOKEN_URL,
        
        // For PKCE
        code_challenge_methods_supported: ["S256"],
        
        // Advertise support for SMART Confidential Clients with Asymmetric Keys
        token_endpoint_auth_methods_supported: ["private_key_jwt"],
        token_endpoint_auth_signing_alg_values_supported: ["RS384", "ES384"],
        
        scopes_supported: [
            "system/*.rs" // For asymmetric auth
        ]
    };
}

function mockCapabilityStatement(context) {
    return {
        resourceType: "CapabilityStatement",
        rest: [
            {
                mode: "server",
                security: {
                    extension: [
                        {
                            url: "http://fhir-registry.smarthealthit.org/StructureDefinition/oauth-uris",
                            extension: [
                                {
                                    url: "authorize",
                                    valueUri: context.AUTHORIZE_URL
                                },
                                {
                                    url: "token",
                                    valueUri: context.TOKEN_URL
                                },
                                {
                                    url: "introspect",
                                    valueUri: context.INTROSPECT_URL
                                }
                            ]
                        }
                    ]
                },
                resource: []
            }
        ]
    };
}

describe("authorization", () => {

    const ctx = {};

    let MOCK_WELL_KNOWN_JSON, MOCK_CAPABILITY_STATEMENT;

    before(async () => {
        await startFileServer(ctx)
        await startMockServer(ctx)

        MOCK_WELL_KNOWN_JSON = mockWellKnownJson(ctx)
        MOCK_CAPABILITY_STATEMENT = mockCapabilityStatement(ctx)
    });
    
    after(async () => {
        await browser.end()
        await stopFileServer(ctx)
        await stopMockServer(ctx)
    });
    
    beforeEach(async () => mockServer.clear());

    

    /**
     * 
     * @param {import("../../src/types").fhirclient.AuthorizeParams} authorizeParams 
     * @param {*} wellKnownJson 
     * @param {*} capabilityStatement 
     * @returns 
     */
    async function authorize(
        authorizeParams,
        wellKnownJson = MOCK_WELL_KNOWN_JSON,
        capabilityStatement = MOCK_CAPABILITY_STATEMENT
    ) {
        
        // Open the browser (Ignores url params!!!) ----------------------------
        await navigate(ctx.LAUNCH_URL)
        await execute(
            `history.replaceState(null, "", "${ctx.LAUNCH_URL}?launch=123&iss=${
            encodeURIComponent(ctx.FHIR_URL)}")`
        );

        // Mock .well-known/smart-configuration --------------------------------
        let mockWellKnownJson;
        if (wellKnownJson) {
            mockWellKnownJson = mockServer.mock("/fhir/.well-known/smart-configuration", {
                body: wellKnownJson,
                status: 200,
                headers: {
                    "content-type" : "application/json",
                    "cache-control": "no-cache, no-store, must-revalidate",
                    "pragma"       : "no-cache",
                    "expires"      : "0"
                }
            });
        }
        
        // Mock the metadata request -------------------------------------------
        let mockCapabilityStatement;
        if (capabilityStatement) {
            mockCapabilityStatement = mockServer.mock("/fhir/metadata", {
                body: capabilityStatement,
                status: 200,
                headers: {
                    "content-type" : "application/json",
                    "cache-control": "no-cache, no-store, must-revalidate",
                    "pragma"       : "no-cache",
                    "expires"      : "0"
                }
            })
        }

        // Inject our authorize call into the page -----------------------------
        /** @type {any} */
        const result = await executeAsync(function(authorizeParams, done) {
            FHIR.oauth2.authorize({ ...authorizeParams, noRedirect: true }).then(
                function(url) { done(url) },
                function(err) { done({ error: err.toString() }) }
            );
        }, authorizeParams);

        // Verify that .well-known/smart-configuration has been requested ------
        if (mockWellKnownJson) {
            expect(
                mockWellKnownJson._request?.url,
                "/fhir/.well-known/smart-configuration should have been requested"
            ).to.equal("/fhir/.well-known/smart-configuration");
            expect(
                mockWellKnownJson._response.statusCode,
                "/fhir/.well-known/smart-configuration should reply with status 200"
            ).to.equal(200);
        }

        // Verify that metadata has been requested (if needed) -----------------
        if (!wellKnownJson && capabilityStatement) {
            expect(
                mockCapabilityStatement._request?.url,
                "/fhir/metadata should be requested"
            ).to.equal("/fhir/metadata");
            expect(
                mockCapabilityStatement._response.statusCode,
                "/fhir/metadata should reply with status 200"
            ).to.equal(200);
        }

        // Return the URL to run assertions on it ------------------------------
        const url = new URL(result);

        expect(url.searchParams.get("response_type"), "The redirect url should contain 'response_type=code'").to.equal("code")
        expect(url.searchParams.get("scope"), "The redirect url should contain 'launch' in its scope parameter").to.contain("launch")
        expect(url.searchParams.get("redirect_uri"), "The redirect url contains invalid redirect_uri parameter").to.equal(ctx.REDIRECT_URL)
        expect(url.searchParams.get("aud"), "The redirect url contains invalid aud parameter").to.equal(ctx.FHIR_URL)
        expect(url.searchParams.get("state"), "The redirect url must contains a state parameter ").to.exist
        expect(url.searchParams.get("launch"), "The redirect url contains invalid launch parameter").to.equal("123")

        return url
    }

    async function ready(stateID, options = {}) {
        const result = await executeAsync(function(options, done) {
            FHIR.oauth2.ready(options).then(
                function(client) {
                    SMART_CLIENT = client;
                    done(client.state );
                },
                function(e) {
                    done({ error: e + "" });
                }
            );
        }, options);
    
        // console.log("result:", result)
    
        expect(result, "FHIR.oauth2.ready should resolve with valid client instance").to.exist
    
        if (result.error) {
            throw new Error(result.error.replace(/^Error: /, ""))
        }
    
        expect(await browser.getCurrentUrl(), "the browser url should be replaced").to.equal(ctx.REDIRECT_URL);
    
        const state = await execute(function(stateID) {
            return JSON.parse(sessionStorage.getItem(stateID) || "null");
        }, stateID);
    
        expect(state, `State should exist in sessionStorage["${stateID}"]`).not.to.equal(null);
    
        expect(
            await execute(function() { return SMART_CLIENT?.getPatientId(); }),
            `client.getPatientId() should return "${PATIENT_ID}"`
        ).to.equal(PATIENT_ID);
    
        expect(
            await execute(function() { return SMART_CLIENT?.getEncounterId(); }),
            `client.getEncounterId() should return "${ENCOUNTER_ID}"`
        ).to.equal(ENCOUNTER_ID);
    
        expect(
            await execute(function() { return SMART_CLIENT?.getUserId(); }),
            `client.getUserId() should return "${USER_ID}"`
        ).to.equal(USER_ID);
    
        expect(
            await execute(function() { return SMART_CLIENT?.getUserType(); }),
            `client.getUserType() should return "${USER_TYPE}"`
        ).to.equal(USER_TYPE);
    
        return state
    }
    
    // pkceMode = 'disabled' ---------------------------------------------------

    it("using pkceMode = 'disabled' does not include code_challenge, even if the server supports S256", async () => {
        const redirectUrl = await authorize({
            client_id: CLIENT_ID,
            scope    : "patient/*.rs",
            pkceMode : "disabled"
        });
        expect(redirectUrl.searchParams.get("code_challenge"), "The redirect url should NOT have a code_challenge parameter").not.to.exist;
        expect(redirectUrl.searchParams.get("code_challenge_method"), "The redirect url should NOT have a code_challenge_method parameter").not.to.exist;
    });

    it("using pkceMode = 'disabled' does not include code_challenge if server does not declare S256 support", async () => {
        const redirectUrl = await authorize({
            client_id: CLIENT_ID,
            scope    : "patient/*.rs",
            pkceMode : "disabled"
        }, { ...MOCK_WELL_KNOWN_JSON, code_challenge_methods_supported: [] });
        expect(redirectUrl.searchParams.get("code_challenge"), "The redirect url should NOT have a code_challenge parameter").not.to.exist;
        expect(redirectUrl.searchParams.get("code_challenge_method"), "The redirect url should NOT have a code_challenge_method parameter").not.to.exist;
    });

    it("using pkceMode = 'disabled' does not include code_challenge if server does not have a well-known statement", async () => {
        const redirectUrl = await authorize({
            client_id: CLIENT_ID,
            scope    : "patient/*.rs",
            pkceMode : "disabled"
        }, null);
        expect(redirectUrl.searchParams.get("code_challenge"), "The redirect url should NOT have a code_challenge parameter").not.to.exist;
        expect(redirectUrl.searchParams.get("code_challenge_method"), "The redirect url should NOT have a code_challenge_method parameter").not.to.exist;
    });

    // pkceMode = 'disabled' ---------------------------------------------------

    it("using pkceMode = 'disabled' does not include code_challenge, even if the server supports S256", async () => {
        const redirectUrl = await authorize({
            client_id: CLIENT_ID,
            scope    : "patient/*.rs",
            pkceMode : "disabled"
        });
        expect(redirectUrl.searchParams.get("code_challenge"), "The redirect url should NOT have a code_challenge parameter").not.to.exist;
        expect(redirectUrl.searchParams.get("code_challenge_method"), "The redirect url should NOT have a code_challenge_method parameter").not.to.exist;
    });

    it("using pkceMode = 'disabled' does not include code_challenge if server does not declare S256 support", async () => {
        const redirectUrl = await authorize({
            client_id: CLIENT_ID,
            scope    : "patient/*.rs",
            pkceMode : "disabled"
        }, { ...MOCK_WELL_KNOWN_JSON, code_challenge_methods_supported: [] });
        expect(redirectUrl.searchParams.get("code_challenge"), "The redirect url should NOT have a code_challenge parameter").not.to.exist;
        expect(redirectUrl.searchParams.get("code_challenge_method"), "The redirect url should NOT have a code_challenge_method parameter").not.to.exist;
    });

    it("using pkceMode = 'disabled' does not include code_challenge if server does not have a well-known statement", async () => {
        const redirectUrl = await authorize({
            client_id: CLIENT_ID,
            scope    : "patient/*.rs",
            pkceMode : "disabled"
        }, null);
        expect(redirectUrl.searchParams.get("code_challenge"), "The redirect url should NOT have a code_challenge parameter").not.to.exist;
        expect(redirectUrl.searchParams.get("code_challenge_method"), "The redirect url should NOT have a code_challenge_method parameter").not.to.exist;
    });

    // pkceMode = 'unsafeV1' ---------------------------------------------------

    it("using pkceMode = 'unsafeV1' includes code_challenge", async () => {
        const redirectUrl = await authorize({
            client_id: CLIENT_ID,
            scope    : "patient/*.rs",
            pkceMode : "unsafeV1"
        });
        expect(redirectUrl.searchParams.get("code_challenge"), "The redirect url should have a code_challenge parameter").to.exist;
        expect(redirectUrl.searchParams.get("code_challenge_method"), "The redirect url should include code_challenge_method parameter=S256").to.equal("S256");
    });

    it("using pkceMode = 'unsafeV1' includes code_challenge, even if the server does not advertise S256 support", async () => {
        const redirectUrl = await authorize({
            client_id: CLIENT_ID,
            scope    : "patient/*.rs",
            pkceMode : "unsafeV1"
        }, { ...MOCK_WELL_KNOWN_JSON, code_challenge_methods_supported: [] });
        expect(redirectUrl.searchParams.get("code_challenge"), "The redirect url should have a code_challenge parameter").to.exist;
        expect(redirectUrl.searchParams.get("code_challenge_method"), "The redirect url should include code_challenge_method parameter=S256").to.equal("S256");
    });

    it("using pkceMode = 'unsafeV1' includes code_challenge, even if the server does not have a well-known statement", async () => {
        const redirectUrl = await authorize({
            client_id: CLIENT_ID,
            scope    : "patient/*.rs",
            pkceMode : "unsafeV1"
        }, null);
        expect(redirectUrl.searchParams.get("code_challenge"), "The redirect url should have a code_challenge parameter").to.exist;
        expect(redirectUrl.searchParams.get("code_challenge_method"), "The redirect url should include code_challenge_method parameter=S256").to.equal("S256");
    });

    // pkceMode = 'required' ---------------------------------------------------
    
    it("using pkceMode = 'required' includes code_challenge", async () => {
        const redirectUrl = await authorize({
            client_id: CLIENT_ID,
            scope   : "patient/*.rs",
            pkceMode: "required"
        });
        expect(redirectUrl.searchParams.get("code_challenge"), "The redirect url should have a code_challenge parameter").to.exist;
        expect(redirectUrl.searchParams.get("code_challenge_method"), "The redirect url should include code_challenge_method parameter=S256").to.equal("S256");
    });

    it("using pkceMode = 'required' throws if the server does not declare S256 support", async () => {
        await assertThrows(async () => await authorize({
                client_id : CLIENT_ID,
                scope     : "patient/*.rs",
                pkceMode  : "required"
            }, { ...MOCK_WELL_KNOWN_JSON, code_challenge_methods_supported: [] }),
            /Required PKCE code challenge method \(`S256`\) was not found/
        );
    });

    it("using pkceMode = 'required' throws if the server does not have a well-known statement", async () => {
        await assertThrows(
            async () => await authorize({
                client_id : CLIENT_ID,
                scope     : "patient/*.rs",
                pkceMode  : "required"
            }, null),
            /Required PKCE code challenge method \(`S256`\) was not found/
        );
    });

    // pkceMode = 'ifSupported' ------------------------------------------------

    it("using pkceMode = 'ifSupported' includes code_challenge", async () => {
        const redirectUrl = await authorize({
            client_id: CLIENT_ID,
            scope    : "patient/*.rs",
            pkceMode : "ifSupported"
        });
        expect(redirectUrl.searchParams.get("code_challenge"), "The redirect url should have a code_challenge parameter").to.exist;
        expect(redirectUrl.searchParams.get("code_challenge_method"), "The redirect url should include code_challenge_method parameter=S256").to.equal("S256");
    });

    it("using pkceMode = 'ifSupported' does not include code_challenge if server does not declare S256 support", async () => {
        const redirectUrl = await authorize({
            client_id: CLIENT_ID,
            scope    : "patient/*.rs",
            pkceMode : "ifSupported"
        }, { ...MOCK_WELL_KNOWN_JSON, code_challenge_methods_supported: [] });
        expect(redirectUrl.searchParams.get("code_challenge"), "The redirect url should NOT have a code_challenge parameter").not.to.exist;
        expect(redirectUrl.searchParams.get("code_challenge_method"), "The redirect url should NOT have a code_challenge_method parameter").not.to.exist;
    });

    it("using pkceMode = 'ifSupported' does not include code_challenge if the server does not have a well-known statement", async () => {
        const redirectUrl = await authorize({
            client_id: CLIENT_ID,
            scope    : "patient/*.rs",
            pkceMode : "ifSupported"
        }, null);
        expect(redirectUrl.searchParams.get("code_challenge"), "The redirect url should NOT have a code_challenge parameter").not.to.exist;
        expect(redirectUrl.searchParams.get("code_challenge_method"), "The redirect url should NOT have a code_challenge_method parameter").not.to.exist;
    });
        
    it("authorize options - clientId", async () => {
        const redirectUrl = await authorize({
            clientId: CLIENT_ID,
            scope   : "patient/*.read"
        });
        expect(redirectUrl.searchParams.get("client_id"), `The redirect url should include client_id=${CLIENT_ID}`).to.equal(CLIENT_ID)
    });

    it("authorize options - client_id", async () => {
        const redirectUrl = await authorize({
            client_id: CLIENT_ID,
            scope    : "patient/*.read"
        });
        expect(redirectUrl.searchParams.get("client_id"), `The redirect url should include client_id=${CLIENT_ID}`).to.equal(CLIENT_ID)
    });

    it("authorize options - v2 scope", async () => {
        const redirectUrl = await authorize({
            client_id: CLIENT_ID,
            scope    : "patient/*.rs"
        });
        expect(redirectUrl.searchParams.get("scope"), `The redirect url should include patient/*.rs in its scope parameter`).to.contain("patient/*.rs")
    });

    it("authorize options - v1 scope", async () => {
        const redirectUrl = await authorize({
            client_id: CLIENT_ID,
            scope    : "patient/*.read"
        });
        expect(redirectUrl.searchParams.get("scope"), `The redirect url should include patient/*.read in its scope parameter`).to.contain("patient/*.read")
    });

    it("code flow", async () => {

        // launch --------------------------------------------------------------
        const redirectUrl = await authorize({
            client_id: CLIENT_ID,
            scope    : "patient/*.read"
        });

        // Get the state parameter from the URL --------------------------------
        const stateID = redirectUrl.searchParams.get("state");

        // Get the state object from sessionStorage ----------------------------
        /** @type {any} */
        const state = await execute(function(stateID) {
            return JSON.parse(sessionStorage.getItem(stateID) || "null");
        }, stateID);

        // Verify the state is properly initialized ----------------------------
        expect(state, `state should be stored at sessionStorage["${stateID}"]`).to.exist
        expect(state.authorizeUri, `state.authorizeUri should be "${ctx.AUTHORIZE_URL}"`).to.equal(ctx.AUTHORIZE_URL)
        expect(state.tokenUri, `state.tokenUri should be "${ctx.TOKEN_URL}"`).to.equal(ctx.TOKEN_URL)
        expect(state.redirectUri, `state.redirectUri should be "${ctx.REDIRECT_URL}"`).to.equal(ctx.REDIRECT_URL)
        expect(state.serverUrl, `state.serverUrl should be "${ctx.FHIR_URL}"`).to.equal(ctx.FHIR_URL)
        expect(state.registrationUri, `state.registrationUri should be "${ctx.REGISTER_URL}"`).to.equal(ctx.REGISTER_URL)
        expect(state.clientId, `state.clientId should be "${CLIENT_ID}"`).to.equal(CLIENT_ID)
        expect(state.scope, `state.scope should be "patient/*.read launch"`).to.equal("patient/*.read launch")
        expect(state.key, `state.key should be "${stateID}"`).to.equal(stateID)
        expect(state.tokenResponse, `state.tokenResponse should be initialized as an empty object`).to.deep.equal({})

        // Verify PKCE if supported --------------------------------------------
        if (MOCK_WELL_KNOWN_JSON.code_challenge_methods_supported.includes("S256")) {
            expect(state.codeChallengeMethods, "code_challenge_methods_supported should be set in state").to.deep.equal(MOCK_WELL_KNOWN_JSON.code_challenge_methods_supported)
            expect(state.codeChallenge, "codeChallenge should be set in state").to.exist
            expect(state.codeVerifier, "codeVerifier should be set in state").to.exist
        }

        // Redirect ------------------------------------------------------------
        await navigate(`${ctx.REDIRECT_URL}?code=123&state=${stateID}`);

        // Mock token response -------------------------------------------------
        mockServer.mock({ method: "post", path: "/auth/token" }, {
            body: generateTokenResponse(),
            status: 200,
            headers: {
                "content-type": "application/json"
            }
        })

        await ready(stateID)
    });

    ["ES384", "RS384"].forEach(alg => {
        it (alg + " asymmetric auth", async () => {

            const { publicKey, privateKey } = await jose.generateKeyPair(alg)

            const clientPrivateJwk = { ...await jose.exportJWK(privateKey), alg, key_ops: ["sign"] }
            const clientPublicJwk  = await jose.exportJWK(publicKey )

            // console.log(clientPrivateJwk, clientPublicJwk)
            
            const redirectUrl = await authorize({
                client_id: CLIENT_ID,
                scope    : "patient/*.read",
                clientPublicKeySetUrl: KEY_SET_URL,
                // @ts-ignore
                clientPrivateJwk
            });

            // Get the state parameter from the URL ----------------------------
            const stateID = redirectUrl.searchParams.get("state");

            // Get the state object from sessionStorage ------------------------
            /** @type {any} */
            const state = await execute(function(stateID) {
                return JSON.parse(sessionStorage.getItem(stateID) || "null");
            }, stateID);

            // Verify the state is properly initialized ------------------------
            expect(state, `state should be stored at sessionStorage["${stateID}"]`).to.exist;
            expect(state.authorizeUri, `state.authorizeUri should be "${ctx.AUTHORIZE_URL}"`).to.equal(ctx.AUTHORIZE_URL)
            expect(state.tokenUri, `state.tokenUri should be "${ctx.TOKEN_URL}"`).to.equal(ctx.TOKEN_URL)
            expect(state.redirectUri, `state.redirectUri should be "${ctx.REDIRECT_URL}"`).to.equal(ctx.REDIRECT_URL)
            expect(state.serverUrl, `state.serverUrl should be "${ctx.FHIR_URL}"`).to.equal(ctx.FHIR_URL)
            expect(state.registrationUri, `state.registrationUri should be "${ctx.REGISTER_URL}"`).to.equal(ctx.REGISTER_URL)
            expect(state.clientId, `state.clientId should be "${CLIENT_ID}"`).to.equal(CLIENT_ID)
            expect(state.scope, `state.scope should be "patient/*.read launch"`).to.equal("patient/*.read launch")
            expect(state.key, `state.key should be "${stateID}"`).to.equal(stateID)
            expect(state.tokenResponse, `state.tokenResponse should be initialized as an empty object`).to.deep.equal({})
            expect(state.clientPrivateJwk, `The clientPrivateJwk object should be stored in state`).to.deep.equal(clientPrivateJwk)
            expect(state.clientPublicKeySetUrl, `The clientPublicKeySetUrl should be stored in state`).to.equal(KEY_SET_URL)

            
            // Redirect --------------------------------------------------------
            await navigate(`${ctx.REDIRECT_URL}?code=123&state=${stateID}`);
            
            // Mock token response ---------------------------------------------
            const tokenMock = mockServer.mock({ path: "/auth/token", method: "post" }, {
                bodyParser: express.urlencoded({ extended: false }),
                async handler(req, res) {

                    const clientKey = await jose.importJWK(clientPublicJwk, alg);
                    
                    expect(req.body.client_assertion, "client_assertion should be sent in the POST body").to.exist;
                    expect(req.body.client_assertion_type, "proper client_assertion_type should be sent in the POST body").to.equal('urn:ietf:params:oauth:client-assertion-type:jwt-bearer');
                    expect(req.body.code, "proper code should be sent in the POST body").to.equal('123');
                    expect(req.body.grant_type, "proper grant_type should be sent in the POST body").to.equal('authorization_code');
                    expect(req.body.redirect_uri, "proper redirect_uri should be sent in the POST body").to.equal(ctx.REDIRECT_URL);
                    expect(req.body.code_verifier, "proper code_verifier should be sent in the POST body").to.exist;

                    let validated = await jose.compactVerify(req.body.client_assertion, clientKey)
                    expect(validated, "client_assertion must be valid").to.exist;
                    expect(validated.protectedHeader.jku, `client_assertion jku header must be ${KEY_SET_URL}`).to.equal(KEY_SET_URL);
                    expect(validated.protectedHeader.kid, `client_assertion jku header must be ${clientPublicJwk.kid}`).to.equal(clientPublicJwk.kid);
                    expect(validated.protectedHeader.typ, "client_assertion jku header must be JWT").to.equal("JWT");

                    let payload = JSON.parse(new TextDecoder().decode(validated.payload));
                    expect(payload.aud, `The validated token payload aud property should be "${ctx.TOKEN_URL}"`).to.equal(ctx.TOKEN_URL);
                    expect(payload.iss, `The validated token payload iss property should be "${CLIENT_ID}"`).to.equal(CLIENT_ID);
                    expect(payload.sub, `The validated token payload sub property should be "${CLIENT_ID}"`).to.equal(CLIENT_ID);
                    expect(payload.exp, "The validated token payload exp property should exist").to.exist;
                    expect(payload.jti, "The validated token payload jti property should exist").to.exist;
                    
                    res.json(generateTokenResponse());
                }
            });
        
            await ready(stateID)

            expect(tokenMock._request, "Token endpoint should be called called").to.exist;
        });

        it (alg + " asymmetric auth with CryptoKey object", async () => {

            const kid = "my-kid";

            const redirectUrl = await authorize({
                client_id: CLIENT_ID,
                scope    : "patient/*.read",
                clientPublicKeySetUrl: KEY_SET_URL
            });

            const stateID = redirectUrl.searchParams.get("state");

            await navigate(`${ctx.REDIRECT_URL}?code=123&state=${stateID}`);

            // 1. Create a key pair within the tested window
            // 2. Export the public key as JWK to be used for virification later
            // 3. Re-import the private key to make it non-extractable
            // 4. Save the private key and return the publik JWK
            const publicJWK = await executeAsync(async (alg, done) => {
                try {
                    const algorithm = alg === "RS384" ? {
                        name: "RSASSA-PKCS1-v1_5",
                        modulusLength: 4096,
                        publicExponent: new Uint8Array([1, 0, 1]),
                        hash: {
                            name: 'SHA-384'
                        }
                    } : {
                        name: "ECDSA",
                        namedCurve: "P-384"
                    };

                    const { publicKey, privateKey } = await crypto.subtle.generateKey(
                        algorithm,
                        true,
                        ["sign", "verify"]
                    );

                    const publicJWK = await crypto.subtle.exportKey("jwk", publicKey);
                    const privateJWK = await crypto.subtle.exportKey("jwk", privateKey);

                    PRIVATE_KEY = await crypto.subtle.importKey("jwk", privateJWK, algorithm, false, ["sign"])

                    done(publicJWK)
                } catch (e) {
                    done({ error: e + "" })
                }
            }, alg);

            // Mock token response
            const tokenMock = mockServer.mock({ path: "/auth/token", method: "post" }, {
                bodyParser: express.urlencoded({ extended: false }),
                async handler(req, res) {

                    const clientKey = await jose.importJWK(publicJWK, alg);
                    
                    expect(req.body.client_assertion, "client_assertion should be sent in the POST body").to.exist;
                    expect(req.body.client_assertion_type, "proper client_assertion_type should be sent in the POST body").to.equal('urn:ietf:params:oauth:client-assertion-type:jwt-bearer');
                    expect(req.body.code, "proper code should be sent in the POST body").to.equal('123');
                    expect(req.body.grant_type, "proper grant_type should be sent in the POST body").to.equal('authorization_code');
                    expect(req.body.redirect_uri, "proper redirect_uri should be sent in the POST body").to.equal(ctx.REDIRECT_URL);
                    expect(req.body.code_verifier, "proper code_verifier should be sent in the POST body").to.exist;

                    let validated = await jose.compactVerify(req.body.client_assertion, clientKey)
                    expect(validated, "client_assertion must be valid").to.exist;
                    expect(validated.protectedHeader.jku, `client_assertion jku header must be ${KEY_SET_URL}`).to.equal(KEY_SET_URL);
                    expect(validated.protectedHeader.kid, `client_assertion kid header must be ${kid}`).to.equal(kid);
                    expect(validated.protectedHeader.typ, "client_assertion typ header must be JWT").to.equal("JWT");

                    let payload = JSON.parse(new TextDecoder().decode(validated.payload));
                    expect(payload.aud, `The validated token payload aud property should be "${ctx.TOKEN_URL}"`).to.equal(ctx.TOKEN_URL);
                    expect(payload.iss, `The validated token payload iss property should be "${CLIENT_ID}"`).to.equal(CLIENT_ID);
                    expect(payload.sub, `The validated token payload sub property should be "${CLIENT_ID}"`).to.equal(CLIENT_ID);
                    expect(payload.exp, "The validated token payload exp property should exist").to.exist;
                    expect(payload.jti, "The validated token payload jti property should exist").to.exist;
                    
                    res.json(generateTokenResponse());
                }
            });

            await executeAsync(async (context, done) => {

                FHIR.oauth2.ready({
                    clientPublicKeySetUrl: context.KEY_SET_URL,
                    privateKey: {
                        alg: context.alg,
                        kid: context.kid,
                        key: PRIVATE_KEY
                    }
                }).then(
                    function(client) {
                        SMART_CLIENT = client;
                        done(client.state);
                    },
                    function(e) {
                        done({ error: e + "" });
                    }
                );
            }, {
                alg,
                kid,
                KEY_SET_URL
            });

            expect(tokenMock._request, "Token endpoint should be called called").to.exist;
        });

        it(`authorize fails with bad ${alg} key`, async () => {
            const { privateKey } = await jose.generateKeyPair(alg)
            const clientPrivateJwk = await jose.exportJWK(privateKey)
            const redirectUrl = await authorize({
                client_id: CLIENT_ID,
                scope    : "patient/*.read",
                clientPublicKeySetUrl: KEY_SET_URL,
                // @ts-ignore
                clientPrivateJwk: { ...clientPrivateJwk, kty: "bad", alg }
            });
            const stateID = redirectUrl.searchParams.get("state");
            await navigate(`${ctx.REDIRECT_URL}?code=123&state=${stateID}`);
            await ready(stateID).should.eventually.be.rejected;
        });

        it(alg + " throws without JWK.alg", async () => {

            const { publicKey, privateKey } = await jose.generateKeyPair(alg)

            const clientPrivateJwk = { ...await jose.exportJWK(privateKey), key_ops: ["sign"] }
            const clientPublicJwk  = await jose.exportJWK(publicKey )

            const redirectUrl = await authorize({
                client_id: CLIENT_ID,
                scope    : "patient/*.read",
                clientPublicKeySetUrl: KEY_SET_URL,
                // @ts-ignore
                clientPrivateJwk
            });

            // Get the state parameter from the URL ----------------------------
            const stateID = redirectUrl.searchParams.get("state");

            // Redirect --------------------------------------------------------
            await navigate(`${ctx.REDIRECT_URL}?code=123&state=${stateID}`);
            
            // Mock token response ---------------------------------------------
            mockServer.mock({ path: "/auth/token", method: "post" }, {
                bodyParser: express.urlencoded({ extended: false }),
                async handler(req, res) {
                    const clientKey = await jose.importJWK(clientPublicJwk, alg);
                    await jose.compactVerify(req.body.client_assertion, clientKey);
                    res.json(generateTokenResponse());
                }
            });
        
            await ready(stateID).should.eventually.be.rejectedWith('The "alg" property of the JWK must be set to "ES384" or "RS384"')
        })

        it(alg + " throws without 'sign' in key_ops", async () => {

            const { publicKey, privateKey } = await jose.generateKeyPair(alg)

            const clientPrivateJwk = { ...await jose.exportJWK(privateKey), alg, key_ops: ["verify"] }
            const clientPublicJwk  = await jose.exportJWK(publicKey )

            const redirectUrl = await authorize({
                client_id: CLIENT_ID,
                scope    : "patient/*.read",
                clientPublicKeySetUrl: KEY_SET_URL,
                // @ts-ignore
                clientPrivateJwk
            });

            // Get the state parameter from the URL ----------------------------
            const stateID = redirectUrl.searchParams.get("state");

            // Redirect --------------------------------------------------------
            await navigate(`${ctx.REDIRECT_URL}?code=123&state=${stateID}`);
            
            // Mock token response ---------------------------------------------
            mockServer.mock({ path: "/auth/token", method: "post" }, {
                bodyParser: express.urlencoded({ extended: false }),
                async handler(req, res) {
                    const clientKey = await jose.importJWK(clientPublicJwk, alg);
                    await jose.compactVerify(req.body.client_assertion, clientKey);
                    res.json(generateTokenResponse());
                }
            });
        
            await ready(stateID, { privateKey: clientPrivateJwk }).should.eventually.be.rejectedWith('The "key_ops" property of the JWK does not contain "sign"')
        })
    });

    it("uses state.clientSecret", async () => {
        const redirectUrl = await authorize({
            clientId    : CLIENT_ID,
            scope       : "patient/*.read",
            clientSecret: "test-secret"
        });

        const stateID = redirectUrl.searchParams.get("state");

        await navigate(`${ctx.REDIRECT_URL}?code=123&state=${stateID}`);

        const tokenMock = mockServer.mock({ path: "/auth/token", method: "post" }, {
            body  : generateTokenResponse(),
            status: 200,
            headers: {
                "content-type" : "application/json",
                "cache-control": "no-cache, no-store, must-revalidate",
                "pragma"       : "no-cache",
                "expires"      : "0"
            }
        });

        await ready(stateID)

        const authz = tokenMock._request?.headers?.authorization;
        expect(authz, "authorization header should exist").to.exist;
        expect(authz, "authorization header should be string").to.be.a("string");
        expect(authz, "authorization header should start with 'Basic '").to.match(/^Basic\s/)
    });
});
