"use strict";

var __asyncValues = void 0 && (void 0).__asyncValues || function (o) {
  if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
  var m = o[Symbol.asyncIterator],
    i;
  return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () {
    return this;
  }, i);
  function verb(n) {
    i[n] = o[n] && function (v) {
      return new Promise(function (resolve, reject) {
        v = o[n](v), settle(resolve, reject, v.done, v.value);
      });
    };
  }
  function settle(resolve, reject, d, v) {
    Promise.resolve(v).then(function (v) {
      resolve({
        value: v,
        done: d
      });
    }, reject);
  }
};
var __await = void 0 && (void 0).__await || function (v) {
  return this instanceof __await ? (this.v = v, this) : new __await(v);
};
var __asyncGenerator = void 0 && (void 0).__asyncGenerator || function (thisArg, _arguments, generator) {
  if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
  var g = generator.apply(thisArg, _arguments || []),
    i,
    q = [];
  return i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () {
    return this;
  }, i;
  function verb(n) {
    if (g[n]) i[n] = function (v) {
      return new Promise(function (a, b) {
        q.push([n, v, a, b]) > 1 || resume(n, v);
      });
    };
  }
  function resume(n, v) {
    try {
      step(g[n](v));
    } catch (e) {
      settle(q[0][3], e);
    }
  }
  function step(r) {
    r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r);
  }
  function fulfill(value) {
    resume("next", value);
  }
  function reject(value) {
    resume("throw", value);
  }
  function settle(f, v) {
    if (f(v), q.shift(), q.length) resume(q[0][0], q[0][1]);
  }
};
var __rest = void 0 && (void 0).__rest || function (s, e) {
  var t = {};
  for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0) t[p] = s[p];
  if (s != null && typeof Object.getOwnPropertySymbols === "function") for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
    if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i])) t[p[i]] = s[p[i]];
  }
  return t;
};
Object.defineProperty(exports, "__esModule", {
  value: true
});
const settings_1 = require("./settings");
const lib_1 = require("./lib");
const debug = lib_1.debug.extend("FhirClient");
/**
 * This is a basic FHIR client for making basic FHIR API calls
 */
