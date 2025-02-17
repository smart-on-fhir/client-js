import { encodeURL, fromUint8Array } from "js-base64"
import { fhirclient }                from "../types"


const crypto: Crypto = typeof globalThis === "object" && globalThis.crypto ?
    globalThis.crypto :
    require("isomorphic-webcrypto").default;

const subtle = () => {
    if (!crypto.subtle) {
        if (!globalThis.isSecureContext) {
            throw new Error(
                "Some of the required subtle crypto functionality is not " +
                "available unless you run this app in secure context (using " +
                "HTTPS or running locally). See " +
                "https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts"
            )
        }
        throw new Error(
            "Some of the required subtle crypto functionality is not " +
            "available in the current environment (no crypto.subtle)"
        )
    }
    return crypto.subtle
}


interface PkcePair {
    codeChallenge: string
    codeVerifier: string
}

const ALGS = {
    ES384: {
        name: "ECDSA",
        namedCurve: "P-384"
    } as EcKeyGenParams,
    RS384: {
        name: "RSASSA-PKCS1-v1_5",
        modulusLength: 4096,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: {
            name: 'SHA-384'
        }
    } as RsaHashedKeyGenParams
};

export function randomBytes(count: number): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(count));
}

export async function digestSha256(payload: string): Promise<Uint8Array> {
    const prepared = new TextEncoder().encode(payload);
    const hash = await subtle().digest('SHA-256', prepared);
    return new Uint8Array(hash);
}

export const generatePKCEChallenge = async (entropy = 96): Promise<PkcePair> => {
    const inputBytes    = randomBytes(entropy)
    const codeVerifier  = fromUint8Array(inputBytes, true)
    const codeChallenge = fromUint8Array(await digestSha256(codeVerifier), true)
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

    try {
        return await subtle().importKey(
            "jwk",
            jwk,
            ALGS[jwk.alg],
            jwk.ext === true,
            jwk.key_ops// || ['sign']
        )
    } catch (e) {
        throw new Error(`The ${jwk.alg} is not supported by this browser: ${e}`)
    }
}

export async function signCompactJws(alg: keyof typeof ALGS, privateKey: CryptoKey, header: any, payload: any): Promise<string> {

    const jwtHeader  = JSON.stringify({ ...header, alg });
    const jwtPayload = JSON.stringify(payload);
    const jwtAuthenticatedContent = `${encodeURL(jwtHeader)}.${encodeURL(jwtPayload)}`;

    const signature = await subtle().sign(
        { ...privateKey.algorithm, hash: 'SHA-384' },
        privateKey,
        new TextEncoder().encode(jwtAuthenticatedContent)
    );

    return `${jwtAuthenticatedContent}.${fromUint8Array(new Uint8Array(signature), true)}`
}
