// This is defined in it's own file so that tests can mock it!

const debugEnabled = globalThis.localStorage ?
    globalThis.localStorage?.debugFhirClient :
    (globalThis?.process?.env?.NODE_DEBUG || "").match(/\bdebugFhirClient\b/)

export const debug = debugEnabled ?
    (...args: any[]) => console.debug("FHIR:", ...args) :
    () => {}
