import * as jose      from 'jose';
import { expect }     from "@hapi/code";
import * as Lab       from "@hapi/lab";
import * as smart     from "../src/smart";
import { fhirclient } from "../src/types";
import ServerEnv      from "./mocks/ServerEnvironment";
export const lab = Lab.script();
const { it, describe } = lab;

try { var { subtle } = require('node:crypto').webcrypto; } catch {}

const defaultState: fhirclient.ClientState = {
    serverUrl  : 'https://server.example.org',
    redirectUri: 'https://client.example.org/after-auth',
    tokenUri   : 'https://server.example.org/token',
    clientId   : 'example-client-id',
};

const clientPrivateJwk: fhirclient.ES384JWK = {
    "alg": "ES384",
    "kty": "EC",
    "crv": "P-384",
    "d"  : "WcrTiYk8jbI-Sd1sKNpqGmELWGG08bf_y9SSlnC4cpAl5GRdHHN9gKYlPvMFqiJ5",
    "x"  : "wcE8O55ro6aOuTf5Ty1k_IG4mTcuLiVercHouge1G5Ri-leevhev4uJzlHpi3U8r",
    "y"  : "mLRgz8Giu6XA_AqG8bywqbygShmd8jowflrdx0KQtM5X4s4aqDeCRfcpexykp3aI",
    "kid": "afb27c284f2d93959c18fa0320e32060",
}

const defaultStateAsymmetricAuth: fhirclient.ClientState = {
    ...defaultState,
    clientPublicKeySetUrl: "https://client.example.org/.well-known/jwks.json",
    clientPrivateJwk
};

const defaultEnv = new ServerEnv();




