
import { expect }        from "chai";
import Adapter           from "../src/adapters/NodeAdapter";
import { KEY }           from "../src/smart";
import ServerStorage     from "../src/storage/ServerStorage";
import FHIR              from "../src/entry/node";

// Mocks
import mockServer        from "./mocks/mockServer";
import HttpRequest       from "./mocks/HttpRequest";
import HttpResponse      from "./mocks/HttpResponse";
import MemoryStorage     from "./mocks/MemoryStorage";
import { IncomingMessage } from "http";


let mockDataServer: any, mockUrl: string;


before(() => {
    // debug.enable("FHIRClient:*");
    return new Promise((resolve, reject) => {
        mockDataServer = mockServer.listen(0, "0.0.0.0", (error?: Error) => {
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
        return new Promise(resolve => {
            mockUrl = "";
            mockDataServer.close((error?: Error) => {
                if (error) {
                    console.log("Error shutting down the mock-data server: ", error);
                }
                resolve(void 0);
            });
        });
    }
});

afterEach(() => {
    mockServer.clear();
});

// -----------------------------------------------------------------------------

describe("Complete authorization [SERVER]", () => {
    it ("code flow authorization", async () => {

        const key = "my-random-state";

        const req1   = new HttpRequest("http://localhost/launch?launch=123&state=" + key);
        const res1   = new HttpResponse();
        const smart1 = FHIR(req1 as any, res1 as any);

        // mock our oauth endpoints
        mockServer.mock({
            headers: { "content-type": "application/json" },
            status: 200,
            body: {
                authorization_endpoint: mockUrl,
                token_endpoint: mockUrl
            }
        });

        await smart1.authorize({
            iss        : mockUrl,
            scope      : "my_scope",
            clientId   : "my_client_id",
            redirectUri: "http://localhost/index"
        });

        expect(res1.status).to.equal(302);
        expect(res1.headers.location).to.exist;

        const url = new URL(res1.headers.location);

        expect(url.searchParams.get("response_type")).to.equal("code");
        expect(url.searchParams.get("client_id")).to.equal("my_client_id");
        expect(url.searchParams.get("scope")).to.equal("my_scope launch");
        expect(url.searchParams.get("launch")).to.equal("123");
        expect(url.searchParams.get("redirect_uri")).to.exist;
        expect(url.searchParams.get("state")).to.exist;

        // Now we have been redirected to `redirect` and then back to our
        // redirectUri. It is time to complete the authorization.
        const code   = url.searchParams.get("state");
        const req2   = new HttpRequest("http://localhost/index?code=123&state=" + code);
        req2.session = req1.session; // inherit the session
        const res2   = new HttpResponse();
        const smart2 = FHIR(req2 as any, res2 as any);

        // mock our access token response
        mockServer.mock({
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

        const client = await smart2.ready();

        expect(client.patient.id).to.equal("b2536dd3-bccd-4d22-8355-ab20acdf240b");
        expect(client.encounter.id).to.equal("e3ec2d15-4c27-4607-a45c-2f84962b0700");
        expect(client.user.id).to.equal("smart-Practitioner-71482713");
        expect(client.user.resourceType).to.equal("Practitioner");
    });

    it ("refresh an authorized page", async () => {

        const key = "my-random-state";

        const req     = new HttpRequest("http://localhost/index");
        const res     = new HttpResponse();
        const storage = new MemoryStorage();
        const smart   = FHIR(req as any, res as any, storage);

        await storage.set(KEY, key);
        await storage.set(key, {
            clientId     : "my_web_app",
            scope        : "whatever",
            redirectUri  : "whatever",
            serverUrl    : mockUrl,
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

        const client = await smart.ready();

        expect(client.patient.id).to.equal("b2536dd3-bccd-4d22-8355-ab20acdf240b");
        expect(client.encounter.id).to.equal("e3ec2d15-4c27-4607-a45c-2f84962b0700");
        expect(client.user.id).to.equal("smart-Practitioner-71482713");
        expect(client.user.resourceType).to.equal("Practitioner");
    });

    it ("can bypass oauth by passing `fhirServiceUrl` to `authorize`", async () => {
        const req   = new HttpRequest("http://localhost/launch");
        const res   = new HttpResponse();
        const smart = FHIR(req as any, res as any);
        await smart.authorize({ fhirServiceUrl: "http://localhost" });
        expect(res.status).to.equal(302);
        expect(res.headers.location).to.exist;
        const url = new URL(res.headers.location);
        expect(url.href).to.match(/http:\/\/localhost\/\?state=./);
    });

    it ("appends 'launch' to the scopes if needed", async () => {
        const req     = new HttpRequest("http://localhost/launch");
        const res     = new HttpResponse();
        const storage = new MemoryStorage();
        const smart   = FHIR(req as any, res as any, storage);
        await smart.authorize({
            fhirServiceUrl: "http://localhost",
            scope: "x",
            launch: "123"
        });
        expect(res.status).to.equal(302);
        expect(res.headers.location).to.exist;
        const url = new URL(res.headers.location);
        const state = url.searchParams.get("state")!;
        const stored = await storage.get(state);
        expect(stored.scope).to.equal("x launch");
    });

    // it ("can do standalone launch");
});

describe("ServerStorage", () => {
    it ("can 'get'", async () => {
        const session = { a: "b" };
        const storage = new ServerStorage({ session } as any);
        expect(await storage.get("a")).to.equal("b");
        expect(await storage.get("b")).to.be.undefined;
    });
    it ("can 'set'", async () => {
        const session = {};
        const storage = new ServerStorage({ session } as any);
        await storage.set("a", "b");
        expect(await storage.get("a")).to.equal("b");
    });
    it ("can 'unset'", async () => {
        const session = { a: "b" };
        const storage = new ServerStorage({ session } as any);
        const result = await storage.unset("a");
        expect(result).to.be.true;
        expect(session.a).to.be.undefined;
        const result2 = await storage.unset("a");
        expect(result2).to.equal(false);
    });
});

describe("NodeAdapter", () => {

    it ("base64urlencode a string", () => {
        // @ts-ignore
        const env = new Adapter({})
        const input = "This is a test"
        expect(env.base64urlencode(input)).to.equal(Buffer.from(input).toString("base64url"))
    })

    it ("base64urlencode an Uint8Array", () => {
        // @ts-ignore
        const env = new Adapter({})
        const input = "This is a test"
        expect(env.base64urlencode(new TextEncoder().encode(input))).to.equal(Buffer.from(input).toString("base64url"))
    })

    it ("base64urldecode", () => {
        // @ts-ignore
        const env = new Adapter({})
        const input = Buffer.from("test").toString("base64url")
        expect(env.base64urldecode(input)).to.equal("test")
    })

    it ("base64encode", () => {
        // @ts-ignore
        const env = new Adapter({})
        const input = "This is a test"
        expect(env.base64encode(input)).to.equal(Buffer.from(input, "utf8").toString("base64"))
    })

    it ("getUrl", () => {
        const map = [
            {
                request: {
                    url: "/",
                    headers: {
                        host: "localhost"
                    }
                },
                result: "http://localhost/"
            },
            {
                request: {
                    url: "/a/b/c",
                    headers: {
                        "x-forwarded-host" : "external-domain",
                        "x-forwarded-proto": "https"
                    }
                },
                result: "https://external-domain/a/b/c"
            },
            {
                request: {
                    headers: {
                        "x-forwarded-host" : "external-domain",
                        "x-forwarded-proto": "https",
                        "x-forwarded-port" : "8080",
                        "x-original-uri"   : "/b/c/d"
                    }
                },
                result: "https://external-domain:8080/b/c/d"
            }
        ];

        map.forEach(meta => {
            const request = meta.request as IncomingMessage;
            request.socket = {} as any;
            const adapter = new Adapter({ request, response: {} as any });
            expect(adapter.getUrl().href).to.equal(meta.result);
        });
    });

    it ("getStorage() works with factory function", () => {

        const callLog: any[] = [];

        const fakeStorage: any = { fakeStorage: "whatever" };

        function getStorage(...args: any[]) {
            callLog.push(args);
            return fakeStorage;
        }

        const adapter = new Adapter({
            storage : getStorage,
            request : "my-request" as any,
            response: "my-response" as any
        });

        // Call it twice and make sure that only one instance is created
        expect(adapter.getStorage()).to.equal(fakeStorage);
        expect(adapter.getStorage()).to.equal(fakeStorage);
        expect(callLog).to.deep.equal([[{
            storage : getStorage,
            request : "my-request",
            response: "my-response"
        }]]);
    });
});
