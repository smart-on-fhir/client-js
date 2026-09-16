import { KeyLike, JWK } from "jose";
import { randomBytes } from "crypto";
export interface PkcePair {
    codeChallenge: string;
    codeVerifier: string;
}
export type SupportedAlg = 'ES384' | 'RS384';
export { randomBytes };
export declare function digestSha256(payload: string): Promise<Buffer<ArrayBufferLike>>;
export declare function generatePKCEChallenge(entropy?: number): Promise<PkcePair>;
export declare function importJWK(jwk: JWK): Promise<CryptoKey>;
export declare function signCompactJws(alg: SupportedAlg, privateKey: KeyLike, header: any, payload: any): Promise<string>;
