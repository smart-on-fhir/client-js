// @ts-ignore These tests cannot run without webcrypto
if (+process.version.replace(/^v/, "").split(".").shift() < 16) return;

// provide global crypto for older Node versions
if (!global.crypto) {
    global.crypto = require('node:crypto').webcrypto;
}

import { expect }           from "@hapi/code";
import { fhirclient }       from "../src/types";
import * as jose            from 'jose';
import * as Lab             from "@hapi/lab";
import * as serverSecurity  from "../src/security/server"
import * as browserSecurity from "../src/security/browser"

export const lab = Lab.script();
const { it, describe } = lab;

// =============================================================================

// base64urlencode -------------------------------------------------------------
// server  - (input: string | Uint8Array) => string
// browser - (input: string | Uint8Array) => string

// base64urldecode -------------------------------------------------------------
// server  - (input: string) => string
// browser - (input: string) => string 

// randomBytes -----------------------------------------------------------------
// server  - (size: number) => Buffer
// browser - (size: number) => Uint8Array

// digestSha256 ----------------------------------------------------------------
// server  - (payload: string) => Promise<Buffer>
// browser - (payload: string) => Promise<Uint8Array>

// generatePKCEChallenge -------------------------------------------------------
// server  - (entropy = 96) => Promise<PkcePair>
// browser - (entropy = 96) => Promise<PkcePair>

// importJWK -------------------------------------------------------------------
// server  - (jwk: fhirclient.JWK) => Promise<KeyLike>
// browser - (jwk: fhirclient.JWK) => Promise<CryptoKey>

// signCompactJws
// server  - (alg: SupportedAlg     , privateKey: KeyLike  , header: any, payload: any) => Promise<string>
// browser - (alg: keyof typeof ALGS, privateKey: CryptoKey, header: any, payload: any) => Promise<string>

// =============================================================================

