import { URL }          from "url"
import chai, { expect } from "chai"
import chaiAsPromised   from "chai-as-promised"
import * as smart       from "../src/smart"
import * as lib         from "../src/lib"
import { fhirclient }   from "../src/types"
import BrowserEnv       from "./mocks/BrowserEnvironment"
import MockWindow       from "./mocks/Window"
import MockScreen       from "./mocks/Screen"
import MockServer       from "./mocks/mockServer2"
import Location         from "./mocks/Location"
import BrowserAdapter   from "../src/adapters/BrowserAdapter"


chai.use(chaiAsPromised)

declare var window: MockWindow;

// -----------------------------------------------------------------------------
async function authorize(env: BrowserEnv, authorizeOptions: fhirclient.AuthorizeParams) {
                
    if (authorizeOptions.noRedirect) {
        return smart.authorize(env, authorizeOptions)
    }

    return new Promise<any>((resolve, reject) => {                    
        
        // This first call will NEVER resolve, but it will trigger a
        // "redirect" event
        env.once("redirect", () => resolve(env.getUrl()))

        smart.authorize(env, authorizeOptions).catch(reject);
    })
}

async function init(env: BrowserEnv, authorizeOptions: fhirclient.AuthorizeParams, readyOptions?: fhirclient.ReadyOptions) {
    
    if (authorizeOptions.noRedirect) {
        return smart.init(env, authorizeOptions, readyOptions)
    }

    return new Promise<any>((resolve, reject) => {
        
        // This first call will NEVER resolve, but it will trigger a
        // "redirect" event
        env.once("redirect", () => resolve(env.getUrl()))

        smart.init(env, authorizeOptions, readyOptions).catch(reject);
    })
}

async function launchUsingInit(env: BrowserEnv, authorizeOptions: fhirclient.AuthorizeParams, readyOptions?: fhirclient.ReadyOptions) {
    
    // redirects to authorize
    const url = await init(env, authorizeOptions, readyOptions)
    
    // redirects back to us
    const redirectUrl = new URL(authorizeOptions.redirectUri || "", "http://localhost")
    redirectUrl.searchParams.set("code", "123")
    redirectUrl.searchParams.set("state", url.searchParams.get("state"))
    env.redirect(redirectUrl.href)
    // env.redirect("http://localhost/?code=123&state=" + url.searchParams.get("state"));
    
    // call init again
    return await smart.init(env, authorizeOptions, readyOptions);
}

async function launchUsingAuthorize(env: BrowserEnv, authorizeOptions: fhirclient.AuthorizeParams, readyOptions?: fhirclient.ReadyOptions) {
    
    // redirects to authorize
    const url = await authorize(env, authorizeOptions)
    
    // redirects back to us
    const redirectUrl = new URL(authorizeOptions.redirectUri || "", "http://localhost")
    redirectUrl.searchParams.set("code", "123")
    redirectUrl.searchParams.set("state", url.searchParams.get("state"))
    env.redirect(redirectUrl.href)
    // env.redirect("http://localhost/?code=123&state=" + url.searchParams.get("state"));
    
    // call init again
    return await smart.ready(env, readyOptions);
}

