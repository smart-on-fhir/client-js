import { fhirclient } from "../types";
export interface PkcePair {
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
export declare function base64urlencode(input: string | Uint8Array): string;
export declare function base64urldecode(input: string): string;
export declare function uint8ArrayToBinaryString(input: Uint8Array): string;
/**
 * Resolves a reference to target window. It may also open new window or tab if
 * the `target = "popup"` or `target = "_blank"`.
 * @param target
 * @param width Only used when `target = "popup"`
 * @param height Only used when `target = "popup"`
 */
export declare function getTargetWindow(target: fhirclient.WindowTarget, width?: number, height?: number): Promise<Window>;
/**
 * Checks if called within a frame. Only works in browsers!
 * If the current window has a `parent` or `top` properties that refer to
 * another window, returns true. If trying to access `top` or `parent` throws an
 * error, returns true. Otherwise returns `false`.
 */
export declare function isInFrame(): boolean;
/**
 * Checks if called within another window (popup or tab). Only works in browsers!
 * To consider itself called in a new window, this function verifies that:
 * 1. `self === top` (not in frame)
 * 2. `!!opener && opener !== self` The window has an opener
 * 3. `!!window.name` The window has a `name` set
 */
export declare function isInPopUp(): boolean;
export declare function relative(path: string): string;
export declare function redirect(to: string): void;
/**
 * Another window can send a "completeAuth" message to this one, making it to
 * navigate to e.data.url
 * @param e The message event
 */
export declare function onMessage(e: MessageEvent): void;
export {};