class FhirClient {
  /**
   * Validates the parameters, creates an instance and tries to connect it to
   * FhirJS, if one is available globally.
   */
  constructor(fhirBaseUrl) {
    (0, lib_1.assert)(fhirBaseUrl && typeof fhirBaseUrl === "string" && fhirBaseUrl.match(/https?:\/\/.+/), "A \"fhirBaseUrl\" string parameter is required and must begin with \"http(s)\"");
    this.fhirBaseUrl = fhirBaseUrl;
  }
  /**
   * Creates a new resource in a server-assigned location
   * @see http://hl7.org/fhir/http.html#create
   * @param resource A FHIR resource to be created
   * @param [requestOptions] Any options to be passed to the fetch call.
   * Note that `method` and `body` will be ignored.
   * @category Request
   */
  async create(resource, requestOptions) {
    return this.fhirRequest(resource.resourceType, Object.assign(Object.assign({}, requestOptions), {
      method: "POST",
      body: JSON.stringify(resource),
      headers: Object.assign({
        "content-type": "application/json"
      }, (requestOptions || {}).headers)
    }));
  }
  /**
   * Creates a new current version for an existing resource or creates an
   * initial version if no resource already exists for the given id.
   * @see http://hl7.org/fhir/http.html#update
   * @param resource A FHIR resource to be updated
   * @param requestOptions Any options to be passed to the fetch call.
   * Note that `method` and `body` will be ignored.
   * @category Request
   */
  async update(resource, requestOptions) {
    return this.fhirRequest(`${resource.resourceType}/${resource.id}`, Object.assign(Object.assign({}, requestOptions), {
      method: "PUT",
      body: JSON.stringify(resource),
      headers: Object.assign({
        "content-type": "application/json"
      }, (requestOptions || {}).headers)
    }));
  }
  /**
   * Removes an existing resource.
   * @see http://hl7.org/fhir/http.html#delete
   * @param url Relative URI of the FHIR resource to be deleted
   * (format: `resourceType/id`)
   * @param requestOptions Any options (except `method` which will be fixed
   * to `DELETE`) to be passed to the fetch call.
   * @category Request
   */
  async delete(url, requestOptions = {}) {
    return this.fhirRequest(url, Object.assign(Object.assign({}, requestOptions), {
      method: "DELETE"
    }));
  }
  /**
   * Makes a JSON Patch to the given resource
   * @see http://hl7.org/fhir/http.html#patch
   * @param url Relative URI of the FHIR resource to be patched
   * (format: `resourceType/id`)
   * @param patch A JSON Patch array to send to the server, For details
   * see https://datatracker.ietf.org/doc/html/rfc6902
   * @param requestOptions Any options to be passed to the fetch call,
   * except for `method`, `url` and `body` which cannot be overridden.
   * @since 2.4.0
   * @category Request
   * @typeParam ResolveType This method would typically resolve with the
   * patched resource or reject with an OperationOutcome. However, this may
   * depend on the server implementation or even on the request headers.
   * For that reason, if the default resolve type (which is
   * [[fhirclient.FHIR.Resource]]) does not work for you, you can pass
   * in your own resolve type parameter.
   */
  async patch(url, patch, requestOptions = {}) {
    (0, lib_1.assertJsonPatch)(patch);
    return this.fhirRequest(url, Object.assign(Object.assign({}, requestOptions), {
      method: "PATCH",
      body: JSON.stringify(patch),
      headers: Object.assign({
        "prefer": "return=presentation",
        "content-type": "application/json-patch+json; charset=UTF-8"
      }, requestOptions.headers)
    }));
  }
  async resolveRef(obj, path, graph, cache, requestOptions = {}) {
    const node = (0, lib_1.getPath)(obj, path);
    if (node) {
      const isArray = Array.isArray(node);
      return Promise.all((0, lib_1.makeArray)(node).filter(Boolean).map((item, i) => {
        const ref = item.reference;
        if (ref) {
          return this.fhirRequest(ref, Object.assign(Object.assign({}, requestOptions), {
            includeResponse: false,
            cacheMap: cache
          })).then(sub => {
            if (graph) {
              if (isArray) {
                if (path.indexOf("..") > -1) {
                  (0, lib_1.setPath)(obj, `${path.replace("..", `.${i}.`)}`, sub);
                } else {
                  (0, lib_1.setPath)(obj, `${path}.${i}`, sub);
                }
              } else {
                (0, lib_1.setPath)(obj, path, sub);
              }
            }
          }).catch(ex => {
            if ((ex === null || ex === void 0 ? void 0 : ex.status) === 404) {
              console.warn(`Missing reference ${ref}. ${ex}`);
            } else {
              throw ex;
            }
          });
        }
      }));
    }
  }
  /**
   * Fetches all references in the given resource, ignoring duplicates, and
   * then modifies the resource by "mounting" the resolved references in place
   */
  async resolveReferences(resource, references, requestOptions = {}) {
    await this.fetchReferences(resource, references, true, {}, requestOptions);
  }
  async fetchReferences(resource, references, graph, cache = {}, requestOptions = {}) {
    if (resource.resourceType == "Bundle") {
      for (const item of resource.entry || []) {
        if (item.resource) {
          await this.fetchReferences(item.resource, references, graph, cache, requestOptions);
        }
      }
      return cache;
    }
    // 1. Sanitize paths, remove any invalid ones
    let paths = references.map(path => String(path).trim()).filter(Boolean);
    // 2. Remove duplicates
    paths = paths.reduce((prev, cur) => {
      if (prev.includes(cur)) {
        debug("Duplicated reference path \"%s\"", cur);
      } else {
        prev.push(cur);
      }
      return prev;
    }, []);
    // 3. Early exit if no valid paths are found
    if (!paths.length) {
      return Promise.resolve(cache);
    }
    // 4. Group the paths by depth so that child refs are looked up
    // after their parents!
    const groups = {};
    paths.forEach(path => {
      const len = path.split(".").length;
      if (!groups[len]) {
        groups[len] = [];
      }
      groups[len].push(path);
    });
    // 5. Execute groups sequentially! Paths within same group are
    // fetched in parallel!
    let task = Promise.resolve();
    Object.keys(groups).sort().forEach(len => {
      const group = groups[len];
      task = task.then(() => Promise.all(group.map(path => {
        return this.resolveRef(resource, path, graph, cache, requestOptions);
      })));
    });
    await task;
    return cache;
  }
  /**
   * Fetches all references in the given resource, ignoring duplicates
   */
  async getReferences(resource, references, requestOptions = {}) {
    const refs = await this.fetchReferences(resource, references, false, {}, requestOptions);
    const out = {};
    for (const key in refs) {
      out[key] = await refs[key];
    }
    return out;
  }
  /**
   * Given a FHIR Bundle or a URL pointing to a bundle, iterates over all
   * entry resources. Note that this will also automatically crawl through
   * further pages (if any)
   */
  resources(bundleOrUrl, options) {
    return __asyncGenerator(this, arguments, function* resources_1() {
      var e_1, _a;
      let count = 0;
      try {
        for (var _b = __asyncValues(this.pages(bundleOrUrl, options)), _c; _c = yield __await(_b.next()), !_c.done;) {
          const page = _c.value;
          for (const entry of page.entry || []) {
            if ((options === null || options === void 0 ? void 0 : options.limit) && ++count > options.limit) {
              return yield __await(void 0);
            }
            yield yield __await(entry.resource);
          }
        }
      } catch (e_1_1) {
        e_1 = {
          error: e_1_1
        };
      } finally {
        try {
          if (_c && !_c.done && (_a = _b.return)) yield __await(_a.call(_b));
        } finally {
          if (e_1) throw e_1.error;
        }
      }
    });
  }
  /**
   * Given a FHIR Bundle or a URL pointing to a bundle, iterates over all
   * pages. Note that this will automatically crawl through
   * further pages (if any) but it will not detect previous pages. It is
   * designed to be called on the first page and fetch any followup pages.
   */
  pages(bundleOrUrl, requestOptions) {
    var _a, _b;
    return __asyncGenerator(this, arguments, function* pages_1() {
      const _c = requestOptions || {},
        {
          limit
        } = _c,
        options = __rest(_c, ["limit"]);
      const fetchPage = url => this.fhirRequest(url, options);
      let page = typeof bundleOrUrl === "string" || bundleOrUrl instanceof URL ? yield __await(fetchPage(bundleOrUrl)) : bundleOrUrl;
      let count = 0;
      while (page && page.resourceType === "Bundle" && (!limit || ++count <= limit)) {
        // Yield the current page
        yield yield __await(page);
        // If caller aborted, stop crawling
        if ((_a = options === null || options === void 0 ? void 0 : options.signal) === null || _a === void 0 ? void 0 : _a.aborted) {
          break;
        }
        // Find the "next" link
        const nextLink = ((_b = page.link) !== null && _b !== void 0 ? _b : []).find(l => l.relation === 'next' && typeof l.url === 'string');
        if (!nextLink) {
          break; // no more pages
        }
        // Fetch the next page
        page = yield __await(fetchPage(nextLink.url));
      }
    });
  }
  /**
   * The method responsible for making all http requests
   */
  async fhirRequest(uri, options = {}) {
    (0, lib_1.assert)(options, "fhirRequest requires a uri as first argument");
    const path = uri + "";
    const url = (0, lib_1.absolute)(path, this.fhirBaseUrl);
    const {
      cacheMap
    } = options;
    if (cacheMap) {
      if (!(path in cacheMap)) {
        cacheMap[path] = (0, lib_1.request)(url, options).then(res => {
          cacheMap[path] = res;
          return res;
        }).catch(error => {
          delete cacheMap[path];
          throw error;
        });
      }
      return cacheMap[path];
    }
    return (0, lib_1.request)(url, options);
  }
  /**
   * Returns a promise that will be resolved with the fhir version as defined
   * in the CapabilityStatement.
   */
  async getFhirVersion() {
    return (0, lib_1.fetchConformanceStatement)(this.fhirBaseUrl).then(metadata => metadata.fhirVersion);
  }
  /**
   * Returns a promise that will be resolved with the numeric fhir version
   * - 2 for DSTU2
   * - 3 for STU3
   * - 4 for R4
   * - 0 if the version is not known
   */
  async getFhirRelease() {
    return this.getFhirVersion().then(v => {
      var _a;
      return (_a = settings_1.fhirVersions[v]) !== null && _a !== void 0 ? _a : 0;
    });
  }
}
exports.default = FhirClient;