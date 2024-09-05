"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onMessage = exports.redirect = exports.relative = exports.isInPopUp = exports.isInFrame = exports.getTargetWindow = exports.uint8ArrayToBinaryString = exports.base64urldecode = exports.base64urlencode = exports.signCompactJws = exports.importJWK = exports.generatePKCEChallenge = exports.digestSha256 = exports.randomBytes = void 0;
const isomorphic_1 = require("./isomorphic");
const subtle = () => {
    if (!(crypto === null || crypto === void 0 ? void 0 : crypto.subtle)) {
        if (!globalThis.isSecureContext) {
            throw new Error("Some of the required subtle crypto functionality is not available " +
                "unless you run this app in secure context (using HTTPS or running locally). " +
                "See https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts");
        }
        throw new Error("Some of the required subtle crypto functionality is not " +
            "available in the current environment (no crypto.subtle)");
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
    const codeVerifier = base64urlencode(inputBytes);
    const codeChallenge = base64urlencode(await digestSha256(codeVerifier));
    return { codeChallenge, codeVerifier };
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
    }
    catch (e) {
        throw new Error(`The ${jwk.alg} is not supported by this browser: ${e}`);
    }
}
exports.importJWK = importJWK;
async function signCompactJws(alg, privateKey, header, payload) {
    const jwtHeader = JSON.stringify({ ...header, alg });
    const jwtPayload = JSON.stringify(payload);
    const jwtAuthenticatedContent = `${base64urlencode(jwtHeader)}.${base64urlencode(jwtPayload)}`;
    const signature = await subtle().sign({ ...privateKey.algorithm, hash: 'SHA-384' }, privateKey, new TextEncoder().encode(jwtAuthenticatedContent));
    return `${jwtAuthenticatedContent}.${base64urlencode(new Uint8Array(signature))}`;
}
exports.signCompactJws = signCompactJws;
function base64urlencode(input) {
    // Step 1: Convert Uint8Array to binary string if needed
    if (input instanceof Uint8Array) {
        input = uint8ArrayToBinaryString(input);
    }
    // Step 2: Encode the binary string to Base64
    let base64 = btoa(input);
    // Step 3: Replace Base64 characters with Base64URL characters and remove padding
    let base64Url = base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    return base64Url;
}
exports.base64urlencode = base64urlencode;
function base64urldecode(input) {
    // Step 1: Replace Base64URL characters with standard Base64 characters
    let base64 = input.replace(/-/g, "+").replace(/_/g, "/");
    // Step 2: Add padding if necessary
    const pad = base64.length % 4;
    if (pad) {
        base64 += "=".repeat(4 - pad);
    }
    // Step 3: Decode the Base64 string
    try {
        return atob(base64);
    }
    catch (e) {
        throw new Error("Invalid Base64URL string");
    }
}
exports.base64urldecode = base64urldecode;
function uint8ArrayToBinaryString(input) {
    let bin = "";
    for (let i = 0; i < input.length; i++) {
        bin += String.fromCharCode(input[i]);
    }
    return bin;
}
exports.uint8ArrayToBinaryString = uint8ArrayToBinaryString;
/**
 * Resolves a reference to target window. It may also open new window or tab if
 * the `target = "popup"` or `target = "_blank"`.
 * @param target
 * @param width Only used when `target = "popup"`
 * @param height Only used when `target = "popup"`
 */
async function getTargetWindow(target, width = 800, height = 720) {
    // The target can be a function that returns the target. This can be
    // used to open a layer pop-up with an iframe and then return a reference
    // to that iframe (or its name)
    if (typeof target == "function") {
        target = await target();
    }
    // The target can be a window reference
    if (target && typeof target == "object") {
        return target;
    }
    // At this point target must be a string
    if (typeof target != "string") {
        (0, isomorphic_1.debug)("Invalid target type '%s'. Failing back to '_self'.", typeof target);
        return self;
    }
    // Current window
    if (target == "_self") {
        return self;
    }
    // The parent frame
    if (target == "_parent") {
        return parent;
    }
    // The top window
    if (target == "_top") {
        return top || self;
    }
    // New tab or window
    if (target == "_blank") {
        let error, targetWindow = null;
        try {
            targetWindow = window.open("", "SMARTAuthPopup");
            if (!targetWindow) {
                throw new Error("Perhaps window.open was blocked");
            }
        }
        catch (e) {
            error = e;
        }
        if (!targetWindow) {
            (0, isomorphic_1.debug)("Cannot open window. Failing back to '_self'. %s", error);
            return self;
        }
        else {
            return targetWindow;
        }
    }
    // Popup window
    if (target == "popup") {
        let error, targetWindow = null;
        // if (!targetWindow || targetWindow.closed) {
        try {
            targetWindow = window.open("", "SMARTAuthPopup", [
                "height=" + height,
                "width=" + width,
                "menubar=0",
                "resizable=1",
                "status=0",
                "top=" + (screen.height - height) / 2,
                "left=" + (screen.width - width) / 2
            ].join(","));
            if (!targetWindow) {
                throw new Error("Perhaps the popup window was blocked");
            }
        }
        catch (e) {
            error = e;
        }
        if (!targetWindow) {
            (0, isomorphic_1.debug)("Cannot open window. Failing back to '_self'. %s", error);
            return self;
        }
        else {
            return targetWindow;
        }
    }
    // Frame or window by name
    const winOrFrame = frames[target];
    if (winOrFrame) {
        return winOrFrame;
    }
    (0, isomorphic_1.debug)("Unknown target '%s'. Failing back to '_self'.", target);
    return self;
}
exports.getTargetWindow = getTargetWindow;
/**
 * Checks if called within a frame. Only works in browsers!
 * If the current window has a `parent` or `top` properties that refer to
 * another window, returns true. If trying to access `top` or `parent` throws an
 * error, returns true. Otherwise returns `false`.
 */
function isInFrame() {
    try {
        return self !== top && parent !== self;
    }
    catch (e) {
        return true;
    }
}
exports.isInFrame = isInFrame;
/**
 * Checks if called within another window (popup or tab). Only works in browsers!
 * To consider itself called in a new window, this function verifies that:
 * 1. `self === top` (not in frame)
 * 2. `!!opener && opener !== self` The window has an opener
 * 3. `!!window.name` The window has a `name` set
 */
function isInPopUp() {
    try {
        return self === top &&
            !!opener &&
            opener !== self &&
            !!window.name;
    }
    catch (e) {
        return false;
    }
}
exports.isInPopUp = isInPopUp;
function relative(path) {
    return new URL(path, window.location.href).href;
}
exports.relative = relative;
function redirect(to) {
    window.location.href = to;
}
exports.redirect = redirect;
/**
 * Another window can send a "completeAuth" message to this one, making it to
 * navigate to e.data.url
 * @param e The message event
 */
function onMessage(e) {
    if (e.data.type == "completeAuth" && e.origin === new URL(self.location.href).origin) {
        window.removeEventListener("message", onMessage);
        window.location.href = e.data.url;
    }
}
exports.onMessage = onMessage;
