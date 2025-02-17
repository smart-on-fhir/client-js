"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.signCompactJws = exports.importJWK = exports.generatePKCEChallenge = exports.digestSha256 = exports.randomBytes = void 0;
const js_base64_1 = require("js-base64");
const crypto = typeof globalThis === "object" && globalThis.crypto ? globalThis.crypto : require("isomorphic-webcrypto").default;
const subtle = () => {
  if (!crypto.subtle) {
    if (!globalThis.isSecureContext) {
      throw new Error("Some of the required subtle crypto functionality is not " + "available unless you run this app in secure context (using " + "HTTPS or running locally). See " + "https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts");
    }
    throw new Error("Some of the required subtle crypto functionality is not " + "available in the current environment (no crypto.subtle)");
  }
  return crypto.subtle;
};
const ALGS = {
  ES384: {
    name: "ECDSA",
    namedCurve: "P-384"
  },
  RS384: {
    name: "RSASSA-PKCS1-v1_5",
    modulusLength: 4096,
    publicExponent: new Uint8Array([1, 0, 1]),
    hash: {
      name: 'SHA-384'
    }
  }
};
function randomBytes(count) {
  return crypto.getRandomValues(new Uint8Array(count));
}
exports.randomBytes = randomBytes;
async function digestSha256(payload) {
  const prepared = new TextEncoder().encode(payload);
  const hash = await subtle().digest('SHA-256', prepared);
  return new Uint8Array(hash);
}
exports.digestSha256 = digestSha256;
const generatePKCEChallenge = async (entropy = 96) => {
  const inputBytes = randomBytes(entropy);
  const codeVerifier = (0, js_base64_1.fromUint8Array)(inputBytes, true);
  const codeChallenge = (0, js_base64_1.fromUint8Array)(await digestSha256(codeVerifier), true);
  return {
    codeChallenge,
    codeVerifier
  };
};
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
  try {
    return await subtle().importKey("jwk", jwk, ALGS[jwk.alg], jwk.ext === true, jwk.key_ops // || ['sign']
    );
  } catch (e) {
    throw new Error(`The ${jwk.alg} is not supported by this browser: ${e}`);
  }
}
exports.importJWK = importJWK;
async function signCompactJws(alg, privateKey, header, payload) {
  const jwtHeader = JSON.stringify(Object.assign(Object.assign({}, header), {
    alg
  }));
  const jwtPayload = JSON.stringify(payload);
  const jwtAuthenticatedContent = `${(0, js_base64_1.encodeURL)(jwtHeader)}.${(0, js_base64_1.encodeURL)(jwtPayload)}`;
  const signature = await subtle().sign(Object.assign(Object.assign({}, privateKey.algorithm), {
    hash: 'SHA-384'
  }), privateKey, new TextEncoder().encode(jwtAuthenticatedContent));
  return `${jwtAuthenticatedContent}.${(0, js_base64_1.fromUint8Array)(new Uint8Array(signature), true)}`;
}
exports.signCompactJws = signCompactJws;