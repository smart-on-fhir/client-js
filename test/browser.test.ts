// import "../src/types";

require("./mocks/mockDebug");
import { URL }    from "url";
import { expect } from "@hapi/code";
import * as Lab   from "@hapi/lab";
import * as smart from "../src/smart";
import * as lib   from "../src/lib";

// mocks
import BrowserEnv from "./mocks/BrowserEnvironment";
import MockWindow from "./mocks/Window";
import MockScreen from "./mocks/Screen";
import mockServer from "./mocks/mockServer";
import { fhirclient } from "../src/types";

export const lab = Lab.script();
const {
    it,
    describe,
    before,
    after,
    beforeEach,
    afterEach
} = lab;

declare var window: MockWindow;





// -----------------------------------------------------------------------------
describe("Browser tests", () => {

    let mockDataServer: any, mockUrl: string;
    
    const mockCodeChallengeMethods:string[] = ['S256'];

    before(() => {
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
    
    after(() => {
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
    
    beforeEach(() => {
        (global as any).window = (global as any).self = new MockWindow();
        (global as any).top    = window.top;
        (global as any).parent = window.parent;
        (global as any).frames = window.frames;
        (global as any).screen = new MockScreen();
        (global as any).frames = {};
        (global as any).sessionStorage = self.sessionStorage;
    });
    
    afterEach(() => {
        mockServer.clear();
        delete (global as any).self;
        delete (global as any).top;
        delete (global as any).parent;
        delete (global as any).frames;
        delete (global as any).window;
        // delete (global as any).fetch;
        delete (global as any).screen;
        delete (global as any).frames;
        delete (global as any).opener;
        delete (global as any).sessionStorage;
    });
    

    describe ("Complete authorization", () => {
        it ("code flow", async () => {

            const env = new BrowserEnv();
            const Storage = env.getStorage();

            // mock our oauth endpoints
            mockServer.mock({
                headers: { "content-type": "application/json" },
                status: 200,
                body: {
                    authorization_endpoint: mockUrl,
                    token_endpoint: mockUrl
                }
            });

            // Call our launch code.
            await smart.authorize(env, {
                iss: mockUrl,
                launch: "123",
                scope: "my_scope",
                client_id: "my_client_id"
            });

            // Now we have been redirected to `redirect` and then back to our
            // redirect_uri. It is time to complete the authorization.
            const redirect = env.getUrl();

            // Get the state parameter from the URL
            const state = redirect.searchParams.get("state");

            expect(await Storage.get(state), "must have set a state at " + state).to.exist();

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
                    "code": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJjb250ZXh0Ijp7Im5lZWRfcGF0aWVudF9iYW5uZXIiOnRydWUsInNtYXJ0X3N0eWxlX3VybCI6Imh0dHBzOi8vbGF1bmNoLnNtYXJ0aGVhbHRoaXQub3JnL3NtYXJ0LXN0eWxlLmpzb24iLCJwYXRpZW50IjoiYjI1MzZkZDMtYmNjZC00ZDIyLTgzNTUtYWIyMGFjZGYyNDBiIiwiZW5jb3VudGVyIjoiZTNlYzJkMTUtNGMyNy00NjA3LWE0NWMtMmY4NDk2MmIwNzAwIn0sImNsaWVudF9pZCI6Im15X3dlYl9hcHAiLCJzY29wZSI6Im9wZW5pZCBmaGlyVXNlciBvZmZsaW5lX2FjY2VzcyB1c2VyLyouKiBwYXRpZW50LyouKiBsYXVuY2gvZW5jb3VudGVyIGxhdW5jaC9wYXRpZW50IHByb2ZpbGUiLCJ1c2VyIjoiUHJhY3RpdGlvbmVyL3NtYXJ0LVByYWN0aXRpb25lci03MTQ4MjcxMyIsImlhdCI6MTU1OTEzODkxMywiZXhwIjoxNTU5MTM5MjEzfQ.G2dLcSnjpwM_joWTxWLfL48vhdlj3zGV9Os5cKREYcY",
                    state
                }
            });

            env.redirect("http://localhost/?code=123&state=" + state);
            const client = await smart.ready(env);

            // make sure tha browser history was replaced
            expect(window.history._location).to.equal("http://localhost/");

            expect(await Storage.get(smart.KEY), `must have set a state at ${smart.KEY}`).to.exist();
            expect(client.getPatientId()).to.equal("b2536dd3-bccd-4d22-8355-ab20acdf240b");
            expect(client.getEncounterId()).to.equal("e3ec2d15-4c27-4607-a45c-2f84962b0700");
            expect(client.getUserId()).to.equal("smart-Practitioner-71482713");
            expect(client.getUserType()).to.equal("Practitioner");
        });

        it ("code flow with PKCE advertised", async () => {

          const env = new BrowserEnv();
          const Storage = env.getStorage();

          // mock our oauth endpoints
          mockServer.mock({
              headers: { "content-type": "application/json" },
              status: 200,
              body: {
                  authorization_endpoint: mockUrl,
                  token_endpoint: mockUrl,
                  code_challenge_methods_supported: mockCodeChallengeMethods
              }
          });

          // Call our launch code.
          await smart.authorize(env, {
              iss: mockUrl,
              launch: "123",
              scope: "my_scope",
              client_id: "my_client_id",
          });

          // Now we have been redirected to `redirect` and then back to our
          // redirect_uri. It is time to complete the authorization.
          const redirect = env.getUrl();

          // Get the state parameter from the URL
          const state = redirect.searchParams.get("state");

          expect(await Storage.get(state), "must have set a state at " + state).to.exist();

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
                  "code": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJjb250ZXh0Ijp7Im5lZWRfcGF0aWVudF9iYW5uZXIiOnRydWUsInNtYXJ0X3N0eWxlX3VybCI6Imh0dHBzOi8vbGF1bmNoLnNtYXJ0aGVhbHRoaXQub3JnL3NtYXJ0LXN0eWxlLmpzb24iLCJwYXRpZW50IjoiYjI1MzZkZDMtYmNjZC00ZDIyLTgzNTUtYWIyMGFjZGYyNDBiIiwiZW5jb3VudGVyIjoiZTNlYzJkMTUtNGMyNy00NjA3LWE0NWMtMmY4NDk2MmIwNzAwIn0sImNsaWVudF9pZCI6Im15X3dlYl9hcHAiLCJzY29wZSI6Im9wZW5pZCBmaGlyVXNlciBvZmZsaW5lX2FjY2VzcyB1c2VyLyouKiBwYXRpZW50LyouKiBsYXVuY2gvZW5jb3VudGVyIGxhdW5jaC9wYXRpZW50IHByb2ZpbGUiLCJ1c2VyIjoiUHJhY3RpdGlvbmVyL3NtYXJ0LVByYWN0aXRpb25lci03MTQ4MjcxMyIsImlhdCI6MTU1OTEzODkxMywiZXhwIjoxNTU5MTM5MjEzfQ.G2dLcSnjpwM_joWTxWLfL48vhdlj3zGV9Os5cKREYcY",
                  state
              }
          });

          env.redirect("http://localhost/?code=123&state=" + state);
          const client = await smart.ready(env);

          // make sure tha browser history was replaced
          expect(window.history._location).to.equal("http://localhost/");

          expect(await Storage.get(smart.KEY), `must have set a state at ${smart.KEY}`).to.exist();
          expect(client.getPatientId()).to.equal("b2536dd3-bccd-4d22-8355-ab20acdf240b");
          expect(client.getEncounterId()).to.equal("e3ec2d15-4c27-4607-a45c-2f84962b0700");
          expect(client.getUserId()).to.equal("smart-Practitioner-71482713");
          expect(client.getUserType()).to.equal("Practitioner");
        });

        it ("code flow with fullSessionStorageSupport = false", async () => {

            const env = new BrowserEnv({
                fullSessionStorageSupport: false,
                replaceBrowserHistory: false
            });
            const Storage = env.getStorage();

            // mock our oauth endpoints
            mockServer.mock({
                headers: { "content-type": "application/json" },
                status: 200,
                body: {
                    authorization_endpoint: mockUrl,
                    token_endpoint: mockUrl
                }
            });

            // Call our launch code.
            await smart.authorize(env, {
                iss: mockUrl,
                launch: "123",
                scope: "my_scope",
                client_id: "my_client_id"
            });

            // Now we have been redirected to `redirect` and then back to our
            // redirect_uri. It is time to complete the authorization.
            const redirect = env.getUrl();

            // Get the state parameter from the URL
            const key = redirect.searchParams.get("state"); // console.log(redirect);

            // console.log(redirect, state, storage.get(state));
            expect(await Storage.get(key), "must have set a state at " + key).to.exist();

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

            env.redirect("http://localhost/?code=123&state=" + key);
            const client = await smart.ready(env);

            // make sure tha browser history was not replaced
            expect(window.history._location).to.equal("");

            expect(
                await Storage.get(smart.KEY),
                `without fullSessionStorageSupport a '${smart.KEY}' key should not be used`
            ).to.not.exist();
            expect(await Storage.get(key), "must have set a state at " + key).to.exist();
            expect(await Storage.get(key)).to.include("tokenResponse");
            expect((await Storage.get(key)).tokenResponse).to.be.object();
            expect(client.getPatientId()).to.equal("b2536dd3-bccd-4d22-8355-ab20acdf240b");
            expect(client.getEncounterId()).to.equal("e3ec2d15-4c27-4607-a45c-2f84962b0700");
            expect(client.getUserId()).to.equal("smart-Practitioner-71482713");
            expect(client.getUserType()).to.equal("Practitioner");
        });

        // RFC 9207 iss collision tests -------------------------------------------

        it ("callback with code and RFC 9207 iss does not treat iss as FHIR server URL", async () => {

            const env = new BrowserEnv();
            const Storage = env.getStorage();

            // mock our oauth endpoints
            mockServer.mock({
                headers: { "content-type": "application/json" },
                status: 200,
                body: {
                    authorization_endpoint: mockUrl,
                    token_endpoint: mockUrl
                }
            });

            // 1. authorize (launch mode) — iss is the FHIR server
            await smart.authorize(env, {
                iss: mockUrl,
                launch: "123",
                scope: "my_scope",
                client_id: "my_client_id"
            });

            const redirect = env.getUrl();
            const state = redirect.searchParams.get("state");
            expect(await Storage.get(state)).to.exist();

            // Verify that the stored serverUrl is the FHIR server (mockUrl)
            const storedState = await Storage.get(state);
            expect(storedState.serverUrl).to.equal(mockUrl);

            // mock access token response
            mockServer.mock({
                headers: { "content-type": "application/json" },
                status: 200,
                body: {
                    "patient": "test-patient-1",
                    "token_type": "bearer",
                    "expires_in": 3600,
                    "access_token": "test-access-token",
                    state
                }
            });

            // 2. Simulate callback with code, state, AND a RFC 9207 iss
            //    that is an auth server URL (different from the FHIR server)
            env.redirect(
                "http://localhost/?code=abc&state=" + state +
                "&iss=" + encodeURIComponent("https://auth.example.com/realms/test")
            );
            const client = await smart.ready(env);

            // The client should use the stored FHIR server URL, NOT the
            // RFC 9207 iss from the callback
            expect(client.state.serverUrl).to.equal(mockUrl);

            // iss should have been stripped from the browser URL
            expect(window.history._location).to.not.contain("iss=");
        });

        it ("callback with code and no iss still works", async () => {

            const env = new BrowserEnv();
            const Storage = env.getStorage();

            mockServer.mock({
                headers: { "content-type": "application/json" },
                status: 200,
                body: {
                    authorization_endpoint: mockUrl,
                    token_endpoint: mockUrl
                }
            });

            await smart.authorize(env, {
                iss: mockUrl,
                launch: "123",
                scope: "my_scope",
                client_id: "my_client_id"
            });

            const redirect = env.getUrl();
            const state = redirect.searchParams.get("state");

            mockServer.mock({
                headers: { "content-type": "application/json" },
                status: 200,
                body: {
                    "patient": "test-patient-1",
                    "token_type": "bearer",
                    "expires_in": 3600,
                    "access_token": "test-access-token",
                    state
                }
            });

            // Callback with code and state but NO iss
            env.redirect("http://localhost/?code=abc&state=" + state);
            const client = await smart.ready(env);

            expect(client.state.serverUrl).to.equal(mockUrl);
        });

        it ("launch URL with iss and no code reads iss as FHIR server URL", async () => {

            const env = new BrowserEnv();

            // Point the browser at a launch URL with iss
            env.redirect("http://localhost/launch?iss=" + encodeURIComponent(mockUrl) + "&launch=xyz");

            mockServer.mock({
                headers: { "content-type": "application/json" },
                status: 200,
                body: {
                    authorization_endpoint: mockUrl + "/authorize",
                    token_endpoint: mockUrl + "/token"
                }
            });

            const redirectUrl = await smart.authorize(env, {
                client_id: "my_client_id",
                scope: "my_scope",
                noRedirect: true
            });

            // The redirect should have aud=<FHIR server URL>
            const redirectParsed = new URL(redirectUrl as string);
            // The state was stored; check that serverUrl came from iss
            const stateKey = redirectParsed.searchParams.get("state");
            const Storage = env.getStorage();
            const storedState = await Storage.get(stateKey);
            expect(storedState.serverUrl).to.equal(mockUrl);
        });

        it ("authorize with multi-config ignores iss when code is present", async () => {

            const env = new BrowserEnv();

            // Simulate a callback URL that has code + RFC 9207 iss
            env.redirect(
                "http://localhost/?code=abc&state=test123" +
                "&iss=" + encodeURIComponent("https://auth.example.com/realms/test")
            );

            // Multi-config authorize should fail because code is present
            // (this is a callback, not a launch)
            await expect(smart.authorize(env, [
                { issMatch: "https://auth.example.com/realms/test" },
                { issMatch: mockUrl }
            ])).to.reject(/authorize\(\) called with multiple configurations during an OAuth callback.*Use init\(\) or ready\(\)/);
        });

        it ("RFC 9207 issuer validation passes when iss matches discovered issuer", async () => {

            const env = new BrowserEnv();
            const Storage = env.getStorage();
            const authIssuer = "https://auth.example.com/realms/test";

            // Mock well-known with an issuer field
            mockServer.mock({
                headers: { "content-type": "application/json" },
                status: 200,
                body: {
                    issuer: authIssuer,
                    authorization_endpoint: mockUrl + "/authorize",
                    token_endpoint: mockUrl + "/token"
                }
            });

            await smart.authorize(env, {
                iss: mockUrl,
                launch: "123",
                scope: "my_scope",
                client_id: "my_client_id"
            });

            const redirect = env.getUrl();
            const state = redirect.searchParams.get("state");

            // Verify issuer was stored
            const storedState = await Storage.get(state);
            expect(storedState.issuer).to.equal(authIssuer);

            mockServer.mock({
                headers: { "content-type": "application/json" },
                status: 200,
                body: {
                    "token_type": "bearer",
                    "expires_in": 3600,
                    "access_token": "test-access-token",
                    state
                }
            });

            // Callback with matching issuer — should succeed
            env.redirect(
                "http://localhost/?code=abc&state=" + state +
                "&iss=" + encodeURIComponent(authIssuer)
            );
            const client = await smart.ready(env);
            expect(client.state.serverUrl).to.equal(mockUrl);
        });

        it ("RFC 9207 issuer validation fails on mismatch", async () => {

            const env = new BrowserEnv();
            const Storage = env.getStorage();
            const authIssuer = "https://auth.example.com/realms/test";

            mockServer.mock({
                headers: { "content-type": "application/json" },
                status: 200,
                body: {
                    issuer: authIssuer,
                    authorization_endpoint: mockUrl + "/authorize",
                    token_endpoint: mockUrl + "/token"
                }
            });

            await smart.authorize(env, {
                iss: mockUrl,
                launch: "123",
                scope: "my_scope",
                client_id: "my_client_id"
            });

            const redirect = env.getUrl();
            const state = redirect.searchParams.get("state");

            // Callback with WRONG issuer — should fail
            env.redirect(
                "http://localhost/?code=abc&state=" + state +
                "&iss=" + encodeURIComponent("https://evil.example.com/realms/fake")
            );
            await expect(smart.ready(env)).to.reject(/RFC 9207 issuer mismatch/);
        });

        // -----------------------------------------------------------------

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

        it ("refresh an authorized page with fullSessionStorageSupport = false", async () => {

            window.FHIR.oauth2.settings.fullSessionStorageSupport = false;

            const env = new BrowserEnv();
            const Storage = env.getStorage();
            const key = "whatever-random-key";

            await Storage.set(key, {
                clientId   : "my_web_app",
                scope      : "whatever",
                redirectUri: "whatever",
                serverUrl  : mockUrl,
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

            env.redirect("http://localhost/?state=" + key);
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
            const state = (new URL(redirect as string)).searchParams.get("state");
            expect((await Storage.get(state)).scope).to.equal("x launch");
        });

        it ("can do standalone launch", async () => {

            const env     = new BrowserEnv();
            const Storage = env.getStorage();

            // mock our oauth endpoints
            mockServer.mock({
                headers: { "content-type": "application/json" },
                status: 200,
                body: {
                    authorization_endpoint: mockUrl,
                    token_endpoint: mockUrl
                }
            });

            // Call our launch code.
            await smart.authorize(env, {
                iss: mockUrl,
                // launch: "123",
                scope: "my_scope",
                client_id: "my_client_id"
            });

            // Now we have been redirected to `redirect` and then back to our
            // redirect_uri. It is time to complete the authorization.

            // Get the state parameter from the URL
            const redirect = env.getUrl(); // console.log(redirect, storage);
            const state = redirect.searchParams.get("state");

            expect(await Storage.get(state), "must have set a state at " + state).to.exist();

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
                    "code": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJjb250ZXh0Ijp7Im5lZWRfcGF0aWVudF9iYW5uZXIiOnRydWUsInNtYXJ0X3N0eWxlX3VybCI6Imh0dHBzOi8vbGF1bmNoLnNtYXJ0aGVhbHRoaXQub3JnL3NtYXJ0LXN0eWxlLmpzb24iLCJwYXRpZW50IjoiYjI1MzZkZDMtYmNjZC00ZDIyLTgzNTUtYWIyMGFjZGYyNDBiIiwiZW5jb3VudGVyIjoiZTNlYzJkMTUtNGMyNy00NjA3LWE0NWMtMmY4NDk2MmIwNzAwIn0sImNsaWVudF9pZCI6Im15X3dlYl9hcHAiLCJzY29wZSI6Im9wZW5pZCBmaGlyVXNlciBvZmZsaW5lX2FjY2VzcyB1c2VyLyouKiBwYXRpZW50LyouKiBsYXVuY2gvZW5jb3VudGVyIGxhdW5jaC9wYXRpZW50IHByb2ZpbGUiLCJ1c2VyIjoiUHJhY3RpdGlvbmVyL3NtYXJ0LVByYWN0aXRpb25lci03MTQ4MjcxMyIsImlhdCI6MTU1OTEzODkxMywiZXhwIjoxNTU5MTM5MjEzfQ.G2dLcSnjpwM_joWTxWLfL48vhdlj3zGV9Os5cKREYcY",
                    state
                }
            });

            env.redirect("http://localhost/?code=123&state=" + state);
            const client = await smart.ready(env);

            expect(await Storage.get(smart.KEY), `must have set a state at ${smart.KEY}`).to.exist();
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

          // mock our oauth endpoints
          mockServer.mock({
              headers: { "content-type": "application/json" },
              status: 200,
              body: {
                  authorization_endpoint: mockUrl,
                  token_endpoint: mockUrl,
                  code_challenge_methods_supported: mockCodeChallengeMethods
              }
          });

          // Call our launch code.
          await smart.authorize(env, {
              iss: mockUrl,
              launch: "123",
              scope: "my_scope",
              client_id: "my_client_id",
              pkceMode: 'required',
          });

          // Now we have been redirected to `redirect` and then back to our
          // redirect_uri. It is time to complete the authorization.
          const redirect = env.getUrl();

          expect(redirect.searchParams.has('code_challenge')).to.equal(true);
          expect(redirect.searchParams.has('code_challenge_method')).to.equal(true);
          expect(redirect.searchParams.get('code_challenge_method')).to.equal(mockCodeChallengeMethods[0]);
        });

        it ("fail when not supported and required", async () => {
          const env = new BrowserEnv();

          // mock our oauth endpoints
          mockServer.mock({
              headers: { "content-type": "application/json" },
              status: 200,
              body: {
                  authorization_endpoint: mockUrl,
                  token_endpoint: mockUrl,
                  code_challenge_methods_supported: []
              }
          });

          await expect(
            smart.authorize(env, {
              iss: mockUrl,
              launch: "123",
              scope: "my_scope",
              client_id: "my_client_id",
              pkceMode: 'required',
            }))
            .to.reject(Error, /PKCE/);
          });

          it ("use when supported and optional", async () => {
            const env = new BrowserEnv();

            // mock our oauth endpoints
            mockServer.mock({
                headers: { "content-type": "application/json" },
                status: 200,
                body: {
                    authorization_endpoint: mockUrl,
                    token_endpoint: mockUrl,
                    code_challenge_methods_supported: mockCodeChallengeMethods
                }
            });

            // Call our launch code.
            await smart.authorize(env, {
                iss: mockUrl,
                launch: "123",
                scope: "my_scope",
                client_id: "my_client_id",
                pkceMode: 'ifSupported',
            });

            // Now we have been redirected to `redirect` and then back to our
            // redirect_uri. It is time to complete the authorization.
            const redirect = env.getUrl();

            expect(redirect.searchParams.has('code_challenge')).to.equal(true);
            expect(redirect.searchParams.has('code_challenge_method')).to.equal(true);
            expect(redirect.searchParams.get('code_challenge_method')).to.equal(mockCodeChallengeMethods[0]);
          });

          it ("do not use when not supported and optional", async () => {
            const env = new BrowserEnv();

            // mock our oauth endpoints
            mockServer.mock({
                headers: { "content-type": "application/json" },
                status: 200,
                body: {
                    authorization_endpoint: mockUrl,
                    token_endpoint: mockUrl,
                    code_challenge_methods_supported: []
                }
            });

            // Call our launch code.
            await smart.authorize(env, {
                iss: mockUrl,
                launch: "123",
                scope: "my_scope",
                client_id: "my_client_id",
                pkceMode: 'ifSupported',
            });

            // Now we have been redirected to `redirect` and then back to our
            // redirect_uri. It is time to complete the authorization.
            const redirect = env.getUrl();

            expect(redirect.searchParams.has('code_challenge')).to.equal(false);
            expect(redirect.searchParams.has('code_challenge_method')).to.equal(false);
          });

          it ("do not use when supported and disabled", async () => {
            const env = new BrowserEnv();

            // mock our oauth endpoints
            mockServer.mock({
                headers: { "content-type": "application/json" },
                status: 200,
                body: {
                    authorization_endpoint: mockUrl,
                    token_endpoint: mockUrl,
                    code_challenge_methods_supported: mockCodeChallengeMethods
                }
            });

            // Call our launch code.
            await smart.authorize(env, {
                iss: mockUrl,
                launch: "123",
                scope: "my_scope",
                client_id: "my_client_id",
                pkceMode: 'disabled',
            });

            // Now we have been redirected to `redirect` and then back to our
            // redirect_uri. It is time to complete the authorization.
            const redirect = env.getUrl();

            expect(redirect.searchParams.has('code_challenge')).to.equal(false);
            expect(redirect.searchParams.has('code_challenge_method')).to.equal(false);
          });

          it ("do not use when not supported and disabled", async () => {
            const env = new BrowserEnv();

            // mock our oauth endpoints
            mockServer.mock({
                headers: { "content-type": "application/json" },
                status: 200,
                body: {
                    authorization_endpoint: mockUrl,
                    token_endpoint: mockUrl,
                    code_challenge_methods_supported: []
                }
            });

            // Call our launch code.
            await smart.authorize(env, {
                iss: mockUrl,
                launch: "123",
                scope: "my_scope",
                client_id: "my_client_id",
                pkceMode: 'ifSupported',
            });

            // Now we have been redirected to `redirect` and then back to our
            // redirect_uri. It is time to complete the authorization.
            const redirect = env.getUrl();

            expect(redirect.searchParams.has('code_challenge')).to.equal(false);
            expect(redirect.searchParams.has('code_challenge_method')).to.equal(false);
          });
        });

        describe("fetchWellKnownJson", () => {
            it("works", async () => {
                mockServer.mock({
                    headers: { "content-type": "application/json" },
                    status: 200,
                    body: {
                        resourceType: "fetchWellKnownJson"
                    }
                });
                const conformance = await smart.fetchWellKnownJson(mockUrl);
                // @ts-ignore
                expect(conformance).to.equal({resourceType: "fetchWellKnownJson"});
            });

            it("rejects on error", async () => {
                mockServer.mock({
                    status: 404,
                    body: "Not Found"
                });
                await expect(smart.fetchWellKnownJson(mockUrl)).to.reject(Error, /Not Found/);
            });
        });

        describe("getSecurityExtensions", () => {
            it("works with .well-known/smart-configuration", async () => {
                mockServer.mock({
                    headers: { "content-type": "application/json" },
                    status: 200,
                    body: {
                        registration_endpoint : "https://my-register-uri",
                        authorization_endpoint: "https://my-authorize-uri",
                        token_endpoint        : "https://my-token-uri"
                    }
                });

                // mockServer.mock({
                //     headers: { "content-type": "application/json" },
                //     status: 200,
                //     body: {
                //         registration_endpoint : "https://my-register-uri",
                //         authorization_endpoint: "https://my-authorize-uri",
                //         token_endpoint        : "https://my-token-uri"
                //     }
                // });

                const result = await smart.getSecurityExtensions(mockUrl);
                expect(result).to.equal({
                    issuer              : undefined,
                    registrationUri     : "https://my-register-uri",
                    authorizeUri        : "https://my-authorize-uri",
                    tokenUri            : "https://my-token-uri",
                    codeChallengeMethods: []
                });
            });

            it("works with .well-known/smart-configuration - PKCE advertised", async () => {
              mockServer.mock({
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
              expect(result).to.equal({
                  issuer              : undefined,
                  registrationUri     : "https://my-register-uri",
                  authorizeUri        : "https://my-authorize-uri",
                  tokenUri            : "https://my-token-uri",
                  codeChallengeMethods: ['S256'],
              });
          });

            it("fails back to conformance if .well-known/smart-configuration is bad", async () => {
                mockServer.mock({
                    headers: { "content-type": "application/json" },
                    status : 200,
                    body   : {
                        registration_endpoint: "whatever"
                    }
                });
                mockServer.mock({
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
                expect(result).to.equal({
                    registrationUri     : "https://my-registration-uri",
                    authorizeUri        : "https://my-authorize-uri",
                    tokenUri            : "https://my-token-uri",
                    codeChallengeMethods: [],
                });
            });

            it("works with conformance statement", async () => {
                mockServer.mock({
                    status: 200,
                    headers: { "content-type": "application/json" },
                    body: {
                        authorization_endpoint: "whatever"
                    }
                });
                mockServer.mock({
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
                expect(result).to.equal({
                    registrationUri     : "",
                    authorizeUri        : "https://my-authorize-uri",
                    tokenUri            : "https://my-token-uri",
                    codeChallengeMethods: [],
                });
            });

            it("returns empty endpoints for open servers", async () => {
                mockServer.mock({
                    status: 404,
                    body: "Not Found"
                });
                mockServer.mock({
                    headers: { "content-type": "application/json" },
                    status: 200,
                    body: {rest: [{}]}
                });

                const result = await smart.getSecurityExtensions(mockUrl);
                expect(result).to.equal({
                    registrationUri     : "",
                    authorizeUri        : "",
                    tokenUri            : "",
                    codeChallengeMethods: [],
                });
            });

            it("returns empty endpoints for missing conformance", async () => {
                mockServer.mock({
                    status: 404,
                    body: "Not Found"
                });
                mockServer.mock({
                    headers: { "content-type": "application/json" },
                    status: 200,
                    // body: {}
                });

                const result = await smart.getSecurityExtensions(mockUrl);
                expect(result).to.equal({
                    registrationUri     : "",
                    authorizeUri        : "",
                    tokenUri            : "",
                    codeChallengeMethods: [],
                });
            });

            it("rejects on error", async () => {
                mockServer.mock({
                    headers: { "content-type": "application/json" },
                    status: 400,
                    body: {
                        authorization_endpoint: "whatever"
                    }
                });
                mockServer.mock({
                    headers: { "content-type": "application/json" },
                    status: 400,
                    body: {}
                });
                await expect(smart.getSecurityExtensions(mockUrl)).to.reject();
            });
        });

        describe("authorize", () => {

            it ("throws if no serverUrl", async () => {
                await expect(smart.authorize(new BrowserEnv(), {}))
                    .to.reject(Error, /No server url found/);
            });

            it ("accepts encounterId parameter", async () => {
                const env = new BrowserEnv();
                const url = await smart.authorize(env, {
                    fhirServiceUrl: "http://localhost",
                    encounterId: "whatever",
                    noRedirect: true
                });
                const state = (new URL(url as string)).searchParams.get("state");
                expect(await env.getStorage().get(state)).to.include({
                    tokenResponse: { encounter: "whatever" }
                });
            });

            it ("accepts patientId parameter", async () => {
                const env = new BrowserEnv();
                const url = await smart.authorize(env, {
                    fhirServiceUrl: "http://localhost",
                    patientId: "whatever",
                    noRedirect: true
                });
                const state = (new URL(url as string)).searchParams.get("state");
                expect(await env.getStorage().get(state)).to.include({
                    tokenResponse: { patient: "whatever" }
                });
            });

            it ("accepts fakeTokenResponse parameter", async () => {
                const env = new BrowserEnv();
                const url = await smart.authorize(env, {
                    fhirServiceUrl: "http://localhost",
                    fakeTokenResponse: { a: 1, b: 2 },
                    noRedirect: true
                });
                const state = (new URL(url as string)).searchParams.get("state");
                expect(await env.getStorage().get(state)).to.include({
                    tokenResponse: { a: 1, b: 2 }
                });
            });

            it ("accepts iss parameter from url", async () => {
                const env = new BrowserEnv({});
                mockServer.mock({
                    headers: { "content-type": "application/json" },
                    status: 200,
                    body: {
                        authorization_endpoint: mockUrl,
                        token_endpoint: mockUrl
                    }
                });
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
                mockServer.mock({
                    headers: { "content-type": "application/json" },
                    status: 404
                });
                mockServer.mock({
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
                                                // {
                                                //     url: "authorize",
                                                //     valueUri: "https://my-authorize-uri"
                                                // },
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
                env.redirect("http://localhost/?iss=" + mockUrl);
                const url = await smart.authorize(env, {
                    fhirServiceUrl: "http://localhost",
                    fakeTokenResponse: { a: 1, b: 2 },
                    redirectUri: "x",
                    noRedirect: true
                });

                expect(url).to.startWith("http://localhost/x?state=");
            });

            it ("works with absolute redirectUri", async () => {
                const env = new BrowserEnv();
                const url = await smart.authorize(env, {
                    fhirServiceUrl: "http://localhost",
                    redirectUri: "https://test.com",
                    noRedirect: true
                });
                const state = (new URL(url as string)).searchParams.get("state");
                expect(await env.getStorage().get(state)).to.include({
                    redirectUri: "https://test.com"
                });
            });

            // multi-config ---------------------------------------------------
            it ("requires iss url param in multi mode", () => {
                const env = new BrowserEnv({});
                expect(smart.authorize(env, [{noRedirect: true}])).to.reject(/"iss" url parameter is required/);
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
                ])).to.reject(/No configuration found matching the current "iss" parameter/);
            });

            it ("can match using String", async () => {
                const env = new BrowserEnv({});
                mockServer.mock({
                    headers: { "content-type": "application/json" },
                    status: 404
                });
                mockServer.mock({
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
                                                // {
                                                //     url: "authorize",
                                                //     valueUri: "https://my-authorize-uri"
                                                // },
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

                expect(url).to.startWith("http://localhost/x?state=");
            });

            it ("can match using RegExp", async () => {
                const env = new BrowserEnv({});
                mockServer.mock({
                    headers: { "content-type": "application/json" },
                    status: 404
                });
                mockServer.mock({
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
                                                // {
                                                //     url: "authorize",
                                                //     valueUri: "https://my-authorize-uri"
                                                // },
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
                        issMatch: /^http\:\/\/127\.0\.0\.1/,
                        fhirServiceUrl: "http://localhost",
                        fakeTokenResponse: { a: 1, b: 2 },
                        redirectUri: "x",
                        noRedirect: true
                    }
                ]);

                expect(url).to.startWith("http://localhost/x?state=");
            });

            it ("can match using Function", async () => {
                const env = new BrowserEnv({});
                mockServer.mock({
                    headers: { "content-type": "application/json" },
                    status: 404
                });
                mockServer.mock({
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
                                                // {
                                                //     url: "authorize",
                                                //     valueUri: "https://my-authorize-uri"
                                                // },
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

                expect(url).to.startWith("http://localhost/x?state=");
            });

            it ("can match using fhirServiceUrl", async () => {
                const env = new BrowserEnv({});
                mockServer.mock({
                    headers: { "content-type": "application/json" },
                    status: 404
                });
                mockServer.mock({
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
                                                // {
                                                //     url: "authorize",
                                                //     valueUri: "https://my-authorize-uri"
                                                // },
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

                expect(url).to.startWith("http://localhost/x?state=");
            });
        });

        describe("ready", () => {

            it ("rejects with error and error_description from the url", async () => {
                const env = new BrowserEnv();
                env.redirect("http://localhost/?error=test-error");
                await expect(smart.ready(env))
                    .to.reject(Error, "test-error");
                env.redirect("http://localhost/?error_description=test-error-description");
                await expect(smart.ready(env))
                    .to.reject(Error, "test-error-description");
                env.redirect("http://localhost/?error=test-error&error_description=test-error-description");
                await expect(smart.ready(env))
                    .to.reject(Error, "test-error: test-error-description");
            });

            it ("rejects with missing key", async () => {
                const env = new BrowserEnv();
                env.redirect("http://localhost/");
                await expect(smart.ready(env))
                    .to.reject(Error, /^No 'state' parameter found/);
            });

            it ("rejects with empty state", async () => {
                const env = new BrowserEnv();
                env.redirect("http://localhost/?state=whatever");
                await expect(smart.ready(env))
                    .to.reject(Error, /No state found/);
            });

        });

        describe("buildTokenRequest", () => {

            it ("rejects with missing state.redirectUri", () => {
                // @ts-ignore
                expect(smart.buildTokenRequest(new BrowserEnv(), { code: "whatever", state: {} }))
                    .to.reject("Missing state.redirectUri");
            });
            it ("rejects with missing state.tokenUri", () => {
                expect(smart.buildTokenRequest(new BrowserEnv(), {
                    code: "whatever",
                    // @ts-ignore
                    state: {
                        redirectUri: "whatever"
                    }
                })).to.reject("Missing state.tokenUri");
            });
            it ("rejects with missing state.clientId", () => {
                expect(smart.buildTokenRequest(new BrowserEnv(), {
                    code: "whatever",
                    // @ts-ignore
                    state: {
                        redirectUri: "whatever",
                        tokenUri: "whatever"
                    }
                })).to.reject("Missing state.clientId");
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
                expect(requestOptions.body).to.exist();
                expect(requestOptions.body).to.contain('&code_verifier=');
            });

        });

        describe("init", () => {
            it ("works in standalone mode", async () => {
                mockServer.mock({
                    headers: { "content-type": "application/json" },
                    status: 200,
                    body: {
                        authorization_endpoint: mockUrl,
                        token_endpoint: mockUrl
                    }
                });

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

                const env = new BrowserEnv();

                let client = await new Promise<any>((resolve, reject) => {

                    env.once("redirect", async () => {
                        env.redirect("http://localhost/?code=123&state=" + env.getUrl().searchParams.get("state"));
                        smart.init(env, {
                            client_id : "my_web_app",
                            scope     : "launch/patient",
                            iss       : mockUrl
                        }).then(resolve).catch(reject);
                    });

                    // This first call will NEVER resolve, but it will
                    // trigger a "redirect" event
                    smart.init(env, {
                        client_id : "my_web_app",
                        scope     : "launch/patient",
                        iss       : mockUrl
                    }).catch(reject);
                });

                expect(client.getPatientId()).to.equal("b2536dd3-bccd-4d22-8355-ab20acdf240b");
                expect(client.getEncounterId()).to.equal("e3ec2d15-4c27-4607-a45c-2f84962b0700");
                expect(client.getUserId()).to.equal("smart-Practitioner-71482713");
                expect(client.getUserType()).to.equal("Practitioner");

                // Now rey once again to test the page refresh flow
                env.redirect("http://localhost/?state=" + env.getUrl().searchParams.get("state"));
                client = await smart.init(env, {
                    client_id : "my_web_app",
                    scope     : "launch/patient",
                    iss       : mockUrl
                });

                expect(client.getPatientId()).to.equal("b2536dd3-bccd-4d22-8355-ab20acdf240b");
                expect(client.getEncounterId()).to.equal("e3ec2d15-4c27-4607-a45c-2f84962b0700");
                expect(client.getUserId()).to.equal("smart-Practitioner-71482713");
                expect(client.getUserType()).to.equal("Practitioner");
            });

            it ("works in EHR mode", async () => {
                const key = "my-key";

                mockServer.mock({
                    headers: { "content-type": "application/json" },
                    status: 200,
                    body: {
                        authorization_endpoint: mockUrl,
                        token_endpoint: mockUrl
                    }
                });

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

                const env = new BrowserEnv();

                let client = await new Promise<any>((resolve, reject) => {
                    env.redirect("http://localhost/?launch=123&state=" + key);

                    env.once("redirect", async () => {
                        env.redirect("http://localhost/?code=123&state=" + env.getUrl().searchParams.get("state"));
                        smart.init(env, {
                            client_id : "my_web_app",
                            scope     : "launch/patient",
                            iss       : mockUrl
                        }).then(resolve).catch(reject);
                    });

                    // This first call will NEVER resolve, but it will
                    // trigger a "redirect" event
                    smart.init(env, {
                        client_id : "my_web_app",
                        scope     : "launch/patient",
                        iss       : mockUrl
                    }).catch(reject);
                });

                expect(client.getPatientId()).to.equal("b2536dd3-bccd-4d22-8355-ab20acdf240b");
                expect(client.getEncounterId()).to.equal("e3ec2d15-4c27-4607-a45c-2f84962b0700");
                expect(client.getUserId()).to.equal("smart-Practitioner-71482713");
                expect(client.getUserType()).to.equal("Practitioner");

                // Now rey once again to test the page refresh flow
                env.redirect("http://localhost/?code=123");
                client = await smart.init(env, {
                    client_id : "my_web_app",
                    scope     : "launch/patient",
                    iss       : mockUrl
                });

                expect(client.getPatientId()).to.equal("b2536dd3-bccd-4d22-8355-ab20acdf240b");
                expect(client.getEncounterId()).to.equal("e3ec2d15-4c27-4607-a45c-2f84962b0700");
                expect(client.getUserId()).to.equal("smart-Practitioner-71482713");
                expect(client.getUserType()).to.equal("Practitioner");
            });

            it ("init() handles RFC 9207 iss on callback without treating it as FHIR server URL", async () => {
                const authIssuer = "https://auth.example.com/realms/test";

                mockServer.mock({
                    headers: { "content-type": "application/json" },
                    status: 200,
                    body: {
                        issuer: authIssuer,
                        authorization_endpoint: mockUrl,
                        token_endpoint: mockUrl
                    }
                });

                mockServer.mock({
                    headers: { "content-type": "application/json" },
                    status: 200,
                    body: {
                        "patient": "test-patient-1",
                        "token_type": "bearer",
                        "expires_in": 3600,
                        "access_token": "test-access-token"
                    }
                });

                const env = new BrowserEnv();

                const client = await new Promise<any>((resolve, reject) => {

                    env.once("redirect", async () => {
                        // Simulate callback with code, state, AND RFC 9207 iss
                        const stateKey = env.getUrl().searchParams.get("state");
                        env.redirect(
                            "http://localhost/?code=123&state=" + stateKey +
                            "&iss=" + encodeURIComponent(authIssuer)
                        );
                        smart.init(env, {
                            client_id : "my_web_app",
                            scope     : "launch/patient",
                            iss       : mockUrl
                        }).then(resolve).catch(reject);
                    });

                    smart.init(env, {
                        client_id : "my_web_app",
                        scope     : "launch/patient",
                        iss       : mockUrl
                    }).catch(reject);
                });

                // Should use the stored FHIR server URL, not the RFC 9207 iss
                expect(client.state.serverUrl).to.equal(mockUrl);
                // iss should have been stripped from the browser URL
                expect(window.history._location).to.not.contain("iss=");
            });
        });
    });

    describe("Targets", () => {

        async function testTarget(targetWindow, options, type?: string) {

            const env     = new BrowserEnv();
            const storage = env.getStorage();

            // mock our oauth endpoints
            mockServer.mock({
                headers: { "content-type": "application/json" },
                status: 200,
                body: {
                    authorization_endpoint: mockUrl,
                    token_endpoint: mockUrl
                }
            });

            const locationChangeListener1 = new Promise(resolve => {
                targetWindow.location.once("change", () => {
                    const top = (global as any).top;
                    (global as any).self = (global as any).window = targetWindow;
                    if (type == "frame") {
                        (global as any).parent = top;
                    } else if (type == "popup") {
                        (global as any).parent = targetWindow;
                        (global as any).opener = top;
                        (global as any).top    = targetWindow;
                        (global as any).window.name = "SMARTAuthPopup";
                    }

                    smart.ready(new BrowserEnv());
                    resolve();
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
                client_id: "my_client_id",
                ...options
            });
            // .then(resolve)
            // .catch(console.error);

            await locationChangeListener1;
            // await locationChangeListener2;

            // Now we have been redirected to `redirect` and then back to our
            // redirect_uri. It is time to complete the authorization. All that
            // should have happened in the targetWindow.
            const redirect = new URL(targetWindow.location.href);

            // Get the state parameter from the URL
            const state = redirect.searchParams.get("state");

            // Verify that the state is set
            expect(await storage.get(state), "must have set a state at " + state).to.exist();
        }

        it('target: () => "_top"', async () => {
            const top = (global as any).top = (global as any).window.top = new MockWindow();
            await testTarget(top, { target: () => "_top" });
        });

        it('target: "_top"', async () => {
            const top = (global as any).top = (global as any).window.top = new MockWindow();
            await testTarget(top, { target: "_top" });
        });

        it('target: "_top", completeInTarget: true', async () => {
            const top = (global as any).top = (global as any).window.top = new MockWindow();
            await testTarget(top, { target: "_top", completeInTarget: true });
        });

        it('target: "_parent"', async () => {
            const parent = (global as any).parent = (global as any).window.parent = new MockWindow();
            await testTarget(parent, { target: "_parent" });
        });

        it("target: window", async () => {
            await testTarget(window, { target: window });
        });

        it("target: invalidWindow corrected to _self", async () => {
            await testTarget(window, { target: {} });
        });

        it("target: invalidFunction corrected to _self", async () => {
            await testTarget(window, { target: () => NaN });
        });

        it("target: 'namedFrame'", async () => {
            const frame = new MockWindow();
            frame.parent = self;
            frame.top = self;
            (global as any).frames = { namedFrame: frame };
            await testTarget(frame, { target: "namedFrame" }, "frame");
        });

        // it("target: 'popup'", async () => {
        //     const frame = new MockWindow();
        //     frame.parent = self;
        //     frame.top = self;
        //     (global as any).frames = { namedFrame: frame };
        //     await testTarget(frame, { target: "namedFrame" }, "frame");
        // });

        it("target: 'xyz' corrected to _self", async () => {
            await testTarget(window, { target: "xyz" });
        });

        it("forbidden frame defaults to _self", async () => {
            const frame = new MockWindow();
            (global as any).frames = { namedFrame: frame };
            frame.location.readonly = true;
            await testTarget(window, { target: "namedFrame" });
        });

        it("forbidden popup defaults to _self", async () => {
            (self as any).once("beforeOpen", e => e.prevent());
            await testTarget(window, { target: "popup" });
        });

        describe("getTargetWindow", () => {
            it ('"_top"', async () => {
                expect(await lib.getTargetWindow("_top")).to.equal(top);
            });
            it ('() => "_top"', async () => {
                expect(await lib.getTargetWindow((() => "_top") as fhirclient.WindowTarget)).to.equal(top);
            });
            it ('async () => "_top"', async () => {
                expect(await lib.getTargetWindow((async () => "_top") as fhirclient.WindowTarget)).to.equal(top);
            });

            it ('"_self"', async () => {
                expect(await lib.getTargetWindow("_self" )).to.equal(self);
            });
            it ('() => "_self"', async () => {
                expect(await lib.getTargetWindow((() => "_self") as fhirclient.WindowTarget)).to.equal(self);
            });
            it ('async () => "_self"', async () => {
                expect(await lib.getTargetWindow((async () => "_self") as fhirclient.WindowTarget)).to.equal(self);
            });

            it ('"_parent"', async () => {
                expect(await lib.getTargetWindow("_parent" )).to.equal(parent);
            });
            it ('() => "_parent"', async () => {
                expect(await lib.getTargetWindow((() => "_parent") as fhirclient.WindowTarget)).to.equal(parent);
            });
            it ('async () => "_parent"', async () => {
                expect(await lib.getTargetWindow((async () => "_parent") as fhirclient.WindowTarget)).to.equal(parent);
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
                (self as any).once("beforeOpen", e => e.prevent());
                expect(await lib.getTargetWindow("_blank")).to.equal(self);
            });
            it ('blocked () => "_blank" fails back to "_self"', async () => {
                (self as any).once("beforeOpen", e => e.prevent());
                expect(await lib.getTargetWindow((() => "_blank") as fhirclient.WindowTarget)).to.equal(self);
            });
            it ('blocked async () => "_blank" fails back to "_self"', async () => {
                (self as any).once("beforeOpen", e => e.prevent());
                expect(await lib.getTargetWindow((async () => "_blank") as fhirclient.WindowTarget)).to.equal(self);
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
                (self as any).once("beforeOpen", e => e.prevent());
                expect(await lib.getTargetWindow("popup")).to.equal(self);
            });
            it ('blocked () => "popup" fails back to "_self"', async () => {
                (self as any).once("beforeOpen", e => e.prevent());
                expect(await lib.getTargetWindow((() => "popup") as fhirclient.WindowTarget)).to.equal(self);
            });
            it ('blocked async () => "popup" fails back to "_self"', async () => {
                (self as any).once("beforeOpen", e => e.prevent());
                expect(await lib.getTargetWindow((async () => "popup") as fhirclient.WindowTarget)).to.equal(self);
            });

            it ("accepts frame by name", async () => {
                const dummy = {} as Window;
                (global as any).frames.dummy = dummy;
                expect(await lib.getTargetWindow("dummy")).to.equal(dummy);
            });

            it ('unknown frame name fails back to "_self"', async () => {
                expect(await lib.getTargetWindow("whatever")).to.equal(self);
            });

            it ('unknown frame index fails back to "_self"', async () => {
                expect(await lib.getTargetWindow(0)).to.equal(self);
            });

            it ("accepts window references", async () => {
                const dummy = {} as Window;
                expect(await lib.getTargetWindow(dummy)).to.equal(dummy);
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
                expect(smart.isInFrame()).to.equal(false);
            });
            it ("returns true in frames by default", () => {
                (global as any).top = (global as any).window.top = new MockWindow();
                (global as any).parent = (global as any).window.parent = top;
                expect(smart.isInFrame()).to.equal(true);
            });
        });

        describe("isInPopUp", () => {
            it ("returns false by default", () => {
                expect(smart.isInPopUp()).to.equal(false);
            });
            it ("returns false if self !== top", () => {
                (global as any).top = new MockWindow();
                expect(smart.isInPopUp()).to.equal(false);
            });
            it ("returns false if !opener", () => {
                (global as any).opener = null;
                expect(smart.isInPopUp()).to.equal(false);
            });
            it ("returns false if opener === self", () => {
                (global as any).opener = self;
                expect(smart.isInPopUp()).to.equal(false);
            });
            it ("returns false if !window.name", () => {
                (global as any).window.name = "";
                expect(smart.isInPopUp()).to.equal(false);
            });
            it ("returns true in popups", () => {
                (global as any).opener = new MockWindow();
                (global as any).window.name = "whatever";
                expect(smart.isInPopUp()).to.equal(true);
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
            //     // (global as any).top = new MockWindow();
            //     Object.assign(global as any, win);
            //     Object.defineProperty(global, "parent", {
            //         get() {
            //             throw new Error("Not accessible");
            //         }
            //     });
            //     expect(smart.isInFrame()).to.equal(true);
            // });
        });

        it ("authorize in popup returns control to opener", (next) => {
            const opener = new MockWindow("http://localhost?state=TEST");
            opener.location.once("change", () => next());
            (global as any).opener = opener;

            // pretend that we are in a popup
            const popup  = new MockWindow("http://localhost?state=TEST", "SMARTAuthPopup");
            (global as any).parent = popup;
            (global as any).top = (global as any).self = popup;
            // (global as any).self   = popup;
            (global as any).window = popup;
            (global as any).sessionStorage = popup.sessionStorage;
            popup.sessionStorage.setItem("SMART_KEY", '"TEST"');
            popup.sessionStorage.setItem("TEST", JSON.stringify({}));

            smart.ready(new BrowserEnv());
        });

        it ("authorize in frame returns control to parent", (next) => {
            const parent = new MockWindow("http://localhost?state=TEST");
            parent.location.once("change", () => next());
            (global as any).parent = parent;
            (global as any).top    = top;

            // pretend that we are in a popup
            const frame  = new MockWindow("http://localhost?state=TEST");
            (global as any).self = frame;
            (global as any).window = frame;
            (global as any).sessionStorage = frame.sessionStorage;
            sessionStorage.setItem("SMART_KEY", '"TEST"');
            sessionStorage.setItem("TEST", JSON.stringify({}));

            smart.ready(new BrowserEnv());
        });

        it ("authorize in frame does not return control to parent if 'complete' is true", async () => {
            const parent = new MockWindow("http://localhost");
            // parent.location.once("change", () => next());
            (global as any).parent = parent;
            (global as any).top    = parent;

            // pretend that we are in a popup
            const frame  = new MockWindow("http://localhost?state=TEST&complete=1");
            (global as any).self   = frame;
            (global as any).window = frame;
            (global as any).sessionStorage = frame.sessionStorage;
            // frame.sessionStorage.setItem("SMART_KEY", '"TEST"');
            sessionStorage.setItem("TEST", JSON.stringify({
                // completeInTarget: true
            }));

            await expect(smart.ready(new BrowserEnv())).to.reject();
        });

        describe("onMessage", () => {
            it ("ignores postMessage if the event type is not 'completeAuth'", () => {
                let error = null;
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
                let error = null;
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

    // describe("BrowserAdapter", () => {

    //     it ("base64urlencode a string", () => {
    //         // @ts-ignore
    //         const env = new Adapter({})
    //         const input = "This is a test"
    //         expect(env.base64urlencode(input)).to.equal(Buffer.from(input).toString("base64url"))
    //     })
    
    //     it ("base64urlencode an Uint8Array", () => {
    //         // @ts-ignore
    //         const env = new Adapter({})
    //         const input = "This is a test"
    //         expect(env.base64urlencode(new TextEncoder().encode(input))).to.equal(Buffer.from(input).toString("base64url"))
    //     })
    
    //     it ("base64urldecode", () => {
    //         // @ts-ignore
    //         const env = new Adapter({})
    //         const input = Buffer.from("test").toString("base64url")
    //         expect(env.base64urldecode(input)).to.equal("test")
    //     })
    // })
});
