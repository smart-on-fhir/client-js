import {
  base64url,
  KeyLike,
  SignJWT,
  importJWK as joseImportJWK
} from "jose"
import {
  randomBytes,
  createHash
} from "crypto"
import { fhirclient } from "../types";


export interface PkcePair {
    codeChallenge: string;
    codeVerifier: string;
}

// declare const ALGS: {
//     ES384: EcKeyGenParams;
//     RS384: RsaHashedKeyGenParams;
// };

export type SupportedAlg = 'ES384' | 'RS384'


export { randomBytes }

export async function digestSha256(payload: string) {
    const hash = createHash('sha256')
    hash.update(payload)
    return hash.digest()
}

export async function generatePKCEChallenge(entropy = 96): Promise<PkcePair> {
    const inputBytes    = randomBytes(entropy)
    const codeVerifier  = base64url.encode(inputBytes)
    const codeChallenge = base64url.encode(await digestSha256(codeVerifier))
    return { codeChallenge, codeVerifier }
}

export async function importJWK(jwk: fhirclient.JWK): Promise<CryptoKey> {
    // alg is optional in JWK but we need it here!
    if (!jwk.alg) {
        throw new Error('The "alg" property of the JWK must be set to "ES384" or "RS384"')
    }

    // Use of the "key_ops" member is OPTIONAL, unless the application requires its presence.
    // https://www.rfc-editor.org/rfc/rfc7517.html#section-4.3
    // 
    // In our case the app will only import private keys so we can assume "sign"
    if (!Array.isArray(jwk.key_ops)) {
        jwk.key_ops = ["sign"]
    }

    // In this case the JWK has a "key_ops" array and "sign" is not listed
    if (!jwk.key_ops.includes("sign")) {
        throw new Error('The "key_ops" property of the JWK does not contain "sign"')
    }

    return joseImportJWK(jwk) as Promise<CryptoKey>
}

export async function signCompactJws(alg: SupportedAlg, privateKey: KeyLike, header: any, payload: any): Promise<string> {
    return new SignJWT(payload).setProtectedHeader({...header, alg}).sign(privateKey)
}

// async function test(){

//     const { generateKeyPair } = require("jose")

//     const esk = await generateKeyPair("ES384", { extractable: true });
//     console.log("ES384 privateKey:", esk.privateKey);
//     const eskSigned = await new SignJWT({ iss: "issuer" }).setProtectedHeader({ alg: 'ES384', jwku: "test" }).sign(esk.privateKey);
//     console.log("Signed ES384", eskSigned);
//     console.log(JSON.stringify(await exportJWK(esk.publicKey)))

//     const rsk = await generateKeyPair('RS384', { extractable: true });
//     console.log("RS384 privateKey:", rsk.privateKey);
//     const rskSigned = await new SignJWT({ iss: "issuer" }).setProtectedHeader({ alg: 'RS384', jwku: "test" }).sign(rsk.privateKey);
//     console.log("Signed RS384", rskSigned);
//     console.log(JSON.stringify(await exportJWK(rsk.publicKey)))
// }

// test()