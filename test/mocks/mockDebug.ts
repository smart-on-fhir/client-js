require("../../src/lib");

export default function debug(...args: any[]) {
    debug._calls.push(args);
}

// @ts-ignore
debug._calls = []

require.cache[require.resolve("../../src/lib")]!.exports.debug = debug;

