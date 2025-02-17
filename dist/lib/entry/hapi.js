"use strict";

const HapiAdapter_1 = require("../adapters/HapiAdapter");
const cjs_ponyfill_1 = require("abortcontroller-polyfill/dist/cjs-ponyfill");
function smart(request, h, storage) {
  return new HapiAdapter_1.default({
    request,
    responseToolkit: h,
    storage
  }).getSmartApi();
}
smart.AbortController = cjs_ponyfill_1.AbortController;
module.exports = smart;