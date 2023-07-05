"use strict";

const NodeAdapter_1 = require("../adapters/NodeAdapter");
const cjs_ponyfill_1 = require("abortcontroller-polyfill/dist/cjs-ponyfill");
function smart(request, response, storage) {
  return new NodeAdapter_1.default({
    request,
    response,
    storage
  }).getSmartApi();
}
smart.AbortController = cjs_ponyfill_1.AbortController;
module.exports = smart;