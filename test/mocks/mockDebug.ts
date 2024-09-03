// require it to create a cache entry which we are going to replace later
require("../../src/debug");

export default function debug(...args: any[]) {
    // @ts-ignore
    debug._calls.push(args);
}

debug._calls = [] as any[];

require.cache[require.resolve("../../src/debug")]!.exports.debug = debug;

