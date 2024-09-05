"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.debug = void 0;
exports.debug = typeof window === "undefined" ?
    (process.env.NODE_DEBUG || "").match(/\bdebugFhirClient\b/) ?
        require("util").debug("FhirClient") :
        () => { } :
    (localStorage === null || localStorage === void 0 ? void 0 : localStorage.debugFhirClient) ?
        (...args) => {
            const newArgs = ["%cFHIR: %c" + args.shift()];
            newArgs.push("color:#d900a5; font-weight: bold;", "", ...args);
            console.debug(...newArgs);
        } :
        () => { };