describe("security", () => {
    // describe("base64urlencode", () => {
    //     it ("from string", () => {
    //         const input = "This is a test"
    //         const s = serverSecurity .base64urlencode(input)
    //         const b = browserSecurity.base64urlencode(input)
    //         expect(s).to.equal(b)
    //     })

    //     it ("from Uint8Array", () => {
    //         const input = "This is a test"
    //         const s = serverSecurity .base64urlencode(new TextEncoder().encode(input))
    //         const b = browserSecurity.base64urlencode(new TextEncoder().encode(input))
    //         expect(s).to.equal(b)
    //     })
    // })

    // it ("base64urldecode", () => {
    //     const input = "This is a test"
    //     const s = serverSecurity .base64urldecode(Buffer.from(input, "utf8").toString("base64url"))
    //     const b = browserSecurity.base64urldecode(Buffer.from(input, "utf8").toString("base64url"))
    //     expect(s).to.equal(b)
    //     expect(s).to.equal(input)
    // })

    it ("randomBytes", () => {
        const s = serverSecurity .randomBytes(90)
        const b = browserSecurity.randomBytes(90)
        expect(s.byteLength).to.equal(b.byteLength)
        expect(s.byteLength).to.equal(90)
    })

    it ("digestSha256", async () => {
        const input = "This is a test"
        const s = await serverSecurity .digestSha256(input)
        const b = await browserSecurity.digestSha256(input)
        expect(Uint8Array.from(s).toString()).to.equal(b.toString())
    })

    it ("generatePKCEChallenge", async () => {
        const s = await serverSecurity .generatePKCEChallenge(90)
        const b = await browserSecurity.generatePKCEChallenge(90)
        expect(s).to.contain("codeChallenge")
        expect(s).to.contain("codeVerifier")
        expect(b).to.contain("codeChallenge")
        expect(b).to.contain("codeVerifier")
        expect(s.codeChallenge).to.not.equal(b.codeChallenge)
        expect(s.codeVerifier).to.not.equal(b.codeVerifier)
    })

    describe("importJWK", () => {

        const ES384_JWK = {
            "kty": "EC",
            "crv": "P-384",
            "d": "WcrTiYk8jbI-Sd1sKNpqGmELWGG08bf_y9SSlnC4cpAl5GRdHHN9gKYlPvMFqiJ5",
            "x": "wcE8O55ro6aOuTf5Ty1k_IG4mTcuLiVercHouge1G5Ri-leevhev4uJzlHpi3U8r",
            "y": "mLRgz8Giu6XA_AqG8bywqbygShmd8jowflrdx0KQtM5X4s4aqDeCRfcpexykp3aI",
            "kid": "afb27c284f2d93959c18fa0320e32060",
            "alg": "ES384",
            // "key_ops": [ "sign" ]
        }

        const RS384_JWK = {
            "kty": "RSA",
            "alg": "RS384",
            "n": "xo_gxYK3pcbczo8tSXLRaFGKBGEjQpk9tXnLEgZ3P0bAG8I26Sw4LSzMw2Mqz4aF0E73AUAkephuKMWSneGO6ZI0uAOaRXYXruHHAG68pK5dT8MZyWnXAwwNYK_QmtnC7Bc7jmqRDn9jANo6iREtkFvuNpyOv-tVk8waZoTG4zf0O4AOXSiRFp4N4_QWwyhzUX8mhjtW5hFZcg6vm_VIcDv1E5rcumbc3ga53c8G6_lNoKfRzh4Mhf8-Mnljszo7x8MdLZ7OEhMAg8DCzx66Vsm4dOassRRIFNUyBsu3fRslByLdUoXdcjMmp0hYqPVKxpukgb-WQEeVWsB-lAjZHw",
            "e": "AQAB",
            "d": "qEnfTmcYsWdXU7ZjwqGOvCSHnmiZ0uNAOuQL6a4TOU0Em0JC-eMhhaA3t83_xb2VAlU64hN0F3fDvcieGDPIxUvGZMOg6AhL0EvJNyOjvMuPiH-qBlwvAIUhfXXljqjLnP-f2XeWk7wBtAJBpFQr0vMndZ_BGQYjFM3i_krAqmgMPorxRmP5FZIeSyXAyGhuqBZ_N4s_-BitBrAm7MlEexc4FwxQg3hDoZ9gk1DcKnnpYCtZGUj3zhcxXzp2vOu9PHiBJ91GbPp9yOwWie4-bd8Q2XJT0cOfVRLbqsVQkarvS7zHWqlmIRUiJM-Ffhv8rwuWOlnM1mhC0bkDBJb8MQ",
            "p": "_blYwdk-rAX1IiKnBUGn72zALfd0gjkVMHI_0-O56zUHTthVhVZ0TS7B0SwtgZU48rnSewf2SiZyfk3jMfgvmt6M6B0HIXbE0OdPhFt_qfo8AbwdZ4cmmRiqk-k5EBqchI2Rd6hy5t6YIR24XHZeArqF7zI-x9p_XSJ41wMn0qc",
            "q": "yFfbZDxSpdHP8eSTwUmjB-FPyPYwQHdtSNE3UfqlGF0iCt_TBS2kY8DceI6F67IixOMUEbKqAEZYB_gcU5cbyDW77lEejmdNyT3QQicJYmiAicv3sIXDS5Y4zONah64stqZR3jLAXSdz1NEzIiKN8LC_3LBnleo0MNFspYaqbMk",
            "dp": "zdaAW0OTxJtQs9DJD0qko2jmwGPw8XS96__EKHKnclojA6QePX5V_Afi1X-xq18URFbcm1NqS93FJRKrLu7aMBo81lI2Zr-kDJabvBU_DPcll4K1mDfc6HdKa5TZ5mawdBkl2p2eGg6b_MHPv7OHsU8BOXzZ0elBSp2cy1KUDCE",
            "dq": "F3vE6bDwdyNq3o3Oi_-XrprIgWPqMARPuRNdCqz4oSx5ixDFaXv6Iv8-WJtMM16EGNQNTC3HI5UbSIPavimeRg-WYc78Z_DP-2DVgouU3AYn2v8fn39ubvPC4LFdsT3HW_mO6x7D0aeIOk_zUHMAdFAjjTjYS4hSac6Cj7yDSZE",
            "qi": "S0_CM6gD7_QZYM4LURTT_zpiaG5WDsGhKzw67fBNfpvS79T4Y-C9ICLc9h2SFflMXRry9SiKNDOdBm1MqYXm4R5ExHxr1DYzoBOk6q6ejlo8iImnKt-BhEU-L21NZzKxJXuS3Bu6RPYtclRfbAQP_BwxjtM4kwXnewXhZQrKb1Y",
            "kid": "5f75856796f2270469566ceb84c204f6",
            // "key_ops": [ "sign" ]
        }

        it ("ES384 in the browser", async () => {
            await browserSecurity.importJWK(ES384_JWK as fhirclient.JWK)
        })

        it ("ES384 on the server", async () => {
            await serverSecurity.importJWK(ES384_JWK as fhirclient.JWK)
        })

        it ("RS384 in the browser", async () => {
            await browserSecurity.importJWK(RS384_JWK as fhirclient.JWK)
        })

        it ("RS384 on the server", async () => {
            await serverSecurity.importJWK(RS384_JWK as fhirclient.JWK)
        })

        it ("ES384 in the browser throws without 'sign' in key_ops", async () => {
            expect(browserSecurity.importJWK({ ...ES384_JWK, key_ops: ["verify"] } as fhirclient.JWK)).to.reject('The "key_ops" property of the JWK does not contain "sign"')
        })

        it ("ES384 on the server throws without 'sign' in key_ops", async () => {
            expect(serverSecurity.importJWK({ ...ES384_JWK, key_ops: ["verify"] } as fhirclient.JWK)).to.reject('The "key_ops" property of the JWK does not contain "sign"')
        })

        it ("RS384 in the browser throws without 'sign' in key_ops", async () => {
            expect(browserSecurity.importJWK({ ...RS384_JWK, key_ops: ["verify"] } as fhirclient.JWK)).to.reject('The "key_ops" property of the JWK does not contain "sign"')
        })

        it ("RS384 on the server throws without 'sign' in key_ops", async () => {
            expect(serverSecurity.importJWK({ ...RS384_JWK, key_ops: ["verify"] } as fhirclient.JWK)).to.reject('The "key_ops" property of the JWK does not contain "sign"')
        })

        it ("ES384 in the browser throws without JWK.alg", async () => {
            // @ts-ignore
            expect(browserSecurity.importJWK({ ...ES384_JWK, alg: undefined } as fhirclient.JWK)).to.reject('The "alg" property of the JWK must be set to "ES384" or "RS384"')
        })

        it ("ES384 on the server throws without JWK.alg", async () => {
            // @ts-ignore
            expect(serverSecurity.importJWK({ ...ES384_JWK, alg: undefined } as fhirclient.JWK)).to.reject('The "alg" property of the JWK must be set to "ES384" or "RS384"')
        })

        it ("RS384 in the browser throws without JWK.alg", async () => {
            // @ts-ignore
            expect(browserSecurity.importJWK({ ...RS384_JWK, alg: undefined } as fhirclient.JWK)).to.reject('The "alg" property of the JWK must be set to "ES384" or "RS384"')
        })

        it ("RS384 on the server throws without JWK.alg", async () => {
            // @ts-ignore
            expect(serverSecurity.importJWK({ ...RS384_JWK, alg: undefined } as fhirclient.JWK)).to.reject('The "alg" property of the JWK must be set to "ES384" or "RS384"')
        })

        it ("ES384 in the browser throws with bad JWK", async () => {
            // @ts-ignore
            expect(browserSecurity.importJWK({ ...ES384_JWK, kty: "x" } as fhirclient.JWK)).to.reject()
        })

        it ("ES384 on the server throws with bad JWK", async () => {
            // @ts-ignore
            expect(serverSecurity.importJWK({ ...ES384_JWK, kty: "x" } as fhirclient.JWK)).to.reject()
        })

        it ("RS384 in the browser throws with bad JWK", async () => {
            // @ts-ignore
            expect(browserSecurity.importJWK({ ...RS384_JWK, kty: "x" } as fhirclient.JWK)).to.reject()
        })

        it ("RS384 on the server throws with bad JWK", async () => {
            // @ts-ignore
            expect(serverSecurity.importJWK({ ...RS384_JWK, kty: "x" } as fhirclient.JWK)).to.reject()
        })
    })

    describe("signCompactJws", () => {

        const jwtHeaders = { typ: "JWT", kid: "test-kid" };
        const jwtClaims = {};

        it ("ES384 on the server", async () => {
            const esk = await jose.generateKeyPair("ES384", { extractable: true });
            const clientAssertion = await serverSecurity .signCompactJws("ES384", esk.privateKey, jwtHeaders, jwtClaims)
            await jose.compactVerify(clientAssertion, esk.publicKey)
        })

        it ("ES384 in the browser", async () => {
            const { publicKey, privateKey } = await crypto.subtle.generateKey({
                name: "ECDSA",
                namedCurve: "P-384"
            }, true, ["sign", "verify"]);

            const clientAssertion = await browserSecurity.signCompactJws("ES384", privateKey, jwtHeaders, jwtClaims)
            await jose.compactVerify(clientAssertion, publicKey)
        })

        it ("RS384 on the server", async () => {
            const esk = await jose.generateKeyPair("RS384", { extractable: true });
            const clientAssertion = await serverSecurity .signCompactJws("RS384", esk.privateKey, jwtHeaders, jwtClaims)
            await jose.compactVerify(clientAssertion, esk.publicKey)
        })

        it ("RS384 in the browser", async () => {
            const { publicKey, privateKey } = await crypto.subtle.generateKey({
                name: "RSASSA-PKCS1-v1_5",
                modulusLength: 4096,
                publicExponent: new Uint8Array([1, 0, 1]),
                hash: {
                    name: 'SHA-384'
                }
            }, true, ["sign", "verify"]);

            const clientAssertion = await browserSecurity.signCompactJws("RS384", privateKey, jwtHeaders, jwtClaims)
            await jose.compactVerify(clientAssertion, publicKey)
        })
    })

    // it ("s2b", () => {
    //     function s2b ( s: string ) {
    //         var b = new Uint8Array(s.length);
    //         for ( var i = 0; i < s.length; i++ ) b[i] = s.charCodeAt(i);
    //         return b;
    //     }

    //     const s = new TextEncoder().encode("this is a test")
    //     const b = s2b("this is a test")
    //     expect(s).to.equal(b)
    // })

    // it ("ab2str", () => {
    //     function str2ab(str) {
    //         var buf = new ArrayBuffer(str.length*2); // 2 bytes for each char
    //         var bufView = new Uint16Array(buf);
    //         for (var i=0, strLen=str.length; i<strLen; i++) {
    //             bufView[i] = str.charCodeAt(i);
    //         }
    //         return buf;
    //     }
        
    //     const s = str2ab("this is a test")
    //     const b = String.fromCharCode.apply(null, new Uint16Array(s))
    //     expect(b).to.equal("this is a test")
    // })
});
