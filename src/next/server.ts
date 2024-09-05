import { randomBytes, createHash } from "crypto"
import { base64url, KeyLike, SignJWT, importJWK as joseImportJWK } from "jose"
import { fhirclient } from "../types"


interface PkcePair {
    codeChallenge: string;
    codeVerifier: string;
}

type SupportedAlg = 'ES384' | 'RS384'

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

export function base64urlencode(input: string | Uint8Array) {
    return base64url.encode(input);
}

export function base64urldecode(input: string) {
    return base64url.decode(input).toString();
}