describe("smart", () => {

    describe("buildTokenRequest", () => {
        it("uses state.clientSecret", async () => {
            // @ts-expect-error: ServerEnv is used as Adapter for testing purposes
            const requestOptions = await smart.buildTokenRequest(defaultEnv, {
                code: "example-code",
                state: {
                    ...defaultState,
                    clientSecret: "test-secret"
                }
            });

            const authz = (requestOptions.headers as Record<string, string> | undefined)?.['authorization'] as string;
            expect(authz).to.exist();
            expect(authz).to.startWith("Basic ")
        });

        it("throws without JWK.alg", async () => {
            // @ts-expect-error: ServerEnv is used as Adapter for testing purposes
            expect(smart.buildTokenRequest(defaultEnv, {
                code: "example-code",
                state: defaultStateAsymmetricAuth,
                // @ts-ignore
                privateKey: { ...clientPrivateJwk, alg: undefined }
            })).to.reject('The "alg" property of the JWK must be set to "ES384" or "RS384"')
        })

        it("throws without 'sign' in key_ops", async () => {
            // @ts-expect-error: ServerEnv is used as Adapter for testing purposes
            expect(smart.buildTokenRequest(defaultEnv, {
                code: "example-code",
                state: defaultStateAsymmetricAuth,
                privateKey: { ...clientPrivateJwk, key_ops: ["verify"] }
            })).to.reject('The "key_ops" property of the JWK does not contain "sign"')
        })

        it("generates an assertion with state.clientPrivateJwk", async () => {
            // @ts-expect-error: ServerEnv is used as Adapter for testing purposes
            const requestOptions = await smart.buildTokenRequest(defaultEnv, {
                code: "example-code",
                state: defaultStateAsymmetricAuth,
                privateKey: clientPrivateJwk
            });

            expect(requestOptions.body).to.exist();
            expect(requestOptions.body).to.contain('&client_assertion=');
            expect(requestOptions.body).to.contain('&client_assertion_type=urn%3Aietf%3Aparams%3Aoauth%3Aclient-assertion-type%3Ajwt-bearer');

            const assertionMatch = (requestOptions.body as string).match(/client_assertion=(?<assertion>[^&]+)/);
            expect(assertionMatch).not.to.be.null;

            const assertion = assertionMatch?.groups?.assertion;
            expect(assertion).to.exist;

            const clientKey = await jose.importJWK(defaultStateAsymmetricAuth.clientPrivateJwk!);
            let validated = await jose.compactVerify(assertion!, clientKey)
            expect(validated).to.exist;
            expect(validated.protectedHeader["jku"]).to.equal(defaultStateAsymmetricAuth.clientPublicKeySetUrl);
            expect(validated.protectedHeader["kid"]).to.equal(defaultStateAsymmetricAuth.clientPrivateJwk!.kid);
            expect(validated.protectedHeader["typ"]).to.equal("JWT");

            let payload: any = JSON.parse(new TextDecoder().decode(validated.payload));

            expect(payload["aud"]).to.equal(defaultStateAsymmetricAuth.tokenUri);
            expect(payload["iss"]).to.equal(defaultStateAsymmetricAuth.clientId);
            expect(payload["sub"]).to.equal(defaultStateAsymmetricAuth.clientId);
            expect(payload["exp"]).to.exist();
            expect(payload["jti"]).to.exist();
 
        });

        if (subtle) {
            it("works with ES384 CryptoKey instance", async () => {
                const alg = "ES384"
                const kid = "afb27c284f2d93959c18fa0320e32060"
                const jku = "https://client.example.org/.well-known/jwks.json";

                const { privateKey, publicKey } = await subtle.generateKey({
                    name: "ECDSA",
                    namedCurve: "P-384"
                }, false, ["sign", "verify"])

                // @ts-expect-error: ServerEnv is used as Adapter for testing purposes
                const requestOptions = await smart.buildTokenRequest(defaultEnv, {
                    code: "example-code",
                    state: defaultStateAsymmetricAuth,
                    clientPublicKeySetUrl: jku,
                    privateKey: {
                        kid,
                        alg,
                        key: privateKey
                    }
                });

                expect(requestOptions.body).to.exist();
                expect(requestOptions.body).to.contain('&client_assertion=');
                expect(requestOptions.body).to.contain('&client_assertion_type=urn%3Aietf%3Aparams%3Aoauth%3Aclient-assertion-type%3Ajwt-bearer');

                const assertionMatch = (requestOptions.body as string).match(/client_assertion=(?<assertion>[^&]+)/);
                expect(assertionMatch).not.to.be.null;

                const assertion = assertionMatch?.groups?.assertion;
                expect(assertion).to.exist;

                const validated = await jose.compactVerify(assertion!, publicKey)
                expect(validated).to.exist;
                expect(validated.protectedHeader["jku"]).to.equal(jku);
                expect(validated.protectedHeader["kid"]).to.equal(kid);
                expect(validated.protectedHeader["typ"]).to.equal("JWT");

                const payload: any = JSON.parse(new TextDecoder().decode(validated.payload));
                expect(payload["aud"]).to.equal(defaultStateAsymmetricAuth.tokenUri);
                expect(payload["iss"]).to.equal(defaultStateAsymmetricAuth.clientId);
                expect(payload["sub"]).to.equal(defaultStateAsymmetricAuth.clientId);
                expect(payload["exp"]).to.exist();
                expect(payload["jti"]).to.exist();
            });

            it("works with RS384 CryptoKey instance", async () => {
                const alg = "RS384"
                const kid = "afb27c284f2d93959c18fa0320e32060"
                const jku = "https://client.example.org/.well-known/jwks.json";

                const { privateKey, publicKey } = await subtle.generateKey({
                    name: "RSASSA-PKCS1-v1_5",
                    modulusLength: 4096,
                    publicExponent: new Uint8Array([1, 0, 1]),
                    hash: {
                        name: 'SHA-384'
                    }
                }, false, ["sign", "verify"])

                // @ts-expect-error: ServerEnv is used as Adapter for testing purposes
                const requestOptions = await smart.buildTokenRequest(defaultEnv, {
                    code: "example-code",
                    state: defaultStateAsymmetricAuth,
                    clientPublicKeySetUrl: jku,
                    privateKey: {
                        kid,
                        alg,
                        key: privateKey
                    }
                });

                expect(requestOptions.body).to.exist();
                expect(requestOptions.body).to.contain('&client_assertion=');
                expect(requestOptions.body).to.contain('&client_assertion_type=urn%3Aietf%3Aparams%3Aoauth%3Aclient-assertion-type%3Ajwt-bearer');

                const assertionMatch = (requestOptions.body as string).match(/client_assertion=(?<assertion>[^&]+)/);
                expect(assertionMatch).not.to.be.null;

                const assertion = assertionMatch?.groups?.assertion;
                expect(assertion).to.exist;

                const validated = await jose.compactVerify(assertion!, publicKey)
                expect(validated).to.exist;
                expect(validated.protectedHeader["jku"]).to.equal(jku);
                expect(validated.protectedHeader["kid"]).to.equal(kid);
                expect(validated.protectedHeader["typ"]).to.equal("JWT");

                const payload: any = JSON.parse(new TextDecoder().decode(validated.payload));
                expect(payload["aud"]).to.equal(defaultStateAsymmetricAuth.tokenUri);
                expect(payload["iss"]).to.equal(defaultStateAsymmetricAuth.clientId);
                expect(payload["sub"]).to.equal(defaultStateAsymmetricAuth.clientId);
                expect(payload["exp"]).to.exist();
                expect(payload["jti"]).to.exist();
            });
        }

        it("fails with broken state.clientPrivateJwk", async () => {
            // @ts-expect-error: ServerEnv is used as Adapter for testing purposes
            expect(smart.buildTokenRequest(defaultEnv, {
                code: "example-code",
                state: {
                    ...defaultStateAsymmetricAuth
                },
                privateKey: { 
                    alg: "RS384",
                    kid: "whatever",
                    kty: "RSA"
                }
            })).to.reject();
        });

    });
});
