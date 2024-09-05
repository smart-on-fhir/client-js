"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.base64urldecode = exports.base64urlencode = exports.signCompactJws = exports.importJWK = exports.generatePKCEChallenge = exports.digestSha256 = exports.randomBytes = void 0;
const crypto_1 = require("crypto");
Object.defineProperty(exports, "randomBytes", { enumerable: true, get: function () { return crypto_1.randomBytes; } });
const jose_1 = require("jose");
async function digestSha256(payload) {
    const hash = (0, crypto_1.createHash)('sha256');
    hash.update(payload);
    return hash.digest();
}
exports.digestSha256 = digestSha256;
async function generatePKCEChallenge(entropy = 96) {
    const inputBytes = (0, crypto_1.randomBytes)(entropy);
    const codeVerifier = jose_1.base64url.encode(inputBytes);
    const codeChallenge = jose_1.base64url.encode(await digestSha256(codeVerifier));
    return { codeChallenge, codeVerifier };
}
exports.generatePKCEChallenge = generatePKCEChallenge;
async function importJWK(jwk) {
    // alg is optional in JWK but we need it here!
    if (!jwk.alg) {
        throw new Error('The "alg" property of the JWK must be set to "ES384" or "RS384"');
    }
    // Use of the "key_ops" member is OPTIONAL, unless the application requires its presence.
    // https://www.rfc-editor.org/rfc/rfc7517.html#section-4.3
    // 
    // In our case the app will only import private keys so we can assume "sign"
    if (!Array.isArray(jwk.key_ops)) {
        jwk.key_ops = ["sign"];
    }
    // In this case the JWK has a "key_ops" array and "sign" is not listed
    if (!jwk.key_ops.includes("sign")) {
        throw new Error('The "key_ops" property of the JWK does not contain "sign"');
    }
    return (0, jose_1.importJWK)(jwk);
}
exports.importJWK = importJWK;
async function signCompactJws(alg, privateKey, header, payload) {
    return new jose_1.SignJWT(payload).setProtectedHeader({ ...header, alg }).sign(privateKey);
}
exports.signCompactJws = signCompactJws;
function base64urlencode(input) {
    return jose_1.base64url.encode(input);
}
exports.base64urlencode = base64urlencode;
function base64urldecode(input) {
    return jose_1.base64url.decode(input).toString();
}
exports.base64urldecode = base64urldecode;
