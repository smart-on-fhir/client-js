"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.randomBytes = void 0;
exports.digestSha256 = digestSha256;
exports.generatePKCEChallenge = generatePKCEChallenge;
exports.importJWK = importJWK;
exports.signCompactJws = signCompactJws;
const jose_1 = require("jose");
const crypto_1 = require("crypto");
Object.defineProperty(exports, "randomBytes", { enumerable: true, get: function () { return crypto_1.randomBytes; } });
async function digestSha256(payload) {
    const hash = (0, crypto_1.createHash)('sha256');
    hash.update(payload);
    return hash.digest();
}
async function generatePKCEChallenge(entropy = 96) {
    const inputBytes = (0, crypto_1.randomBytes)(entropy);
    const codeVerifier = jose_1.base64url.encode(inputBytes);
    const codeChallenge = jose_1.base64url.encode(await digestSha256(codeVerifier));
    return { codeChallenge, codeVerifier };
}
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
async function signCompactJws(alg, privateKey, header, payload) {
    return new jose_1.SignJWT(payload).setProtectedHeader(Object.assign(Object.assign({}, header), { alg })).sign(privateKey);
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