function applyDefaultMocks(mockServer: MockServer, {
    authorizeUri = "https://my-authorize-uri",
    tokenUri     = "https://my-token-uri",
    registerUri  = "https://my-registration-uri",
    codeChallengeMethodsSupported = ['S256']
}: {
    authorizeUri?: string
    tokenUri    ?: string
    registerUri ?: string
    codeChallengeMethodsSupported?: string[]
} = {}) {

    const extensions: any[] = []
    const wellKnown: any = {
        code_challenge_methods_supported: codeChallengeMethodsSupported
    }

    if (authorizeUri) {
        extensions.push({ url: "authorize", valueUri: authorizeUri })
        wellKnown.authorization_endpoint = authorizeUri
    }

    if (tokenUri) {
        extensions.push({ url: "token", valueUri: tokenUri })
        wellKnown.token_endpoint = tokenUri
    }

    if (registerUri) {
        extensions.push({ url: "register", valueUri: registerUri })
        wellKnown.registration_endpoint = registerUri
    }

    mockServer.mock("/.well-known/smart-configuration", {
        headers: { "content-type": "application/json" },
        status: 200,
        body: wellKnown
    });

    mockServer.mock("/metadata", {
        headers: { "content-type": "application/json" },
        status: 200,
        body: {
            rest: [
                {
                    security: {
                        extension: [
                            {
                                url: "http://fhir-registry.smarthealthit.org/StructureDefinition/oauth-uris",
                                extension: extensions
                            }
                        ]
                    }
                }
            ]
        }
    });
}
// -----------------------------------------------------------------------------
describe("Browser tests", () => {

    let mockServer: MockServer, mockUrl: string;
    
    const mockCodeChallengeMethods:string[] = ['S256'];

    before(async () => {
        mockServer = new MockServer()
        await mockServer.start()
        mockUrl = mockServer.baseUrl
    });
    
    after(async () => {
        await mockServer.stop()
    });

    beforeEach(() => {
        (globalThis as any).window = (globalThis as any).self = new MockWindow();
        (globalThis as any).top    = window.top;
        (globalThis as any).parent = window.parent;
        (globalThis as any).frames = window.frames;
        (globalThis as any).screen = new MockScreen();
        (globalThis as any).frames = {};
        (globalThis as any).sessionStorage = self.sessionStorage;
        (globalThis as any).location = new Location("http://localhost");
        (globalThis as any).window.atob = (x: string) => Buffer.from(x, "base64").toString("utf8");
        (globalThis as any).window.btoa = (x: string) => Buffer.from(x, "utf8").toString("base64");
    });
    
    afterEach(() => {
        mockServer.clear();
        delete (globalThis as any).self;
        delete (globalThis as any).top;
        delete (globalThis as any).parent;
        delete (globalThis as any).frames;
        delete (globalThis as any).window;
        delete (globalThis as any).screen;
        delete (globalThis as any).frames;
        delete (globalThis as any).opener;
        delete (globalThis as any).sessionStorage;
        delete (globalThis as any).location;
    });
    

    describe ("Complete authorization", () => {
        it ("code flow", async () => {

            const env = new BrowserEnv();
            const Storage = env.getStorage();

            applyDefaultMocks(mockServer, { tokenUri: mockUrl + "/token" });

            // Call our launch code.
            await smart.authorize(env, {
                iss     : mockUrl,
                launch  : "123",
                scope   : "my_scope",
                clientId: "my_client_id"
            });

            // Now we have been redirected to `redirect` and then back to our
            // redirectUri. It is time to complete the authorization.
            const redirect = env.getUrl();

            // Get the state parameter from the URL
            const state = redirect.searchParams.get("state")!;

            expect(await Storage.get(state), "must have set a state at " + state).to.exist;

            // mock our access token response
            mockServer.mock({ path: "/token", method: "post" }, {
                headers: { "content-type": "application/json" },
                status: 200,
                body: {
                    "need_patient_banner": true,
                    "smart_style_url": "https://launch.smarthealthit.org/smart-style.json",
                    "patient": "b2536dd3-bccd-4d22-8355-ab20acdf240b",
                    "encounter": "e3ec2d15-4c27-4607-a45c-2f84962b0700",
                    "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJjb250ZXh0Ijp7Im5lZWRfcGF0aWVudF9iYW5uZXIiOnRydWUsInNtYXJ0X3N0eWxlX3VybCI6Imh0dHBzOi8vbGF1bmNoLnNtYXJ0aGVhbHRoaXQub3JnL3NtYXJ0LXN0eWxlLmpzb24iLCJwYXRpZW50IjoiYjI1MzZkZDMtYmNjZC00ZDIyLTgzNTUtYWIyMGFjZGYyNDBiIiwiZW5jb3VudGVyIjoiZTNlYzJkMTUtNGMyNy00NjA3LWE0NWMtMmY4NDk2MmIwNzAwIn0sImNsaWVudF9pZCI6Im15X3dlYl9hcHAiLCJzY29wZSI6Im9wZW5pZCBmaGlyVXNlciBvZmZsaW5lX2FjY2VzcyB1c2VyLyouKiBwYXRpZW50LyouKiBsYXVuY2gvZW5jb3VudGVyIGxhdW5jaC9wYXRpZW50IHByb2ZpbGUiLCJ1c2VyIjoiUHJhY3RpdGlvbmVyL3NtYXJ0LVByYWN0aXRpb25lci03MTQ4MjcxMyIsImlhdCI6MTU1OTEzODkxMywiZXhwIjoxNTkwNjc0OTE0fQ.-Ey7wdFSlmfoQrm7HNxAgJQBJPKdtfH7kL1Z91L60_8",
                    "token_type": "bearer",
                    "scope": "openid fhirUser offline_access user/*.* patient/*.* launch/encounter launch/patient profile",
                    "client_id": "my_web_app",
                    "expires_in": 3600,
                    "id_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJwcm9maWxlIjoiUHJhY3RpdGlvbmVyL3NtYXJ0LVByYWN0aXRpb25lci03MTQ4MjcxMyIsImZoaXJVc2VyIjoiUHJhY3RpdGlvbmVyL3NtYXJ0LVByYWN0aXRpb25lci03MTQ4MjcxMyIsImF1ZCI6Im15X3dlYl9hcHAiLCJzdWIiOiJkYjIzZDBkZTI1Njc4ZTY3MDk5YmM0MzQzMjNkYzBkOTY1MTNiNTUyMmQ0Yjc0MWNiYTM5ZjdjOTJkMGM0NmFlIiwiaXNzIjoiaHR0cDovL2xhdW5jaC5zbWFydGhlYWx0aGl0Lm9yZyIsImlhdCI6MTU1OTEzODkxNCwiZXhwIjoxNTU5MTQyNTE0fQ.OtbIcs5nyEKaD2kAPasm1DYFixHvVbkC1wQys3oa3T-4Tf8wxW56hzUK0ZQeOK_gEIxiSFn9tLoUvKau_M1WRVD11FPyulvs1Q8EbG5PQ83MBudcpZQJ_uuFbVcGsDMy2xEa_8jAHkHPAVNjj8FRsQCRZC0Hfg0NbXli3yOhAFK1LqTUcrnjfwD-sak0UGQS1H6OgILnTYLrlTTIonfnWRdpWJjjIh3_GCk5k-8LU8AARaPcSE3ZhezoKTSfwQn1XO101g5h337pZleaIlFlhxPRFSKtpXz7BEezkUi5CJqN4d2qNoBK9kapljFYEVdPjRqaBnt4blmyFRXjhdMNwA",
                    "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJuZWVkX3BhdGllbnRfYmFubmVyIjp0cnVlLCJzbWFydF9zdHlsZV91cmwiOiJodHRwczovL2xhdW5jaC5zbWFydGhlYWx0aGl0Lm9yZy9zbWFydC1zdHlsZS5qc29uIiwicGF0aWVudCI6ImIyNTM2ZGQzLWJjY2QtNGQyMi04MzU1LWFiMjBhY2RmMjQwYiIsImVuY291bnRlciI6ImUzZWMyZDE1LTRjMjctNDYwNy1hNDVjLTJmODQ5NjJiMDcwMCIsInJlZnJlc2hfdG9rZW4iOiJleUowZVhBaU9pSktWMVFpTENKaGJHY2lPaUpJVXpJMU5pSjkuZXlKamIyNTBaWGgwSWpwN0ltNWxaV1JmY0dGMGFXVnVkRjlpWVc1dVpYSWlPblJ5ZFdVc0luTnRZWEowWDNOMGVXeGxYM1Z5YkNJNkltaDBkSEJ6T2k4dmJHRjFibU5vTG5OdFlYSjBhR1ZoYkhSb2FYUXViM0puTDNOdFlYSjBMWE4wZVd4bExtcHpiMjRpTENKd1lYUnBaVzUwSWpvaVlqSTFNelprWkRNdFltTmpaQzAwWkRJeUxUZ3pOVFV0WVdJeU1HRmpaR1l5TkRCaUlpd2laVzVqYjNWdWRHVnlJam9pWlRObFl6SmtNVFV0TkdNeU55MDBOakEzTFdFME5XTXRNbVk0TkRrMk1tSXdOekF3SW4wc0ltTnNhV1Z1ZEY5cFpDSTZJbTE1WDNkbFlsOWhjSEFpTENKelkyOXdaU0k2SW05d1pXNXBaQ0JtYUdseVZYTmxjaUJ2Wm1ac2FXNWxYMkZqWTJWemN5QjFjMlZ5THlvdUtpQndZWFJwWlc1MEx5b3VLaUJzWVhWdVkyZ3ZaVzVqYjNWdWRHVnlJR3hoZFc1amFDOXdZWFJwWlc1MElIQnliMlpwYkdVaUxDSjFjMlZ5SWpvaVVISmhZM1JwZEdsdmJtVnlMM050WVhKMExWQnlZV04wYVhScGIyNWxjaTAzTVRRNE1qY3hNeUlzSW1saGRDSTZNVFUxT1RFek9Ea3hNeXdpWlhod0lqb3hOVGt3TmpjME9URTBmUS4tRXk3d2RGU2xtZm9Rcm03SE54QWdKUUJKUEtkdGZIN2tMMVo5MUw2MF84IiwidG9rZW5fdHlwZSI6ImJlYXJlciIsInNjb3BlIjoib3BlbmlkIGZoaXJVc2VyIG9mZmxpbmVfYWNjZXNzIHVzZXIvKi4qIHBhdGllbnQvKi4qIGxhdW5jaC9lbmNvdW50ZXIgbGF1bmNoL3BhdGllbnQgcHJvZmlsZSIsImNsaWVudF9pZCI6Im15X3dlYl9hcHAiLCJleHBpcmVzX2luIjozNjAwLCJpZF90b2tlbiI6ImV5SjBlWEFpT2lKS1YxUWlMQ0poYkdjaU9pSlNVekkxTmlKOS5leUp3Y205bWFXeGxJam9pVUhKaFkzUnBkR2x2Ym1WeUwzTnRZWEowTFZCeVlXTjBhWFJwYjI1bGNpMDNNVFE0TWpjeE15SXNJbVpvYVhKVmMyVnlJam9pVUhKaFkzUnBkR2x2Ym1WeUwzTnRZWEowTFZCeVlXTjBhWFJwYjI1bGNpMDNNVFE0TWpjeE15SXNJbUYxWkNJNkltMTVYM2RsWWw5aGNIQWlMQ0p6ZFdJaU9pSmtZakl6WkRCa1pUSTFOamM0WlRZM01EazVZbU0wTXpRek1qTmtZekJrT1RZMU1UTmlOVFV5TW1RMFlqYzBNV05pWVRNNVpqZGpPVEprTUdNME5tRmxJaXdpYVhOeklqb2lhSFIwY0RvdkwyeGhkVzVqYUM1emJXRnlkR2hsWVd4MGFHbDBMbTl5WnlJc0ltbGhkQ0k2TVRVMU9URXpPRGt4TkN3aVpYaHdJam94TlRVNU1UUXlOVEUwZlEuT3RiSWNzNW55RUthRDJrQVBhc20xRFlGaXhIdlZia0Mxd1F5czNvYTNULTRUZjh3eFc1Nmh6VUswWlFlT0tfZ0VJeGlTRm45dExvVXZLYXVfTTFXUlZEMTFGUHl1bHZzMVE4RWJHNVBRODNNQnVkY3BaUUpfdXVGYlZjR3NETXkyeEVhXzhqQUhrSFBBVk5qajhGUnNRQ1JaQzBIZmcwTmJYbGkzeU9oQUZLMUxxVFVjcm5qZndELXNhazBVR1FTMUg2T2dJTG5UWUxybFRUSW9uZm5XUmRwV0pqakloM19HQ2s1ay04TFU4QUFSYVBjU0UzWmhlem9LVFNmd1FuMVhPMTAxZzVoMzM3cFpsZWFJbEZsaHhQUkZTS3RwWHo3QkVlemtVaTVDSnFONGQycU5vQks5a2FwbGpGWUVWZFBqUnFhQm50NGJsbXlGUlhqaGRNTndBIiwiaWF0IjoxNTU5MTM4OTE0LCJleHAiOjE1NTkxNDI1MTR9.lhfmhXYfoaI4QcJYvFnr2FMn_RHO8aXSzzkXzwNpc7w",
                    "code": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJjb250ZXh0Ijp7Im5lZWRfcGF0aWVudF9iYW5uZXIiOnRydWUsInNtYXJ0X3N0eWxlX3VybCI6Imh0dHBzOi8vbGF1bmNoLnNtYXJ0aGVhbHRoaXQub3JnL3NtYXJ0LXN0eWxlLmpzb24iLCJwYXRpZW50IjoiYjI1MzZkZDMtYmNjZC00ZDIyLTgzNTUtYWIyMGFjZGYyNDBiIiwiZW5jb3VudGVyIjoiZTNlYzJkMTUtNGMyNy00NjA3LWE0NWMtMmY4NDk2MmIwNzAwIn0sImNsaWVudF9pZCI6Im15X3dlYl9hcHAiLCJzY29wZSI6Im9wZW5pZCBmaGlyVXNlciBvZmZsaW5lX2FjY2VzcyB1c2VyLyouKiBwYXRpZW50LyouKiBsYXVuY2gvZW5jb3VudGVyIGxhdW5jaC9wYXRpZW50IHByb2ZpbGUiLCJ1c2VyIjoiUHJhY3RpdGlvbmVyL3NtYXJ0LVByYWN0aXRpb25lci03MTQ4MjcxMyIsImlhdCI6MTU1OTEzODkxMywiZXhwIjoxNTU5MTM5MjEzfQ.G2dLcSnjpwM_joWTxWLfL48vhdlj3zGV9Os5cKREYcY",
                    state
                }
            });

            env.redirect("http://localhost/?code=123&state=" + state);
            const client = await smart.ready(env);

            // make sure tha browser history was replaced
            expect(window.history._location).to.equal("http://localhost/");

            expect(await Storage.get(smart.KEY), `must have set a state at ${smart.KEY}`).to.exist;
            expect(client.getPatientId()).to.equal("b2536dd3-bccd-4d22-8355-ab20acdf240b");
            expect(client.getEncounterId()).to.equal("e3ec2d15-4c27-4607-a45c-2f84962b0700");
            expect(client.getUserId()).to.equal("smart-Practitioner-71482713");
            expect(client.getUserType()).to.equal("Practitioner");
        });

        it ("refresh an authorized page", async () => {

            const env = new BrowserEnv();
            const Storage = env.getStorage();
            const key = "whatever-random-key";

            await Storage.set(smart.KEY, key);
            await Storage.set(key, {
                clientId     : "my_web_app",
                scope        : "whatever",
                redirectUri  : "whatever",
                serverUrl    : mockUrl,
                key,
                tokenResponse: {
                    "need_patient_banner": true,
                    "smart_style_url": "https://launch.smarthealthit.org/smart-style.json",
                    "patient": "b2536dd3-bccd-4d22-8355-ab20acdf240b",
                    "encounter": "e3ec2d15-4c27-4607-a45c-2f84962b0700",
                    "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJjb250ZXh0Ijp7Im5lZWRfcGF0aWVudF9iYW5uZXIiOnRydWUsInNtYXJ0X3N0eWxlX3VybCI6Imh0dHBzOi8vbGF1bmNoLnNtYXJ0aGVhbHRoaXQub3JnL3NtYXJ0LXN0eWxlLmpzb24iLCJwYXRpZW50IjoiYjI1MzZkZDMtYmNjZC00ZDIyLTgzNTUtYWIyMGFjZGYyNDBiIiwiZW5jb3VudGVyIjoiZTNlYzJkMTUtNGMyNy00NjA3LWE0NWMtMmY4NDk2MmIwNzAwIn0sImNsaWVudF9pZCI6Im15X3dlYl9hcHAiLCJzY29wZSI6Im9wZW5pZCBmaGlyVXNlciBvZmZsaW5lX2FjY2VzcyB1c2VyLyouKiBwYXRpZW50LyouKiBsYXVuY2gvZW5jb3VudGVyIGxhdW5jaC9wYXRpZW50IHByb2ZpbGUiLCJ1c2VyIjoiUHJhY3RpdGlvbmVyL3NtYXJ0LVByYWN0aXRpb25lci03MTQ4MjcxMyIsImlhdCI6MTU1OTEzODkxMywiZXhwIjoxNTkwNjc0OTE0fQ.-Ey7wdFSlmfoQrm7HNxAgJQBJPKdtfH7kL1Z91L60_8",
                    "token_type": "bearer",
                    "scope": "openid fhirUser offline_access user/*.* patient/*.* launch/encounter launch/patient profile",
                    "client_id": "my_web_app",
                    "expires_in": 3600,
                    "id_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJwcm9maWxlIjoiUHJhY3RpdGlvbmVyL3NtYXJ0LVByYWN0aXRpb25lci03MTQ4MjcxMyIsImZoaXJVc2VyIjoiUHJhY3RpdGlvbmVyL3NtYXJ0LVByYWN0aXRpb25lci03MTQ4MjcxMyIsImF1ZCI6Im15X3dlYl9hcHAiLCJzdWIiOiJkYjIzZDBkZTI1Njc4ZTY3MDk5YmM0MzQzMjNkYzBkOTY1MTNiNTUyMmQ0Yjc0MWNiYTM5ZjdjOTJkMGM0NmFlIiwiaXNzIjoiaHR0cDovL2xhdW5jaC5zbWFydGhlYWx0aGl0Lm9yZyIsImlhdCI6MTU1OTEzODkxNCwiZXhwIjoxNTU5MTQyNTE0fQ.OtbIcs5nyEKaD2kAPasm1DYFixHvVbkC1wQys3oa3T-4Tf8wxW56hzUK0ZQeOK_gEIxiSFn9tLoUvKau_M1WRVD11FPyulvs1Q8EbG5PQ83MBudcpZQJ_uuFbVcGsDMy2xEa_8jAHkHPAVNjj8FRsQCRZC0Hfg0NbXli3yOhAFK1LqTUcrnjfwD-sak0UGQS1H6OgILnTYLrlTTIonfnWRdpWJjjIh3_GCk5k-8LU8AARaPcSE3ZhezoKTSfwQn1XO101g5h337pZleaIlFlhxPRFSKtpXz7BEezkUi5CJqN4d2qNoBK9kapljFYEVdPjRqaBnt4blmyFRXjhdMNwA",
                    "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJuZWVkX3BhdGllbnRfYmFubmVyIjp0cnVlLCJzbWFydF9zdHlsZV91cmwiOiJodHRwczovL2xhdW5jaC5zbWFydGhlYWx0aGl0Lm9yZy9zbWFydC1zdHlsZS5qc29uIiwicGF0aWVudCI6ImIyNTM2ZGQzLWJjY2QtNGQyMi04MzU1LWFiMjBhY2RmMjQwYiIsImVuY291bnRlciI6ImUzZWMyZDE1LTRjMjctNDYwNy1hNDVjLTJmODQ5NjJiMDcwMCIsInJlZnJlc2hfdG9rZW4iOiJleUowZVhBaU9pSktWMVFpTENKaGJHY2lPaUpJVXpJMU5pSjkuZXlKamIyNTBaWGgwSWpwN0ltNWxaV1JmY0dGMGFXVnVkRjlpWVc1dVpYSWlPblJ5ZFdVc0luTnRZWEowWDNOMGVXeGxYM1Z5YkNJNkltaDBkSEJ6T2k4dmJHRjFibU5vTG5OdFlYSjBhR1ZoYkhSb2FYUXViM0puTDNOdFlYSjBMWE4wZVd4bExtcHpiMjRpTENKd1lYUnBaVzUwSWpvaVlqSTFNelprWkRNdFltTmpaQzAwWkRJeUxUZ3pOVFV0WVdJeU1HRmpaR1l5TkRCaUlpd2laVzVqYjNWdWRHVnlJam9pWlRObFl6SmtNVFV0TkdNeU55MDBOakEzTFdFME5XTXRNbVk0TkRrMk1tSXdOekF3SW4wc0ltTnNhV1Z1ZEY5cFpDSTZJbTE1WDNkbFlsOWhjSEFpTENKelkyOXdaU0k2SW05d1pXNXBaQ0JtYUdseVZYTmxjaUJ2Wm1ac2FXNWxYMkZqWTJWemN5QjFjMlZ5THlvdUtpQndZWFJwWlc1MEx5b3VLaUJzWVhWdVkyZ3ZaVzVqYjNWdWRHVnlJR3hoZFc1amFDOXdZWFJwWlc1MElIQnliMlpwYkdVaUxDSjFjMlZ5SWpvaVVISmhZM1JwZEdsdmJtVnlMM050WVhKMExWQnlZV04wYVhScGIyNWxjaTAzTVRRNE1qY3hNeUlzSW1saGRDSTZNVFUxT1RFek9Ea3hNeXdpWlhod0lqb3hOVGt3TmpjME9URTBmUS4tRXk3d2RGU2xtZm9Rcm03SE54QWdKUUJKUEtkdGZIN2tMMVo5MUw2MF84IiwidG9rZW5fdHlwZSI6ImJlYXJlciIsInNjb3BlIjoib3BlbmlkIGZoaXJVc2VyIG9mZmxpbmVfYWNjZXNzIHVzZXIvKi4qIHBhdGllbnQvKi4qIGxhdW5jaC9lbmNvdW50ZXIgbGF1bmNoL3BhdGllbnQgcHJvZmlsZSIsImNsaWVudF9pZCI6Im15X3dlYl9hcHAiLCJleHBpcmVzX2luIjozNjAwLCJpZF90b2tlbiI6ImV5SjBlWEFpT2lKS1YxUWlMQ0poYkdjaU9pSlNVekkxTmlKOS5leUp3Y205bWFXeGxJam9pVUhKaFkzUnBkR2x2Ym1WeUwzTnRZWEowTFZCeVlXTjBhWFJwYjI1bGNpMDNNVFE0TWpjeE15SXNJbVpvYVhKVmMyVnlJam9pVUhKaFkzUnBkR2x2Ym1WeUwzTnRZWEowTFZCeVlXTjBhWFJwYjI1bGNpMDNNVFE0TWpjeE15SXNJbUYxWkNJNkltMTVYM2RsWWw5aGNIQWlMQ0p6ZFdJaU9pSmtZakl6WkRCa1pUSTFOamM0WlRZM01EazVZbU0wTXpRek1qTmtZekJrT1RZMU1UTmlOVFV5TW1RMFlqYzBNV05pWVRNNVpqZGpPVEprTUdNME5tRmxJaXdpYVhOeklqb2lhSFIwY0RvdkwyeGhkVzVqYUM1emJXRnlkR2hsWVd4MGFHbDBMbTl5WnlJc0ltbGhkQ0k2TVRVMU9URXpPRGt4TkN3aVpYaHdJam94TlRVNU1UUXlOVEUwZlEuT3RiSWNzNW55RUthRDJrQVBhc20xRFlGaXhIdlZia0Mxd1F5czNvYTNULTRUZjh3eFc1Nmh6VUswWlFlT0tfZ0VJeGlTRm45dExvVXZLYXVfTTFXUlZEMTFGUHl1bHZzMVE4RWJHNVBRODNNQnVkY3BaUUpfdXVGYlZjR3NETXkyeEVhXzhqQUhrSFBBVk5qajhGUnNRQ1JaQzBIZmcwTmJYbGkzeU9oQUZLMUxxVFVjcm5qZndELXNhazBVR1FTMUg2T2dJTG5UWUxybFRUSW9uZm5XUmRwV0pqakloM19HQ2s1ay04TFU4QUFSYVBjU0UzWmhlem9LVFNmd1FuMVhPMTAxZzVoMzM3cFpsZWFJbEZsaHhQUkZTS3RwWHo3QkVlemtVaTVDSnFONGQycU5vQks5a2FwbGpGWUVWZFBqUnFhQm50NGJsbXlGUlhqaGRNTndBIiwiaWF0IjoxNTU5MTM4OTE0LCJleHAiOjE1NTkxNDI1MTR9.lhfmhXYfoaI4QcJYvFnr2FMn_RHO8aXSzzkXzwNpc7w",
                    "code": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJjb250ZXh0Ijp7Im5lZWRfcGF0aWVudF9iYW5uZXIiOnRydWUsInNtYXJ0X3N0eWxlX3VybCI6Imh0dHBzOi8vbGF1bmNoLnNtYXJ0aGVhbHRoaXQub3JnL3NtYXJ0LXN0eWxlLmpzb24iLCJwYXRpZW50IjoiYjI1MzZkZDMtYmNjZC00ZDIyLTgzNTUtYWIyMGFjZGYyNDBiIiwiZW5jb3VudGVyIjoiZTNlYzJkMTUtNGMyNy00NjA3LWE0NWMtMmY4NDk2MmIwNzAwIn0sImNsaWVudF9pZCI6Im15X3dlYl9hcHAiLCJzY29wZSI6Im9wZW5pZCBmaGlyVXNlciBvZmZsaW5lX2FjY2VzcyB1c2VyLyouKiBwYXRpZW50LyouKiBsYXVuY2gvZW5jb3VudGVyIGxhdW5jaC9wYXRpZW50IHByb2ZpbGUiLCJ1c2VyIjoiUHJhY3RpdGlvbmVyL3NtYXJ0LVByYWN0aXRpb25lci03MTQ4MjcxMyIsImlhdCI6MTU1OTEzODkxMywiZXhwIjoxNTU5MTM5MjEzfQ.G2dLcSnjpwM_joWTxWLfL48vhdlj3zGV9Os5cKREYcY"
                }
            });

            env.redirect("http://localhost/");
            const client = await smart.ready(env);

            expect(client.patient.id).to.equal("b2536dd3-bccd-4d22-8355-ab20acdf240b");
            expect(client.encounter.id).to.equal("e3ec2d15-4c27-4607-a45c-2f84962b0700");
            expect(client.user.id).to.equal("smart-Practitioner-71482713");
            expect(client.user.resourceType).to.equal("Practitioner");
        });

        it ("can bypass oauth by passing `fhirServiceUrl`", async () => {
            const env = new BrowserEnv();
            const url = await smart.authorize(env, {
                fhirServiceUrl: "http://localhost",
                noRedirect: true
            });

            expect(url).to.match(/http:\/\/localhost\/\?state=./);
        });

        it ("appends 'launch' to the scopes if needed", async () => {
            const env = new BrowserEnv();
            const Storage = env.getStorage();
            const redirect = await smart.authorize(env, {
                fhirServiceUrl: "http://localhost",
                scope: "x",
                launch: "123",
                noRedirect: true
            });
            const state = (new URL(redirect as string)).searchParams.get("state")!;
            expect((await Storage.get(state)).scope).to.equal("x launch");
        });

        it ("can do standalone launch", async () => {

            const env     = new BrowserEnv();
            const Storage = env.getStorage();

            // mock our oauth endpoints
            applyDefaultMocks(mockServer, { tokenUri: mockUrl + "/token" });

            // Call our launch code.
            await smart.authorize(env, {
                iss: mockUrl,
                // launch: "123",
                scope: "my_scope",
                clientId: "my_client_id"
            });

            // Now we have been redirected to `redirect` and then back to our
            // redirectUri. It is time to complete the authorization.

            // Get the state parameter from the URL
            const redirect = env.getUrl(); // console.log(redirect, storage);
            const state = redirect.searchParams.get("state")!;

            expect(await Storage.get(state), "must have set a state at " + state).to.exist;

            // mock our access token response
            mockServer.mock({ path: "/token", method: "post" }, {
                headers: { "content-type": "application/json" },
                status: 200,
                body: {
                    "need_patient_banner": true,
                    "smart_style_url": "https://launch.smarthealthit.org/smart-style.json",
                    "patient": "b2536dd3-bccd-4d22-8355-ab20acdf240b",
                    "encounter": "e3ec2d15-4c27-4607-a45c-2f84962b0700",
                    "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJjb250ZXh0Ijp7Im5lZWRfcGF0aWVudF9iYW5uZXIiOnRydWUsInNtYXJ0X3N0eWxlX3VybCI6Imh0dHBzOi8vbGF1bmNoLnNtYXJ0aGVhbHRoaXQub3JnL3NtYXJ0LXN0eWxlLmpzb24iLCJwYXRpZW50IjoiYjI1MzZkZDMtYmNjZC00ZDIyLTgzNTUtYWIyMGFjZGYyNDBiIiwiZW5jb3VudGVyIjoiZTNlYzJkMTUtNGMyNy00NjA3LWE0NWMtMmY4NDk2MmIwNzAwIn0sImNsaWVudF9pZCI6Im15X3dlYl9hcHAiLCJzY29wZSI6Im9wZW5pZCBmaGlyVXNlciBvZmZsaW5lX2FjY2VzcyB1c2VyLyouKiBwYXRpZW50LyouKiBsYXVuY2gvZW5jb3VudGVyIGxhdW5jaC9wYXRpZW50IHByb2ZpbGUiLCJ1c2VyIjoiUHJhY3RpdGlvbmVyL3NtYXJ0LVByYWN0aXRpb25lci03MTQ4MjcxMyIsImlhdCI6MTU1OTEzODkxMywiZXhwIjoxNTkwNjc0OTE0fQ.-Ey7wdFSlmfoQrm7HNxAgJQBJPKdtfH7kL1Z91L60_8",
                    "token_type": "bearer",
                    "scope": "openid fhirUser offline_access user/*.* patient/*.* launch/encounter launch/patient profile",
                    "client_id": "my_web_app",
                    "expires_in": 3600,
                    "id_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJwcm9maWxlIjoiUHJhY3RpdGlvbmVyL3NtYXJ0LVByYWN0aXRpb25lci03MTQ4MjcxMyIsImZoaXJVc2VyIjoiUHJhY3RpdGlvbmVyL3NtYXJ0LVByYWN0aXRpb25lci03MTQ4MjcxMyIsImF1ZCI6Im15X3dlYl9hcHAiLCJzdWIiOiJkYjIzZDBkZTI1Njc4ZTY3MDk5YmM0MzQzMjNkYzBkOTY1MTNiNTUyMmQ0Yjc0MWNiYTM5ZjdjOTJkMGM0NmFlIiwiaXNzIjoiaHR0cDovL2xhdW5jaC5zbWFydGhlYWx0aGl0Lm9yZyIsImlhdCI6MTU1OTEzODkxNCwiZXhwIjoxNTU5MTQyNTE0fQ.OtbIcs5nyEKaD2kAPasm1DYFixHvVbkC1wQys3oa3T-4Tf8wxW56hzUK0ZQeOK_gEIxiSFn9tLoUvKau_M1WRVD11FPyulvs1Q8EbG5PQ83MBudcpZQJ_uuFbVcGsDMy2xEa_8jAHkHPAVNjj8FRsQCRZC0Hfg0NbXli3yOhAFK1LqTUcrnjfwD-sak0UGQS1H6OgILnTYLrlTTIonfnWRdpWJjjIh3_GCk5k-8LU8AARaPcSE3ZhezoKTSfwQn1XO101g5h337pZleaIlFlhxPRFSKtpXz7BEezkUi5CJqN4d2qNoBK9kapljFYEVdPjRqaBnt4blmyFRXjhdMNwA",
                    "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJuZWVkX3BhdGllbnRfYmFubmVyIjp0cnVlLCJzbWFydF9zdHlsZV91cmwiOiJodHRwczovL2xhdW5jaC5zbWFydGhlYWx0aGl0Lm9yZy9zbWFydC1zdHlsZS5qc29uIiwicGF0aWVudCI6ImIyNTM2ZGQzLWJjY2QtNGQyMi04MzU1LWFiMjBhY2RmMjQwYiIsImVuY291bnRlciI6ImUzZWMyZDE1LTRjMjctNDYwNy1hNDVjLTJmODQ5NjJiMDcwMCIsInJlZnJlc2hfdG9rZW4iOiJleUowZVhBaU9pSktWMVFpTENKaGJHY2lPaUpJVXpJMU5pSjkuZXlKamIyNTBaWGgwSWpwN0ltNWxaV1JmY0dGMGFXVnVkRjlpWVc1dVpYSWlPblJ5ZFdVc0luTnRZWEowWDNOMGVXeGxYM1Z5YkNJNkltaDBkSEJ6T2k4dmJHRjFibU5vTG5OdFlYSjBhR1ZoYkhSb2FYUXViM0puTDNOdFlYSjBMWE4wZVd4bExtcHpiMjRpTENKd1lYUnBaVzUwSWpvaVlqSTFNelprWkRNdFltTmpaQzAwWkRJeUxUZ3pOVFV0WVdJeU1HRmpaR1l5TkRCaUlpd2laVzVqYjNWdWRHVnlJam9pWlRObFl6SmtNVFV0TkdNeU55MDBOakEzTFdFME5XTXRNbVk0TkRrMk1tSXdOekF3SW4wc0ltTnNhV1Z1ZEY5cFpDSTZJbTE1WDNkbFlsOWhjSEFpTENKelkyOXdaU0k2SW05d1pXNXBaQ0JtYUdseVZYTmxjaUJ2Wm1ac2FXNWxYMkZqWTJWemN5QjFjMlZ5THlvdUtpQndZWFJwWlc1MEx5b3VLaUJzWVhWdVkyZ3ZaVzVqYjNWdWRHVnlJR3hoZFc1amFDOXdZWFJwWlc1MElIQnliMlpwYkdVaUxDSjFjMlZ5SWpvaVVISmhZM1JwZEdsdmJtVnlMM050WVhKMExWQnlZV04wYVhScGIyNWxjaTAzTVRRNE1qY3hNeUlzSW1saGRDSTZNVFUxT1RFek9Ea3hNeXdpWlhod0lqb3hOVGt3TmpjME9URTBmUS4tRXk3d2RGU2xtZm9Rcm03SE54QWdKUUJKUEtkdGZIN2tMMVo5MUw2MF84IiwidG9rZW5fdHlwZSI6ImJlYXJlciIsInNjb3BlIjoib3BlbmlkIGZoaXJVc2VyIG9mZmxpbmVfYWNjZXNzIHVzZXIvKi4qIHBhdGllbnQvKi4qIGxhdW5jaC9lbmNvdW50ZXIgbGF1bmNoL3BhdGllbnQgcHJvZmlsZSIsImNsaWVudF9pZCI6Im15X3dlYl9hcHAiLCJleHBpcmVzX2luIjozNjAwLCJpZF90b2tlbiI6ImV5SjBlWEFpT2lKS1YxUWlMQ0poYkdjaU9pSlNVekkxTmlKOS5leUp3Y205bWFXeGxJam9pVUhKaFkzUnBkR2x2Ym1WeUwzTnRZWEowTFZCeVlXTjBhWFJwYjI1bGNpMDNNVFE0TWpjeE15SXNJbVpvYVhKVmMyVnlJam9pVUhKaFkzUnBkR2x2Ym1WeUwzTnRZWEowTFZCeVlXTjBhWFJwYjI1bGNpMDNNVFE0TWpjeE15SXNJbUYxWkNJNkltMTVYM2RsWWw5aGNIQWlMQ0p6ZFdJaU9pSmtZakl6WkRCa1pUSTFOamM0WlRZM01EazVZbU0wTXpRek1qTmtZekJrT1RZMU1UTmlOVFV5TW1RMFlqYzBNV05pWVRNNVpqZGpPVEprTUdNME5tRmxJaXdpYVhOeklqb2lhSFIwY0RvdkwyeGhkVzVqYUM1emJXRnlkR2hsWVd4MGFHbDBMbTl5WnlJc0ltbGhkQ0k2TVRVMU9URXpPRGt4TkN3aVpYaHdJam94TlRVNU1UUXlOVEUwZlEuT3RiSWNzNW55RUthRDJrQVBhc20xRFlGaXhIdlZia0Mxd1F5czNvYTNULTRUZjh3eFc1Nmh6VUswWlFlT0tfZ0VJeGlTRm45dExvVXZLYXVfTTFXUlZEMTFGUHl1bHZzMVE4RWJHNVBRODNNQnVkY3BaUUpfdXVGYlZjR3NETXkyeEVhXzhqQUhrSFBBVk5qajhGUnNRQ1JaQzBIZmcwTmJYbGkzeU9oQUZLMUxxVFVjcm5qZndELXNhazBVR1FTMUg2T2dJTG5UWUxybFRUSW9uZm5XUmRwV0pqakloM19HQ2s1ay04TFU4QUFSYVBjU0UzWmhlem9LVFNmd1FuMVhPMTAxZzVoMzM3cFpsZWFJbEZsaHhQUkZTS3RwWHo3QkVlemtVaTVDSnFONGQycU5vQks5a2FwbGpGWUVWZFBqUnFhQm50NGJsbXlGUlhqaGRNTndBIiwiaWF0IjoxNTU5MTM4OTE0LCJleHAiOjE1NTkxNDI1MTR9.lhfmhXYfoaI4QcJYvFnr2FMn_RHO8aXSzzkXzwNpc7w",
                    "code": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJjb250ZXh0Ijp7Im5lZWRfcGF0aWVudF9iYW5uZXIiOnRydWUsInNtYXJ0X3N0eWxlX3VybCI6Imh0dHBzOi8vbGF1bmNoLnNtYXJ0aGVhbHRoaXQub3JnL3NtYXJ0LXN0eWxlLmpzb24iLCJwYXRpZW50IjoiYjI1MzZkZDMtYmNjZC00ZDIyLTgzNTUtYWIyMGFjZGYyNDBiIiwiZW5jb3VudGVyIjoiZTNlYzJkMTUtNGMyNy00NjA3LWE0NWMtMmY4NDk2MmIwNzAwIn0sImNsaWVudF9pZCI6Im15X3dlYl9hcHAiLCJzY29wZSI6Im9wZW5pZCBmaGlyVXNlciBvZmZsaW5lX2FjY2VzcyB1c2VyLyouKiBwYXRpZW50LyouKiBsYXVuY2gvZW5jb3VudGVyIGxhdW5jaC9wYXRpZW50IHByb2ZpbGUiLCJ1c2VyIjoiUHJhY3RpdGlvbmVyL3NtYXJ0LVByYWN0aXRpb25lci03MTQ4MjcxMyIsImlhdCI6MTU1OTEzODkxMywiZXhwIjoxNTU5MTM5MjEzfQ.G2dLcSnjpwM_joWTxWLfL48vhdlj3zGV9Os5cKREYcY",
                    state
                }
            });

            env.redirect("http://localhost/?code=123&state=" + state);
            const client = await smart.ready(env);

            expect(await Storage.get(smart.KEY), `must have set a state at ${smart.KEY}`).to.exist;
            expect(client.getPatientId()).to.equal("b2536dd3-bccd-4d22-8355-ab20acdf240b");
            expect(client.getEncounterId()).to.equal("e3ec2d15-4c27-4607-a45c-2f84962b0700");
            expect(client.getUserId()).to.equal("smart-Practitioner-71482713");
            expect(client.getUserType()).to.equal("Practitioner");
        });
    });

    describe("smart", () => {
        describe('PKCE', () => {
            it ("use when supported and required", async () => {
                const env = new BrowserEnv();

                applyDefaultMocks(mockServer)

                // Call our launch code.
                const redirect = await authorize(env, {
                    iss     : mockUrl,
                    launch  : "123",
                    scope   : "my_scope",
                    clientId: "my_client_id",
                    pkceMode: 'required',
                });

                // Now we have been redirected to `redirect` and then back to our
                // redirectUri. It is time to complete the authorization.
                expect(redirect.searchParams.has('code_challenge')).to.be.true;
                expect(redirect.searchParams.has('code_challenge_method')).to.be.true;
                expect(redirect.searchParams.get('code_challenge_method')).to.equal(mockCodeChallengeMethods[0]);
            });

            it ("fail when not supported and required", async () => {
                const env = new BrowserEnv();

                applyDefaultMocks(mockServer, { codeChallengeMethodsSupported: [] })

                await expect(
                    smart.authorize(env, {
                        iss     : mockUrl,
                        launch  : "123",
                        scope   : "my_scope",
                        clientId: "my_client_id",
                        pkceMode: 'required',
                    })
                ).to.be.rejectedWith(Error, /PKCE/);
            });

            it ("use when supported and optional", async () => {
                const env = new BrowserEnv();

                // mock our oauth endpoints
                applyDefaultMocks(mockServer)

                // Call our launch code.
                const redirect = await authorize(env, {
                    iss     : mockUrl,
                    launch  : "123",
                    scope   : "my_scope",
                    clientId: "my_client_id",
                    pkceMode: 'ifSupported',
                });

                // Now we have been redirected to `redirect` and then back to our
                // redirectUri. It is time to complete the authorization.
                expect(redirect.searchParams.has('code_challenge')).to.be.true;
                expect(redirect.searchParams.has('code_challenge_method')).to.be.true;
                expect(redirect.searchParams.get('code_challenge_method')).to.equal(mockCodeChallengeMethods[0]);
            });

            it ("do not use when not supported and optional", async () => {
                const env = new BrowserEnv();

                // mock our oauth endpoints
                applyDefaultMocks(mockServer, { codeChallengeMethodsSupported: [] })

                // Call our launch code.
                const redirect = await authorize(env, {
                    iss: mockUrl,
                    launch: "123",
                    scope: "my_scope",
                    clientId: "my_client_id",
                    pkceMode: 'ifSupported',
                });

                // Now we have been redirected to `redirect` and then back to our
                // redirectUri. It is time to complete the authorization.
                expect(redirect.searchParams.has('code_challenge')).to.be.false;
                expect(redirect.searchParams.has('code_challenge_method')).to.be.false;
            });

            it ("do not use when supported and disabled", async () => {
                const env = new BrowserEnv();

                // mock our oauth endpoints
                applyDefaultMocks(mockServer)

                // Call our launch code.
                const redirect = await authorize(env, {
                    iss: mockUrl,
                    launch: "123",
                    scope: "my_scope",
                    clientId: "my_client_id",
                    pkceMode: 'disabled',
                });

                // Now we have been redirected to `redirect` and then back to our
                // redirectUri. It is time to complete the authorization.
                expect(redirect.searchParams.has('code_challenge')).to.be.false;
                expect(redirect.searchParams.has('code_challenge_method')).to.be.false;
            });

            it ("do not use when not supported and disabled", async () => {
                const env = new BrowserEnv();

                // mock our oauth endpoints
                applyDefaultMocks(mockServer, { codeChallengeMethodsSupported: [] });

                // Call our launch code.
                const redirect = await authorize(env, {
                    iss: mockUrl,
                    launch: "123",
                    scope: "my_scope",
                    clientId: "my_client_id",
                    pkceMode: 'ifSupported',
                });

                // Now we have been redirected to `redirect` and then back to our
                // redirectUri. It is time to complete the authorization.
                expect(redirect.searchParams.has('code_challenge')).to.be.false;
                expect(redirect.searchParams.has('code_challenge_method')).to.be.false;
            });
        });

        describe("fetchWellKnownJson", () => {
            it("works", async () => {
                mockServer.mock("/.well-known/smart-configuration", {
                    headers: { "content-type": "application/json" },
                    status: 200,
                    body: {
                        resourceType: "fetchWellKnownJson"
                    }
                });
                const conformance = await smart.fetchWellKnownJson(mockUrl);
                // @ts-ignore
                expect(conformance).to.deep.equal({resourceType: "fetchWellKnownJson"});
            });

            it("rejects on error", async () => {
                mockServer.mock("/.well-known/smart-configuration", {
                    status: 404,
                    body: "Not Found"
                });
                await expect(smart.fetchWellKnownJson(mockUrl)).to.be.rejectedWith(Error, /Not Found/);
            });
        });

        describe("getSecurityExtensions", () => {
            it("works with .well-known/smart-configuration", async () => {
                mockServer.mock("/.well-known/smart-configuration", {
                    headers: { "content-type": "application/json" },
                    status: 200,
                    body: {
                        registration_endpoint : "https://my-register-uri",
                        authorization_endpoint: "https://my-authorize-uri",
                        token_endpoint        : "https://my-token-uri"
                    }
                });

                const result = await smart.getSecurityExtensions(mockUrl);
                expect(result).to.deep.equal({
                    registrationUri     : "https://my-register-uri",
                    authorizeUri        : "https://my-authorize-uri",
                    tokenUri            : "https://my-token-uri",
                    codeChallengeMethods: []
                });
            });

            it("works with .well-known/smart-configuration - PKCE advertised", async () => {
                mockServer.mock("/.well-known/smart-configuration", {
                    headers: { "content-type": "application/json" },
                    status: 200,
                    body: {
                        registration_endpoint           : "https://my-register-uri",
                        authorization_endpoint          : "https://my-authorize-uri",
                        token_endpoint                  : "https://my-token-uri",
                        code_challenge_methods_supported: mockCodeChallengeMethods,
                    }
                });

                const result = await smart.getSecurityExtensions(mockUrl);
                expect(result).to.deep.equal({
                    registrationUri     : "https://my-register-uri",
                    authorizeUri        : "https://my-authorize-uri",
                    tokenUri            : "https://my-token-uri",
                    codeChallengeMethods: ['S256'],
                });
            });

            it("fails back to conformance if .well-known/smart-configuration is bad", async () => {
                mockServer.mock("/.well-known/smart-configuration", {
                    headers: { "content-type": "application/json" },
                    status : 200,
                    body   : {
                        registration_endpoint: "whatever"
                    }
                });
                mockServer.mock("/metadata", {
                    headers: { "content-type": "application/json" },
                    status: 200,
                    body: {
                        rest: [
                            {
                                security: {
                                    extension: [
                                        {
                                            url: "http://fhir-registry.smarthealthit.org/StructureDefinition/oauth-uris",
                                            extension: [
                                                {
                                                    url: "authorize",
                                                    valueUri: "https://my-authorize-uri"
                                                },
                                                {
                                                    url: "token",
                                                    valueUri: "https://my-token-uri"
                                                },
                                                {
                                                    url: "register",
                                                    valueUri: "https://my-registration-uri"
                                                }
                                            ]
                                        }
                                    ]
                                }
                            }
                        ]
                    }
                });

                const result = await smart.getSecurityExtensions(mockUrl);
                expect(result).to.deep.equal({
                    registrationUri     : "https://my-registration-uri",
                    authorizeUri        : "https://my-authorize-uri",
                    tokenUri            : "https://my-token-uri",
                    codeChallengeMethods: [],
                });
            });

            it("works with conformance statement", async () => {
                mockServer.mock("/.well-known/smart-configuration", {
                    status: 200,
                    headers: { "content-type": "application/json" },
                    body: {
                        authorization_endpoint: "whatever"
                    }
                });
                mockServer.mock("/metadata", {
                    headers: { "content-type": "application/json" },
                    status: 200,
                    body: {
                        rest: [
                            {
                                security: {
                                    extension: [
                                        {
                                            url: "http://fhir-registry.smarthealthit.org/StructureDefinition/oauth-uris",
                                            extension: [
                                                {
                                                    url: "authorize",
                                                    valueUri: "https://my-authorize-uri"
                                                },
                                                {
                                                    url: "token",
                                                    valueUri: "https://my-token-uri"
                                                }
                                            ]
                                        }
                                    ]
                                }
                            }
                        ]
                    }
                });

                const result = await smart.getSecurityExtensions(mockUrl);
                expect(result).to.deep.equal({
                    registrationUri     : "",
                    authorizeUri        : "https://my-authorize-uri",
                    tokenUri            : "https://my-token-uri",
                    codeChallengeMethods: [],
                });
            });

            it("returns empty endpoints for open servers", async () => {
                mockServer.mock("/.well-known/smart-configuration", {
                    status: 404,
                    body: "Not Found"
                });
                mockServer.mock("/metadata", {
                    headers: { "content-type": "application/json" },
                    status: 200,
                    body: {rest: [{}]}
                });

                const result = await smart.getSecurityExtensions(mockUrl);
                expect(result).to.deep.equal({
                    registrationUri     : "",
                    authorizeUri        : "",
                    tokenUri            : "",
                    codeChallengeMethods: [],
                });
            });

            it("returns empty endpoints for missing conformance", async () => {
                mockServer.mock("/.well-known/smart-configuration", {
                    status: 404,
                    body: "Not Found"
                });
                mockServer.mock("/metadata", {
                    headers: { "content-type": "application/json" },
                    status: 200,
                    // body: {}
                });

                const result = await smart.getSecurityExtensions(mockUrl);
                expect(result).to.deep.equal({
                    registrationUri     : "",
                    authorizeUri        : "",
                    tokenUri            : "",
                    codeChallengeMethods: [],
                });
            });

            it("rejects on error", async () => {
                mockServer.mock("/.well-known/smart-configuration", {
                    headers: { "content-type": "application/json" },
                    status: 400,
                    body: {
                        authorization_endpoint: "whatever"
                    }
                });
                mockServer.mock("/metadata", {
                    headers: { "content-type": "application/json" },
                    status: 400,
                    body: {}
                });
                await expect(smart.getSecurityExtensions(mockUrl)).to.be.rejected;
            });
        });

        describe("authorize", () => {

            it ("throws if no serverUrl", async () => {
                await expect(smart.authorize(new BrowserEnv(), {})).to.be.rejectedWith(Error, /No server url found/);
            });

            it ("accepts encounterId parameter", async () => {
                const env = new BrowserEnv();
                const url = await smart.authorize(env, {
                    fhirServiceUrl: "http://localhost",
                    encounterId: "whatever",
                    noRedirect: true
                });
                const state = (new URL(url as string)).searchParams.get("state")!;
                expect(await env.getStorage().get(state)).to
                    .haveOwnProperty("tokenResponse").that.include({ encounter: "whatever" });
            });

            it ("accepts patientId parameter", async () => {
                const env = new BrowserEnv();
                const url = await smart.authorize(env, {
                    fhirServiceUrl: "http://localhost",
                    patientId: "whatever",
                    noRedirect: true
                });
                const state = (new URL(url as string)).searchParams.get("state")!;
                expect(await env.getStorage().get(state)).to
                    .haveOwnProperty("tokenResponse").that.include({ patient: "whatever" });
            });

            it ("accepts fakeTokenResponse parameter", async () => {
                const env = new BrowserEnv();
                const url = await smart.authorize(env, {
                    fhirServiceUrl: "http://localhost",
                    fakeTokenResponse: { a: 1, b: 2 },
                    noRedirect: true
                });
                const state = (new URL(url as string)).searchParams.get("state")!;
                expect(await env.getStorage().get(state)).to
                    .haveOwnProperty("tokenResponse").that.include({ a: 1, b: 2 });
            });

            it ("accepts iss parameter from url", async () => {
                const env = new BrowserEnv({});
                applyDefaultMocks(mockServer);
                env.redirect("http://localhost/?iss=" + mockUrl);
                const url = await smart.authorize(env, {
                    fhirServiceUrl: "http://localhost",
                    fakeTokenResponse: { a: 1, b: 2 },
                    noRedirect: true
                });
                const aud = (new URL(url as string)).searchParams.get("aud");
                expect(aud).to.equal(mockUrl);
            });

            it ("makes early redirect if the server has no authorizeUri", async () => {
                const env = new BrowserEnv({});
                applyDefaultMocks(mockServer, { authorizeUri: "" });
                env.redirect("http://localhost/?iss=" + mockUrl);
                const url = await smart.authorize(env, {
                    fhirServiceUrl: "http://localhost",
                    fakeTokenResponse: { a: 1, b: 2 },
                    redirectUri: "x",
                    noRedirect: true
                });

                expect(String(url).indexOf("http://localhost/x?state=")).to.equal(0);
            });

            it ("works with absolute redirectUri", async () => {
                const env = new BrowserEnv();
                const url = await smart.authorize(env, {
                    fhirServiceUrl: "http://localhost",
                    redirectUri: "https://test.com",
                    noRedirect: true
                });
                const state = (new URL(url as string)).searchParams.get("state")!;
                expect(await env.getStorage().get(state)).to.include({
                    redirectUri: "https://test.com"
                });
            });

            // multi-config ---------------------------------------------------
            it ("requires iss url param in multi mode", () => {
                const env = new BrowserEnv({});
                expect(smart.authorize(env, [{noRedirect: true}])).to.be.rejectedWith(/"iss" url parameter is required/);
            });

            it ("throws if no matching config is found", () => {
                const env = new BrowserEnv({});
                env.redirect("http://localhost/?iss=" + mockUrl);
                expect(smart.authorize(env, [
                    {
                        // no issMatch
                    },
                    {
                        // invalid issMatch type
                        // @ts-ignore
                        issMatch: 5
                    },
                    {
                        issMatch: "b"
                    }
                ])).to.be.rejectedWith(/No configuration found matching the current "iss" parameter/);
            });

            it ("can match using String", async () => {
                const env = new BrowserEnv({});
                applyDefaultMocks(mockServer, { authorizeUri: "" });
                env.redirect("http://localhost/?iss=" + mockUrl);
                const url = await smart.authorize(env, [
                    {
                        issMatch: "whatever",
                        fhirServiceUrl: "http://localhost",
                        fakeTokenResponse: { a: 1, b: 2 },
                        redirectUri: "y",
                        noRedirect: true
                    },
                    {
                        issMatch: mockUrl,
                        fhirServiceUrl: "http://localhost",
                        fakeTokenResponse: { a: 1, b: 2 },
                        redirectUri: "x",
                        noRedirect: true
                    }
                ]);

                expect(String(url).indexOf("http://localhost/x?state=")).to.equal(0);
            });

            it ("can match using RegExp", async () => {
                const env = new BrowserEnv({});
                applyDefaultMocks(mockServer, { authorizeUri: "" });
                env.redirect("http://localhost/?iss=" + mockUrl);
                const url = await smart.authorize(env, [
                    {
                        issMatch: "whatever",
                        fhirServiceUrl: "http://localhost",
                        fakeTokenResponse: { a: 1, b: 2 },
                        redirectUri: "y",
                        noRedirect: true
                    },
                    {
                        issMatch: /^http\:\/\/localhost\b/,
                        fhirServiceUrl: "http://localhost",
                        fakeTokenResponse: { a: 1, b: 2 },
                        redirectUri: "x",
                        noRedirect: true
                    }
                ]);

                expect(String(url).indexOf("http://localhost/x?state=")).to.equal(0);
            });

            it ("can match using Function", async () => {
                const env = new BrowserEnv({});
                applyDefaultMocks(mockServer, { authorizeUri: "" });
                env.redirect("http://localhost/?iss=" + mockUrl);
                const url = await smart.authorize(env, [
                    {
                        issMatch: (iss) => false,
                        fhirServiceUrl: "http://localhost",
                        fakeTokenResponse: { a: 1, b: 2 },
                        redirectUri: "y",
                        noRedirect: true
                    },
                    {
                        issMatch: (iss) => iss === mockUrl,
                        fhirServiceUrl: "http://localhost",
                        fakeTokenResponse: { a: 1, b: 2 },
                        redirectUri: "x",
                        noRedirect: true
                    }
                ]);

                expect(String(url).indexOf("http://localhost/x?state=")).to.equal(0);
            });

            it ("can match using fhirServiceUrl", async () => {
                const env = new BrowserEnv({});
                applyDefaultMocks(mockServer, { authorizeUri: "" });
                env.redirect("http://localhost/?fhirServiceUrl=" + mockUrl);
                const url = await smart.authorize(env, [
                    {
                        issMatch: (iss) => false,
                        fhirServiceUrl: "http://localhost",
                        fakeTokenResponse: { a: 1, b: 2 },
                        redirectUri: "y",
                        noRedirect: true
                    },
                    {
                        issMatch: (iss) => iss === mockUrl,
                        fhirServiceUrl: "http://localhost",
                        fakeTokenResponse: { a: 1, b: 2 },
                        redirectUri: "x",
                        noRedirect: true
                    }
                ]);

                expect(String(url).indexOf("http://localhost/x?state=")).to.equal(0);
            });
        });

        describe("ready", () => {

            it ("rejects with error and error_description from the url", async () => {
                const env = new BrowserEnv();
                env.redirect("http://localhost/?error=test-error");
                await expect(smart.ready(env))
                    .to.be.rejectedWith(Error, "test-error");
                env.redirect("http://localhost/?error_description=test-error-description");
                await expect(smart.ready(env))
                    .to.be.rejectedWith(Error, "test-error-description");
                env.redirect("http://localhost/?error=test-error&error_description=test-error-description");
                await expect(smart.ready(env))
                    .to.be.rejectedWith(Error, "test-error: test-error-description");
            });

            it ("rejects with missing key", async () => {
                const env = new BrowserEnv();
                env.redirect("http://localhost/");
                await expect(smart.ready(env))
                    .to.be.rejectedWith(Error, /^No 'state' parameter found/);
            });

            it ("rejects with empty state", async () => {
                const env = new BrowserEnv();
                env.redirect("http://localhost/?state=whatever");
                await expect(smart.ready(env))
                    .to.be.rejectedWith(Error, /No state found/);
            });

        });

        describe("buildTokenRequest", () => {
            it ("rejects with missing state.redirectUri", () => {
                // @ts-ignore
                expect(smart.buildTokenRequest(new BrowserEnv(), { code: "whatever", state: {} }))
                    .to.be.rejectedWith("Missing state.redirectUri");
            });
            it ("rejects with missing state.tokenUri", () => {
                expect(smart.buildTokenRequest(new BrowserEnv(), {
                    code: "whatever",
                    // @ts-ignore
                    state: {
                        redirectUri: "whatever"
                    }
                })).to.be.rejectedWith("Missing state.tokenUri");
            });
            it ("rejects with missing state.clientId", () => {
                expect(smart.buildTokenRequest(new BrowserEnv(), {
                    code: "whatever",
                    // @ts-ignore
                    state: {
                        redirectUri: "whatever",
                        tokenUri: "whatever"
                    }
                })).to.be.rejectedWith("Missing state.clientId");
            });
            it("uses state.codeVerifier", async () => {
                const requestOptions = await smart.buildTokenRequest(
                    new BrowserEnv(),
                    {
                        code: "whatever",
                        state: {
                            serverUrl: 'whatever',
                            redirectUri: 'whatever',
                            tokenUri: 'whatever',
                            clientId: 'whatever',
                            codeVerifier: 'whatever',
                        }
                    }
                );
                expect(requestOptions.body).to.exist;
                expect(requestOptions.body).to.contain('&code_verifier=');
            });
        });

        describe("init", () => {
            it ("works in standalone mode", async () => {
                
                // well-known
                mockServer.mock("/.well-known/smart-configuration", {
                    headers: { "content-type": "application/json" },
                    status: 200,
                    body: {
                        authorization_endpoint: mockServer.baseUrl + "/authorize",
                        token_endpoint: mockServer.baseUrl + "/token"
                    }
                });
            
                // token response
                mockServer.mock({ path: "/token", method: "post" }, {
                    headers: { "content-type": "application/json" },
                    status: 200,
                    body: {
                        "need_patient_banner": true,
                        "smart_style_url": "https://launch.smarthealthit.org/smart-style.json",
                        "patient": "b2536dd3-bccd-4d22-8355-ab20acdf240b",
                        "encounter": "e3ec2d15-4c27-4607-a45c-2f84962b0700",
                        "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJjb250ZXh0Ijp7Im5lZWRfcGF0aWVudF9iYW5uZXIiOnRydWUsInNtYXJ0X3N0eWxlX3VybCI6Imh0dHBzOi8vbGF1bmNoLnNtYXJ0aGVhbHRoaXQub3JnL3NtYXJ0LXN0eWxlLmpzb24iLCJwYXRpZW50IjoiYjI1MzZkZDMtYmNjZC00ZDIyLTgzNTUtYWIyMGFjZGYyNDBiIiwiZW5jb3VudGVyIjoiZTNlYzJkMTUtNGMyNy00NjA3LWE0NWMtMmY4NDk2MmIwNzAwIn0sImNsaWVudF9pZCI6Im15X3dlYl9hcHAiLCJzY29wZSI6Im9wZW5pZCBmaGlyVXNlciBvZmZsaW5lX2FjY2VzcyB1c2VyLyouKiBwYXRpZW50LyouKiBsYXVuY2gvZW5jb3VudGVyIGxhdW5jaC9wYXRpZW50IHByb2ZpbGUiLCJ1c2VyIjoiUHJhY3RpdGlvbmVyL3NtYXJ0LVByYWN0aXRpb25lci03MTQ4MjcxMyIsImlhdCI6MTU1OTEzODkxMywiZXhwIjoxNTkwNjc0OTE0fQ.-Ey7wdFSlmfoQrm7HNxAgJQBJPKdtfH7kL1Z91L60_8",
                        "token_type": "bearer",
                        "scope": "openid fhirUser offline_access user/*.* patient/*.* launch/encounter launch/patient profile",
                        "client_id": "my_web_app",
                        "expires_in": 3600,
                        "id_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJwcm9maWxlIjoiUHJhY3RpdGlvbmVyL3NtYXJ0LVByYWN0aXRpb25lci03MTQ4MjcxMyIsImZoaXJVc2VyIjoiUHJhY3RpdGlvbmVyL3NtYXJ0LVByYWN0aXRpb25lci03MTQ4MjcxMyIsImF1ZCI6Im15X3dlYl9hcHAiLCJzdWIiOiJkYjIzZDBkZTI1Njc4ZTY3MDk5YmM0MzQzMjNkYzBkOTY1MTNiNTUyMmQ0Yjc0MWNiYTM5ZjdjOTJkMGM0NmFlIiwiaXNzIjoiaHR0cDovL2xhdW5jaC5zbWFydGhlYWx0aGl0Lm9yZyIsImlhdCI6MTU1OTEzODkxNCwiZXhwIjoxNTU5MTQyNTE0fQ.OtbIcs5nyEKaD2kAPasm1DYFixHvVbkC1wQys3oa3T-4Tf8wxW56hzUK0ZQeOK_gEIxiSFn9tLoUvKau_M1WRVD11FPyulvs1Q8EbG5PQ83MBudcpZQJ_uuFbVcGsDMy2xEa_8jAHkHPAVNjj8FRsQCRZC0Hfg0NbXli3yOhAFK1LqTUcrnjfwD-sak0UGQS1H6OgILnTYLrlTTIonfnWRdpWJjjIh3_GCk5k-8LU8AARaPcSE3ZhezoKTSfwQn1XO101g5h337pZleaIlFlhxPRFSKtpXz7BEezkUi5CJqN4d2qNoBK9kapljFYEVdPjRqaBnt4blmyFRXjhdMNwA",
                        "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJuZWVkX3BhdGllbnRfYmFubmVyIjp0cnVlLCJzbWFydF9zdHlsZV91cmwiOiJodHRwczovL2xhdW5jaC5zbWFydGhlYWx0aGl0Lm9yZy9zbWFydC1zdHlsZS5qc29uIiwicGF0aWVudCI6ImIyNTM2ZGQzLWJjY2QtNGQyMi04MzU1LWFiMjBhY2RmMjQwYiIsImVuY291bnRlciI6ImUzZWMyZDE1LTRjMjctNDYwNy1hNDVjLTJmODQ5NjJiMDcwMCIsInJlZnJlc2hfdG9rZW4iOiJleUowZVhBaU9pSktWMVFpTENKaGJHY2lPaUpJVXpJMU5pSjkuZXlKamIyNTBaWGgwSWpwN0ltNWxaV1JmY0dGMGFXVnVkRjlpWVc1dVpYSWlPblJ5ZFdVc0luTnRZWEowWDNOMGVXeGxYM1Z5YkNJNkltaDBkSEJ6T2k4dmJHRjFibU5vTG5OdFlYSjBhR1ZoYkhSb2FYUXViM0puTDNOdFlYSjBMWE4wZVd4bExtcHpiMjRpTENKd1lYUnBaVzUwSWpvaVlqSTFNelprWkRNdFltTmpaQzAwWkRJeUxUZ3pOVFV0WVdJeU1HRmpaR1l5TkRCaUlpd2laVzVqYjNWdWRHVnlJam9pWlRObFl6SmtNVFV0TkdNeU55MDBOakEzTFdFME5XTXRNbVk0TkRrMk1tSXdOekF3SW4wc0ltTnNhV1Z1ZEY5cFpDSTZJbTE1WDNkbFlsOWhjSEFpTENKelkyOXdaU0k2SW05d1pXNXBaQ0JtYUdseVZYTmxjaUJ2Wm1ac2FXNWxYMkZqWTJWemN5QjFjMlZ5THlvdUtpQndZWFJwWlc1MEx5b3VLaUJzWVhWdVkyZ3ZaVzVqYjNWdWRHVnlJR3hoZFc1amFDOXdZWFJwWlc1MElIQnliMlpwYkdVaUxDSjFjMlZ5SWpvaVVISmhZM1JwZEdsdmJtVnlMM050WVhKMExWQnlZV04wYVhScGIyNWxjaTAzTVRRNE1qY3hNeUlzSW1saGRDSTZNVFUxT1RFek9Ea3hNeXdpWlhod0lqb3hOVGt3TmpjME9URTBmUS4tRXk3d2RGU2xtZm9Rcm03SE54QWdKUUJKUEtkdGZIN2tMMVo5MUw2MF84IiwidG9rZW5fdHlwZSI6ImJlYXJlciIsInNjb3BlIjoib3BlbmlkIGZoaXJVc2VyIG9mZmxpbmVfYWNjZXNzIHVzZXIvKi4qIHBhdGllbnQvKi4qIGxhdW5jaC9lbmNvdW50ZXIgbGF1bmNoL3BhdGllbnQgcHJvZmlsZSIsImNsaWVudF9pZCI6Im15X3dlYl9hcHAiLCJleHBpcmVzX2luIjozNjAwLCJpZF90b2tlbiI6ImV5SjBlWEFpT2lKS1YxUWlMQ0poYkdjaU9pSlNVekkxTmlKOS5leUp3Y205bWFXeGxJam9pVUhKaFkzUnBkR2x2Ym1WeUwzTnRZWEowTFZCeVlXTjBhWFJwYjI1bGNpMDNNVFE0TWpjeE15SXNJbVpvYVhKVmMyVnlJam9pVUhKaFkzUnBkR2x2Ym1WeUwzTnRZWEowTFZCeVlXTjBhWFJwYjI1bGNpMDNNVFE0TWpjeE15SXNJbUYxWkNJNkltMTVYM2RsWWw5aGNIQWlMQ0p6ZFdJaU9pSmtZakl6WkRCa1pUSTFOamM0WlRZM01EazVZbU0wTXpRek1qTmtZekJrT1RZMU1UTmlOVFV5TW1RMFlqYzBNV05pWVRNNVpqZGpPVEprTUdNME5tRmxJaXdpYVhOeklqb2lhSFIwY0RvdkwyeGhkVzVqYUM1emJXRnlkR2hsWVd4MGFHbDBMbTl5WnlJc0ltbGhkQ0k2TVRVMU9URXpPRGt4TkN3aVpYaHdJam94TlRVNU1UUXlOVEUwZlEuT3RiSWNzNW55RUthRDJrQVBhc20xRFlGaXhIdlZia0Mxd1F5czNvYTNULTRUZjh3eFc1Nmh6VUswWlFlT0tfZ0VJeGlTRm45dExvVXZLYXVfTTFXUlZEMTFGUHl1bHZzMVE4RWJHNVBRODNNQnVkY3BaUUpfdXVGYlZjR3NETXkyeEVhXzhqQUhrSFBBVk5qajhGUnNRQ1JaQzBIZmcwTmJYbGkzeU9oQUZLMUxxVFVjcm5qZndELXNhazBVR1FTMUg2T2dJTG5UWUxybFRUSW9uZm5XUmRwV0pqakloM19HQ2s1ay04TFU4QUFSYVBjU0UzWmhlem9LVFNmd1FuMVhPMTAxZzVoMzM3cFpsZWFJbEZsaHhQUkZTS3RwWHo3QkVlemtVaTVDSnFONGQycU5vQks5a2FwbGpGWUVWZFBqUnFhQm50NGJsbXlGUlhqaGRNTndBIiwiaWF0IjoxNTU5MTM4OTE0LCJleHAiOjE1NTkxNDI1MTR9.lhfmhXYfoaI4QcJYvFnr2FMn_RHO8aXSzzkXzwNpc7w",
                        "code": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJjb250ZXh0Ijp7Im5lZWRfcGF0aWVudF9iYW5uZXIiOnRydWUsInNtYXJ0X3N0eWxlX3VybCI6Imh0dHBzOi8vbGF1bmNoLnNtYXJ0aGVhbHRoaXQub3JnL3NtYXJ0LXN0eWxlLmpzb24iLCJwYXRpZW50IjoiYjI1MzZkZDMtYmNjZC00ZDIyLTgzNTUtYWIyMGFjZGYyNDBiIiwiZW5jb3VudGVyIjoiZTNlYzJkMTUtNGMyNy00NjA3LWE0NWMtMmY4NDk2MmIwNzAwIn0sImNsaWVudF9pZCI6Im15X3dlYl9hcHAiLCJzY29wZSI6Im9wZW5pZCBmaGlyVXNlciBvZmZsaW5lX2FjY2VzcyB1c2VyLyouKiBwYXRpZW50LyouKiBsYXVuY2gvZW5jb3VudGVyIGxhdW5jaC9wYXRpZW50IHByb2ZpbGUiLCJ1c2VyIjoiUHJhY3RpdGlvbmVyL3NtYXJ0LVByYWN0aXRpb25lci03MTQ4MjcxMyIsImlhdCI6MTU1OTEzODkxMywiZXhwIjoxNTU5MTM5MjEzfQ.G2dLcSnjpwM_joWTxWLfL48vhdlj3zGV9Os5cKREYcY"
                    }
                });

                const env = new BrowserEnv();

                const authorizeOptions: fhirclient.AuthorizeParams = {
                    clientId : "my_web_app",
                    scope     : "launch/patient",
                    iss       : mockServer.baseUrl
                };

                // We are on http://localhost/ now. Make the first call to init.
                // It should detect that we don't have both code and state
                // params in the url and call authorize() which will redirect
                // back to us with a "state" url param.
                const url = await init(env, authorizeOptions)
                const state = url.searchParams.get("state")

                // After the first call to init(), if we got here, we have been 
                // redirected. Check that we have a "state" url param.
                expect(state).to.exist;

                // Redirect as a server would have done
                env.redirect("http://localhost/?code=123&state=" + state);

                // Now call the same init again
                let client = await smart.init(env, authorizeOptions);

                expect(client.getPatientId()).to.equal("b2536dd3-bccd-4d22-8355-ab20acdf240b");
                expect(client.getEncounterId()).to.equal("e3ec2d15-4c27-4607-a45c-2f84962b0700");
                expect(client.getUserId()).to.equal("smart-Practitioner-71482713");
                expect(client.getUserType()).to.equal("Practitioner");

                // Now try once again to test the page refresh flow
                env.redirect("http://localhost/?state=" + state);

                client = await smart.init(env, authorizeOptions);

                expect(client.getPatientId()).to.equal("b2536dd3-bccd-4d22-8355-ab20acdf240b");
                expect(client.getEncounterId()).to.equal("e3ec2d15-4c27-4607-a45c-2f84962b0700");
                expect(client.getUserId()).to.equal("smart-Practitioner-71482713");
                expect(client.getUserType()).to.equal("Practitioner");
            });

            it ("works in EHR mode", async () => {
                const authorizeOptions: fhirclient.AuthorizeParams = {
                    clientId: "my_web_app",
                    scope   : "launch/patient",
                    iss     : mockServer.baseUrl
                }

                // well-known
                mockServer.mock("/.well-known/smart-configuration", {
                    headers: { "content-type": "application/json" },
                    status: 200,
                    body: {
                        authorization_endpoint: mockServer.baseUrl + "/authorize",
                        token_endpoint: mockServer.baseUrl + "/token"
                    }
                });

                // token response
                mockServer.mock({ path: "/token", method: "post" }, {
                    headers: { "content-type": "application/json" },
                    status: 200,
                    body: {
                        "need_patient_banner": true,
                        "smart_style_url": "https://launch.smarthealthit.org/smart-style.json",
                        "patient": "b2536dd3-bccd-4d22-8355-ab20acdf240b",
                        "encounter": "e3ec2d15-4c27-4607-a45c-2f84962b0700",
                        "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJjb250ZXh0Ijp7Im5lZWRfcGF0aWVudF9iYW5uZXIiOnRydWUsInNtYXJ0X3N0eWxlX3VybCI6Imh0dHBzOi8vbGF1bmNoLnNtYXJ0aGVhbHRoaXQub3JnL3NtYXJ0LXN0eWxlLmpzb24iLCJwYXRpZW50IjoiYjI1MzZkZDMtYmNjZC00ZDIyLTgzNTUtYWIyMGFjZGYyNDBiIiwiZW5jb3VudGVyIjoiZTNlYzJkMTUtNGMyNy00NjA3LWE0NWMtMmY4NDk2MmIwNzAwIn0sImNsaWVudF9pZCI6Im15X3dlYl9hcHAiLCJzY29wZSI6Im9wZW5pZCBmaGlyVXNlciBvZmZsaW5lX2FjY2VzcyB1c2VyLyouKiBwYXRpZW50LyouKiBsYXVuY2gvZW5jb3VudGVyIGxhdW5jaC9wYXRpZW50IHByb2ZpbGUiLCJ1c2VyIjoiUHJhY3RpdGlvbmVyL3NtYXJ0LVByYWN0aXRpb25lci03MTQ4MjcxMyIsImlhdCI6MTU1OTEzODkxMywiZXhwIjoxNTkwNjc0OTE0fQ.-Ey7wdFSlmfoQrm7HNxAgJQBJPKdtfH7kL1Z91L60_8",
                        "token_type": "bearer",
                        "scope": "openid fhirUser offline_access user/*.* patient/*.* launch/encounter launch/patient profile",
                        "client_id": "my_web_app",
                        "expires_in": 3600,
                        "id_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJwcm9maWxlIjoiUHJhY3RpdGlvbmVyL3NtYXJ0LVByYWN0aXRpb25lci03MTQ4MjcxMyIsImZoaXJVc2VyIjoiUHJhY3RpdGlvbmVyL3NtYXJ0LVByYWN0aXRpb25lci03MTQ4MjcxMyIsImF1ZCI6Im15X3dlYl9hcHAiLCJzdWIiOiJkYjIzZDBkZTI1Njc4ZTY3MDk5YmM0MzQzMjNkYzBkOTY1MTNiNTUyMmQ0Yjc0MWNiYTM5ZjdjOTJkMGM0NmFlIiwiaXNzIjoiaHR0cDovL2xhdW5jaC5zbWFydGhlYWx0aGl0Lm9yZyIsImlhdCI6MTU1OTEzODkxNCwiZXhwIjoxNTU5MTQyNTE0fQ.OtbIcs5nyEKaD2kAPasm1DYFixHvVbkC1wQys3oa3T-4Tf8wxW56hzUK0ZQeOK_gEIxiSFn9tLoUvKau_M1WRVD11FPyulvs1Q8EbG5PQ83MBudcpZQJ_uuFbVcGsDMy2xEa_8jAHkHPAVNjj8FRsQCRZC0Hfg0NbXli3yOhAFK1LqTUcrnjfwD-sak0UGQS1H6OgILnTYLrlTTIonfnWRdpWJjjIh3_GCk5k-8LU8AARaPcSE3ZhezoKTSfwQn1XO101g5h337pZleaIlFlhxPRFSKtpXz7BEezkUi5CJqN4d2qNoBK9kapljFYEVdPjRqaBnt4blmyFRXjhdMNwA",
                        "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJuZWVkX3BhdGllbnRfYmFubmVyIjp0cnVlLCJzbWFydF9zdHlsZV91cmwiOiJodHRwczovL2xhdW5jaC5zbWFydGhlYWx0aGl0Lm9yZy9zbWFydC1zdHlsZS5qc29uIiwicGF0aWVudCI6ImIyNTM2ZGQzLWJjY2QtNGQyMi04MzU1LWFiMjBhY2RmMjQwYiIsImVuY291bnRlciI6ImUzZWMyZDE1LTRjMjctNDYwNy1hNDVjLTJmODQ5NjJiMDcwMCIsInJlZnJlc2hfdG9rZW4iOiJleUowZVhBaU9pSktWMVFpTENKaGJHY2lPaUpJVXpJMU5pSjkuZXlKamIyNTBaWGgwSWpwN0ltNWxaV1JmY0dGMGFXVnVkRjlpWVc1dVpYSWlPblJ5ZFdVc0luTnRZWEowWDNOMGVXeGxYM1Z5YkNJNkltaDBkSEJ6T2k4dmJHRjFibU5vTG5OdFlYSjBhR1ZoYkhSb2FYUXViM0puTDNOdFlYSjBMWE4wZVd4bExtcHpiMjRpTENKd1lYUnBaVzUwSWpvaVlqSTFNelprWkRNdFltTmpaQzAwWkRJeUxUZ3pOVFV0WVdJeU1HRmpaR1l5TkRCaUlpd2laVzVqYjNWdWRHVnlJam9pWlRObFl6SmtNVFV0TkdNeU55MDBOakEzTFdFME5XTXRNbVk0TkRrMk1tSXdOekF3SW4wc0ltTnNhV1Z1ZEY5cFpDSTZJbTE1WDNkbFlsOWhjSEFpTENKelkyOXdaU0k2SW05d1pXNXBaQ0JtYUdseVZYTmxjaUJ2Wm1ac2FXNWxYMkZqWTJWemN5QjFjMlZ5THlvdUtpQndZWFJwWlc1MEx5b3VLaUJzWVhWdVkyZ3ZaVzVqYjNWdWRHVnlJR3hoZFc1amFDOXdZWFJwWlc1MElIQnliMlpwYkdVaUxDSjFjMlZ5SWpvaVVISmhZM1JwZEdsdmJtVnlMM050WVhKMExWQnlZV04wYVhScGIyNWxjaTAzTVRRNE1qY3hNeUlzSW1saGRDSTZNVFUxT1RFek9Ea3hNeXdpWlhod0lqb3hOVGt3TmpjME9URTBmUS4tRXk3d2RGU2xtZm9Rcm03SE54QWdKUUJKUEtkdGZIN2tMMVo5MUw2MF84IiwidG9rZW5fdHlwZSI6ImJlYXJlciIsInNjb3BlIjoib3BlbmlkIGZoaXJVc2VyIG9mZmxpbmVfYWNjZXNzIHVzZXIvKi4qIHBhdGllbnQvKi4qIGxhdW5jaC9lbmNvdW50ZXIgbGF1bmNoL3BhdGllbnQgcHJvZmlsZSIsImNsaWVudF9pZCI6Im15X3dlYl9hcHAiLCJleHBpcmVzX2luIjozNjAwLCJpZF90b2tlbiI6ImV5SjBlWEFpT2lKS1YxUWlMQ0poYkdjaU9pSlNVekkxTmlKOS5leUp3Y205bWFXeGxJam9pVUhKaFkzUnBkR2x2Ym1WeUwzTnRZWEowTFZCeVlXTjBhWFJwYjI1bGNpMDNNVFE0TWpjeE15SXNJbVpvYVhKVmMyVnlJam9pVUhKaFkzUnBkR2x2Ym1WeUwzTnRZWEowTFZCeVlXTjBhWFJwYjI1bGNpMDNNVFE0TWpjeE15SXNJbUYxWkNJNkltMTVYM2RsWWw5aGNIQWlMQ0p6ZFdJaU9pSmtZakl6WkRCa1pUSTFOamM0WlRZM01EazVZbU0wTXpRek1qTmtZekJrT1RZMU1UTmlOVFV5TW1RMFlqYzBNV05pWVRNNVpqZGpPVEprTUdNME5tRmxJaXdpYVhOeklqb2lhSFIwY0RvdkwyeGhkVzVqYUM1emJXRnlkR2hsWVd4MGFHbDBMbTl5WnlJc0ltbGhkQ0k2TVRVMU9URXpPRGt4TkN3aVpYaHdJam94TlRVNU1UUXlOVEUwZlEuT3RiSWNzNW55RUthRDJrQVBhc20xRFlGaXhIdlZia0Mxd1F5czNvYTNULTRUZjh3eFc1Nmh6VUswWlFlT0tfZ0VJeGlTRm45dExvVXZLYXVfTTFXUlZEMTFGUHl1bHZzMVE4RWJHNVBRODNNQnVkY3BaUUpfdXVGYlZjR3NETXkyeEVhXzhqQUhrSFBBVk5qajhGUnNRQ1JaQzBIZmcwTmJYbGkzeU9oQUZLMUxxVFVjcm5qZndELXNhazBVR1FTMUg2T2dJTG5UWUxybFRUSW9uZm5XUmRwV0pqakloM19HQ2s1ay04TFU4QUFSYVBjU0UzWmhlem9LVFNmd1FuMVhPMTAxZzVoMzM3cFpsZWFJbEZsaHhQUkZTS3RwWHo3QkVlemtVaTVDSnFONGQycU5vQks5a2FwbGpGWUVWZFBqUnFhQm50NGJsbXlGUlhqaGRNTndBIiwiaWF0IjoxNTU5MTM4OTE0LCJleHAiOjE1NTkxNDI1MTR9.lhfmhXYfoaI4QcJYvFnr2FMn_RHO8aXSzzkXzwNpc7w",
                        "code": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJjb250ZXh0Ijp7Im5lZWRfcGF0aWVudF9iYW5uZXIiOnRydWUsInNtYXJ0X3N0eWxlX3VybCI6Imh0dHBzOi8vbGF1bmNoLnNtYXJ0aGVhbHRoaXQub3JnL3NtYXJ0LXN0eWxlLmpzb24iLCJwYXRpZW50IjoiYjI1MzZkZDMtYmNjZC00ZDIyLTgzNTUtYWIyMGFjZGYyNDBiIiwiZW5jb3VudGVyIjoiZTNlYzJkMTUtNGMyNy00NjA3LWE0NWMtMmY4NDk2MmIwNzAwIn0sImNsaWVudF9pZCI6Im15X3dlYl9hcHAiLCJzY29wZSI6Im9wZW5pZCBmaGlyVXNlciBvZmZsaW5lX2FjY2VzcyB1c2VyLyouKiBwYXRpZW50LyouKiBsYXVuY2gvZW5jb3VudGVyIGxhdW5jaC9wYXRpZW50IHByb2ZpbGUiLCJ1c2VyIjoiUHJhY3RpdGlvbmVyL3NtYXJ0LVByYWN0aXRpb25lci03MTQ4MjcxMyIsImlhdCI6MTU1OTEzODkxMywiZXhwIjoxNTU5MTM5MjEzfQ.G2dLcSnjpwM_joWTxWLfL48vhdlj3zGV9Os5cKREYcY"
                    }
                });

                const env = new BrowserEnv();

                const client = await launchUsingInit(env, authorizeOptions)

                expect(client.getPatientId()).to.equal("b2536dd3-bccd-4d22-8355-ab20acdf240b");
                expect(client.getEncounterId()).to.equal("e3ec2d15-4c27-4607-a45c-2f84962b0700");
                expect(client.getUserId()).to.equal("smart-Practitioner-71482713");
                expect(client.getUserType()).to.equal("Practitioner");

                // Now try once again to test the page refresh flow
                await smart.init(env, authorizeOptions);

                expect(client.getPatientId()).to.equal("b2536dd3-bccd-4d22-8355-ab20acdf240b");
                expect(client.getEncounterId()).to.equal("e3ec2d15-4c27-4607-a45c-2f84962b0700");
                expect(client.getUserId()).to.equal("smart-Practitioner-71482713");
                expect(client.getUserType()).to.equal("Practitioner");
            });
        });
    });

    describe("Targets", () => {

        async function testTarget(targetWindow: MockWindow, options: any, type?: string) {

            const env     = new BrowserEnv();
            const storage = env.getStorage();

            // mock our oauth endpoints
            applyDefaultMocks(mockServer)

            const locationChangeListener1 = new Promise(resolve => {
                targetWindow.location.once("change", () => {
                    const top = (globalThis as any).top;
                    (globalThis as any).self = (globalThis as any).window = targetWindow;
                    if (type == "frame") {
                        (globalThis as any).parent = top;
                    } else if (type == "popup") {
                        (globalThis as any).parent = targetWindow;
                        (globalThis as any).opener = top;
                        (globalThis as any).top    = targetWindow;
                        (globalThis as any).window.name = "SMARTAuthPopup";
                    }

                    // smart.ready(new BrowserEnv());
                    smart.ready(env);
                    resolve(void 0);
                });
            });
            // const locationChangeListener2 = new Promise(resolve => {
            //     (self as any).location.once("change", resolve);
            // });

            // Call our launch code.
            await smart.authorize(env, {
                iss      : mockUrl,
                launch   : "123",
                scope    : "my_scope",
                clientId: "my_client_id",
                ...options
            });
            // .then(resolve)
            // .catch(console.error);

            await locationChangeListener1;
            // await locationChangeListener2;

            // Now we have been redirected to `redirect` and then back to our
            // redirectUri. It is time to complete the authorization. All that
            // should have happened in the targetWindow.
            const redirect = new URL(targetWindow.location.href);

            // Get the state parameter from the URL
            const state = redirect.searchParams.get("state")!;

            // Verify that the state is set
            expect(await storage.get(state), "must have set a state at " + state).to.exist;
        }

        it('target: () => "_top"', async () => {
            const top = (globalThis as any).top = (globalThis as any).window.top = new MockWindow();
            await testTarget(top, { target: () => "_top" });
        });

        it('target: "_top"', async () => {
            const top = (globalThis as any).top = (globalThis as any).window.top = new MockWindow();
            await testTarget(top, { target: "_top" });
        });

        it('target: "_top", completeInTarget: true', async () => {
            const top = (globalThis as any).top = (globalThis as any).window.top = new MockWindow();
            await testTarget(top, { target: "_top", completeInTarget: true });
        });

        it('target: "_parent"', async () => {
            const parent = (globalThis as any).parent = (globalThis as any).window.parent = new MockWindow();
            await testTarget(parent, { target: "_parent" });
        });

        it("target: window", async () => {
            const window = (globalThis as any).window = new MockWindow();
            await testTarget(window, { target: window });
        });

        // it("target: invalidWindow corrected to _self", async () => {
        //     // const window = (globalThis as any).window = (globalThis as any).window.top = (globalThis as any).self = new MockWindow();
        //     await testTarget(window, { target: {} });
        // });

        // it("target: invalidFunction corrected to _self", async () => {
        //     await testTarget(window, { target: () => NaN });
        // });

        it("target: 'namedFrame'", async () => {
            const frame = new MockWindow();
            frame.parent = self;
            frame.top = self;
            (globalThis as any).frames = { namedFrame: frame };
            await testTarget(frame, { target: "namedFrame" }, "frame");
        });

        it("target: 'popup'", async () => {
            const frame = new MockWindow();
            frame.parent = self;
            frame.top = self;
            (globalThis as any).frames = { namedFrame: frame };
            await testTarget(frame, { target: "namedFrame" }, "frame");
        });

        // it("target: 'xyz' corrected to _self", async () => {
        //     await testTarget(window, { target: "xyz" });
        // });

        // it("forbidden frame defaults to _self", async () => {
        //     const frame = new MockWindow();
        //     (globalThis as any).frames = { namedFrame: frame };
        //     frame.location.readonly = true;
        //     await testTarget(window, { target: "namedFrame" });
        // });

        // it("forbidden popup defaults to _self", async () => {
        //     (self as any).once("beforeOpen", (e: any) => e.prevent());
        //     await testTarget(window, { target: "popup" });
        // });

        describe("getTargetWindow", () => {
            it ('"_top"', async () => {
                expect((await lib.getTargetWindow("_top")) === top).to.be.true;
            });
            it ('() => "_top"', async () => {
                expect((await lib.getTargetWindow((() => "_top") as fhirclient.WindowTarget)) === top).to.be.true;
            });
            it ('async () => "_top"', async () => {
                expect((await lib.getTargetWindow((async () => "_top") as fhirclient.WindowTarget)) === top).to.be.true;
            });

            it ('"_self"', async () => {
                expect((await lib.getTargetWindow("_self" )) === self).to.be.true;
            });
            it ('() => "_self"', async () => {
                expect((await lib.getTargetWindow((() => "_self") as fhirclient.WindowTarget)) === self).to.be.true;
            });
            it ('async () => "_self"', async () => {
                expect((await lib.getTargetWindow((async () => "_self") as fhirclient.WindowTarget)) === self).to.be.true;
            });

            it ('"_parent"', async () => {
                expect((await lib.getTargetWindow("_parent" )) === parent).to.be.true;
            });
            it ('() => "_parent"', async () => {
                expect((await lib.getTargetWindow((() => "_parent") as fhirclient.WindowTarget)) === parent).to.be.true;
            });
            it ('async () => "_parent"', async () => {
                expect((await lib.getTargetWindow((async () => "_parent") as fhirclient.WindowTarget)) === parent).to.be.true;
            });


            it ('"_blank"', async () => {
                await lib.getTargetWindow("_blank" );
            });
            it ('() => "_blank"', async () => {
                await lib.getTargetWindow((() => "_blank") as fhirclient.WindowTarget);
            });
            it ('async () => "_blank"', async () => {
                await lib.getTargetWindow((async () => "_blank") as fhirclient.WindowTarget);
            });

            it ('blocked "_blank" fails back to "_self"', async () => {
                (self as any).once("beforeOpen", (e: any) => e.prevent());
                expect((await lib.getTargetWindow("_blank")) === self).to.be.true;
            });
            it ('blocked () => "_blank" fails back to "_self"', async () => {
                (self as any).once("beforeOpen", (e: any) => e.prevent());
                expect((await lib.getTargetWindow((() => "_blank") as fhirclient.WindowTarget)) === self).to.be.true;
            });
            it ('blocked async () => "_blank" fails back to "_self"', async () => {
                (self as any).once("beforeOpen", (e: any) => e.prevent());
                expect((await lib.getTargetWindow((async () => "_blank") as fhirclient.WindowTarget)) === self).to.be.true;
            });

            it ('"popup"', async () => {
                await lib.getTargetWindow("popup" );
            });
            it ('() => "popup"', async () => {
                await lib.getTargetWindow((() => "popup") as fhirclient.WindowTarget);
            });
            it ('async () => "popup"', async () => {
                await lib.getTargetWindow((async () => "popup") as fhirclient.WindowTarget);
            });

            it ('blocked "popup" fails back to "_self"', async () => {
                (self as any).once("beforeOpen", (e: any) => e.prevent());
                expect((await lib.getTargetWindow("popup")) === self).to.be.true;
            });
            it ('blocked () => "popup" fails back to "_self"', async () => {
                (self as any).once("beforeOpen", (e: any) => e.prevent());
                expect((await lib.getTargetWindow((() => "popup") as fhirclient.WindowTarget)) === self).to.be.true;
            });
            it ('blocked async () => "popup" fails back to "_self"', async () => {
                (self as any).once("beforeOpen", (e: any) => e.prevent());
                expect((await lib.getTargetWindow((async () => "popup") as fhirclient.WindowTarget)) === self).to.be.true;
            });

            it ("accepts frame by name", async () => {
                const dummy = {} as Window;
                (globalThis as any).frames.dummy = dummy;
                expect((await lib.getTargetWindow("dummy")) === dummy).to.be.true;
            });

            it ('unknown frame name fails back to "_self"', async () => {
                expect((await lib.getTargetWindow("whatever")) === self).to.be.true;
            });

            it ('unknown frame index fails back to "_self"', async () => {
                expect((await lib.getTargetWindow(0)) === self).to.be.true;
            });

            it ("accepts window references", async () => {
                const dummy = {} as Window;
                expect((await lib.getTargetWindow(dummy)) === dummy).to.be.true;
            });

            // it ('"popup"', async () => {
            //     const popup = await lib.loadUrl("x", { target: "popup" });
            //     expect(popup.location.href).to.equal("x");
            // });

            // it ('forbidden "popup" defaults to _self', async () => {
            //     (self as any).once("beforeOpen", e => e.prevent());
            //     const popup = await lib.loadUrl("x", { target: "popup" });
            //     expect(self.location.href).to.equal("x");
            // });
        });

        describe("isInFrame", () => {
            it ("returns false by default", () => {
                expect(smart.isInFrame()).to.be.false;
            });
            it ("returns true in frames by default", () => {
                (globalThis as any).top = (globalThis as any).window.top = new MockWindow();
                (globalThis as any).parent = (globalThis as any).window.parent = top;
                expect(smart.isInFrame()).to.be.true;
            });
        });

        describe("isInPopUp", () => {
            it ("returns false by default", () => {
                expect(smart.isInPopUp()).to.be.false;
            });
            it ("returns false if self !== top", () => {
                (globalThis as any).top = new MockWindow();
                expect(smart.isInPopUp()).to.be.false;
            });
            it ("returns false if !opener", () => {
                (globalThis as any).opener = null;
                expect(smart.isInPopUp()).to.be.false;
            });
            it ("returns false if opener === self", () => {
                (globalThis as any).opener = self;
                expect(smart.isInPopUp()).to.be.false;
            });
            it ("returns false if !window.name", () => {
                (globalThis as any).window.name = "";
                expect(smart.isInPopUp()).to.be.false;
            });
            it ("returns true in popups", () => {
                (globalThis as any).opener = new MockWindow();
                (globalThis as any).window.name = "whatever";
                expect(smart.isInPopUp()).to.be.true;
            });
            // it ("returns true top or parent are not accessible", () => {
            //     const self = new MockWindow();
            //     const win = {
            //         self,
            //         top: self,
            //         // get parent() {
            //         //     throw new Error("Not accessible");
            //         // }
            //     };
            //     // (globalThis as any).top = new MockWindow();
            //     Object.assign(globalThis as any, win);
            //     Object.defineProperty(globalThis, "parent", {
            //         get() {
            //             throw new Error("Not accessible");
            //         }
            //     });
            //     expect(smart.isInFrame()).to.be.true;
            // });
        });

        // it ("authorize in popup returns control to opener", (next: any) => {
        //     const opener = new MockWindow("http://localhost?state=TEST");
        //     opener.location.once("change", () => next());
        //     (globalThis as any).opener = opener;

        //     // pretend that we are in a popup
        //     const popup  = new MockWindow("http://localhost?state=TEST", "SMARTAuthPopup");
        //     (globalThis as any).parent = popup;
        //     (globalThis as any).top = (globalThis as any).self = popup;
        //     // (globalThis as any).self   = popup;
        //     (globalThis as any).window = popup;
        //     (globalThis as any).sessionStorage = popup.sessionStorage;
        //     popup.sessionStorage.setItem("SMART_KEY", '"TEST"');
        //     popup.sessionStorage.setItem("TEST", JSON.stringify({}));

        //     smart.ready(new BrowserEnv());
        // });

        // it ("authorize in frame returns control to parent", (next: any) => {
        //     const parent = new MockWindow("http://localhost?state=TEST");
        //     parent.location.once("change", () => next());
        //     (globalThis as any).parent = parent;
        //     (globalThis as any).top    = top;

        //     // pretend that we are in a popup
        //     const frame  = new MockWindow("http://localhost?state=TEST");
        //     (globalThis as any).self = frame;
        //     (globalThis as any).window = frame;
        //     (globalThis as any).sessionStorage = frame.sessionStorage;
        //     sessionStorage.setItem("SMART_KEY", '"TEST"');
        //     sessionStorage.setItem("TEST", JSON.stringify({}));

        //     smart.ready(new BrowserEnv());
        // });

        // it ("authorize in frame does not return control to parent if 'complete' is true", async () => {
        //     const parent = new MockWindow("http://localhost");
        //     // parent.location.once("change", () => next());
        //     (globalThis as any).parent = parent;
        //     (globalThis as any).top    = parent;

        //     // pretend that we are in a popup
        //     const frame  = new MockWindow("http://localhost?state=TEST&complete=1");
        //     (globalThis as any).self   = frame;
        //     (globalThis as any).window = frame;
        //     (globalThis as any).sessionStorage = frame.sessionStorage;
        //     // frame.sessionStorage.setItem("SMART_KEY", '"TEST"');
        //     sessionStorage.setItem("TEST", JSON.stringify({
        //         // completeInTarget: true
        //     }));

        //     await expect(smart.ready(new BrowserEnv())).to.be.rejected;
        // });

        describe("onMessage", () => {
            it ("ignores postMessage if the event type is not 'completeAuth'", () => {
                let error: any = null;
                window.location.once("change", () => {
                    error = new Error("The event should be ignored");
                });
                window.addEventListener("message", smart.onMessage);
                window.postMessage({
                    type: "not completeAuth",
                    url: window.location.href
                }, window.location.origin);
                expect(error).to.equal(null);
            });

            it ("ignores postMessage if the origin is wrong", () => {
                let error: any = null;
                window.location.once("change", () => {
                    error = new Error("The event should be ignored");
                });
                window.addEventListener("message", smart.onMessage);
                window.postMessage({
                    type: "completeAuth",
                    url: window.location.href
                }, "whatever");
                expect(error).to.equal(null);
            });

            it ("accepts postMessage if the event type is 'completeAuth' and removes itself", () => {
                let count = 0;
                window.location.once("change", () => count += 1);
                window.addEventListener("message", smart.onMessage);
                window.postMessage({
                    type: "completeAuth",
                    url: window.location.href
                }, window.location.origin);
                window.postMessage({
                    type: "completeAuth",
                    url: window.location.href
                }, window.location.origin);
                expect(count).to.equal(1);
            });
        });
    });

    describe("BrowserAdapter", () => {

        it ("base64urlencode a string", () => {
            const env = new BrowserAdapter({})
            const input = "This is a test"
            expect(env.base64urlencode(input)).to.equal(Buffer.from(input).toString("base64url"))
        })
    
        it ("base64urlencode an Uint8Array", () => {
            const env = new BrowserAdapter({})
            const input = "This is a test"
            expect(env.base64urlencode(new TextEncoder().encode(input))).to.equal(Buffer.from(input).toString("base64url"))
        })
    
        it ("base64urldecode", () => {
            const env = new BrowserAdapter({})
            const input = Buffer.from("test").toString("base64url")
            expect(env.base64urldecode(input)).to.equal("test")
            expect(() => env.base64urldecode("test====")).to.throw('Invalid Base64URL string')
        })

        it ("base64encode", () => {
            const env = new BrowserAdapter({})
            const input = "This is a test"
            expect(env.base64encode(input)).to.equal(Buffer.from(input, "utf8").toString("base64"))
        })

        it ("base64decode", () => {
            const env = new BrowserAdapter({})
            const input = "This is a test"
            expect(env.base64decode(input)).to.equal(Buffer.from(input, "base64").toString("utf8"))
        })

        it ("getUrl", () => {
            const env = new BrowserAdapter({})
            expect(env.getUrl().href).to.equal("http://localhost/")
        })

        it ("redirect", () => {
            const env = new BrowserAdapter({})
            env.redirect("http://localhost/b")
            expect(env.getUrl().href).to.equal("http://localhost/b")
        })

        it ("relative", () => {
            const env = new BrowserAdapter({})
            const result = env.relative("b")
            expect(result).to.equal("http://localhost/b")
        })

        it ("getStorage", () => {
            const env = new BrowserAdapter({})
            const storage = env.getStorage()
            expect(storage).to.exist
        })

        it ("getStorage", () => {
            const env = new BrowserAdapter({})
            const api = env.getSmartApi()
            expect(api).to.exist
        })

        it ("getStorage().set", async () => {
            const env = new BrowserAdapter({})
            const storage = env.getStorage()
            await storage.set("a", { a: "b" })
            expect(sessionStorage.a).to.deep.equal('{"a":"b"}')
        })

        it ("getStorage().get", async () => {
            sessionStorage.a = '{"a":"b"}'
            const env = new BrowserAdapter({})
            const storage = env.getStorage()
            const x = await storage.get("a")
            expect(x).to.deep.equal({ a: "b" })
            expect(await storage.get("b")).to.be.null
        })

        it ("getStorage().unset", async () => {
            sessionStorage.a = '{"a":"b"}'
            const env = new BrowserAdapter({})
            const storage = env.getStorage()
            expect(await storage.unset("a")).to.be.true
            expect(await storage.unset("b")).to.be.false
            expect(sessionStorage.a).to.be.undefined
        })
    })
});
