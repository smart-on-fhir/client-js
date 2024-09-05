export const debug = typeof window === "undefined" ?
    (process.env.NODE_DEBUG || "").match(/\bdebugFhirClient\b/) ?
        require("util").debug("FhirClient"):
        () => {} :
    localStorage?.debugFhirClient ?
        (...args: any[]) => {
            const newArgs = ["%cFHIR: %c" + args.shift()]
            newArgs.push("color:#d900a5; font-weight: bold;", "", ...args)
            console.debug(...newArgs)
        } :
        () => {};