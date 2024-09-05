import { fhirclient } from "../types";
export declare const subtle: () => SubtleCrypto;
interface PkcePair {
    codeChallenge: string;
    codeVerifier: string;
}
declare const ALGS: {
    ES384: EcKeyGenParams;
    RS384: RsaHashedKeyGenParams;
};
export declare function randomBytes(count: number): Uint8Array;
export declare function digestSha256(payload: string): Promise<Uint8Array>;
export declare const generatePKCEChallenge: (entropy?: number) => Promise<PkcePair>;
export declare function importJWK(jwk: fhirclient.JWK): Promise<CryptoKey>;
export declare function signCompactJws(alg: keyof typeof ALGS, privateKey: CryptoKey, header: any, payload: any): Promise<string>;
export {};
