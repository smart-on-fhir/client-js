// @ts-nocheck
(() => {
"use strict";
var FHIR = (() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // node_modules/debug/node_modules/ms/index.js
  var require_ms = __commonJS({
    "node_modules/debug/node_modules/ms/index.js"(exports, module) {
      var s = 1e3;
      var m = s * 60;
      var h = m * 60;
      var d = h * 24;
      var w = d * 7;
      var y = d * 365.25;
      module.exports = function(val, options2) {
        options2 = options2 || {};
        var type = typeof val;
        if (type === "string" && val.length > 0) {
          return parse(val);
        } else if (type === "number" && isFinite(val)) {
          return options2.long ? fmtLong(val) : fmtShort(val);
        }
        throw new Error(
          "val is not a non-empty string or a valid number. val=" + JSON.stringify(val)
        );
      };
      function parse(str) {
        str = String(str);
        if (str.length > 100) {
          return;
        }
        var match = /^(-?(?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)?$/i.exec(
          str
        );
        if (!match) {
          return;
        }
        var n = parseFloat(match[1]);
        var type = (match[2] || "ms").toLowerCase();
        switch (type) {
          case "years":
          case "year":
          case "yrs":
          case "yr":
          case "y":
            return n * y;
          case "weeks":
          case "week":
          case "w":
            return n * w;
          case "days":
          case "day":
          case "d":
            return n * d;
          case "hours":
          case "hour":
          case "hrs":
          case "hr":
          case "h":
            return n * h;
          case "minutes":
          case "minute":
          case "mins":
          case "min":
          case "m":
            return n * m;
          case "seconds":
          case "second":
          case "secs":
          case "sec":
          case "s":
            return n * s;
          case "milliseconds":
          case "millisecond":
          case "msecs":
          case "msec":
          case "ms":
            return n;
          default:
            return void 0;
        }
      }
      function fmtShort(ms) {
        var msAbs = Math.abs(ms);
        if (msAbs >= d) {
          return Math.round(ms / d) + "d";
        }
        if (msAbs >= h) {
          return Math.round(ms / h) + "h";
        }
        if (msAbs >= m) {
          return Math.round(ms / m) + "m";
        }
        if (msAbs >= s) {
          return Math.round(ms / s) + "s";
        }
        return ms + "ms";
      }
      function fmtLong(ms) {
        var msAbs = Math.abs(ms);
        if (msAbs >= d) {
          return plural(ms, msAbs, d, "day");
        }
        if (msAbs >= h) {
          return plural(ms, msAbs, h, "hour");
        }
        if (msAbs >= m) {
          return plural(ms, msAbs, m, "minute");
        }
        if (msAbs >= s) {
          return plural(ms, msAbs, s, "second");
        }
        return ms + " ms";
      }
      function plural(ms, msAbs, n, name) {
        var isPlural = msAbs >= n * 1.5;
        return Math.round(ms / n) + " " + name + (isPlural ? "s" : "");
      }
    }
  });

  // node_modules/debug/src/common.js
  var require_common = __commonJS({
    "node_modules/debug/src/common.js"(exports, module) {
      function setup(env) {
        createDebug.debug = createDebug;
        createDebug.default = createDebug;
        createDebug.coerce = coerce;
        createDebug.disable = disable;
        createDebug.enable = enable;
        createDebug.enabled = enabled;
        createDebug.humanize = require_ms();
        createDebug.destroy = destroy;
        Object.keys(env).forEach((key) => {
          createDebug[key] = env[key];
        });
        createDebug.names = [];
        createDebug.skips = [];
        createDebug.formatters = {};
        function selectColor(namespace) {
          let hash = 0;
          for (let i = 0; i < namespace.length; i++) {
            hash = (hash << 5) - hash + namespace.charCodeAt(i);
            hash |= 0;
          }
          return createDebug.colors[Math.abs(hash) % createDebug.colors.length];
        }
        createDebug.selectColor = selectColor;
        function createDebug(namespace) {
          let prevTime;
          let enableOverride = null;
          let namespacesCache;
          let enabledCache;
          function debug5(...args) {
            if (!debug5.enabled) {
              return;
            }
            const self2 = debug5;
            const curr = Number(/* @__PURE__ */ new Date());
            const ms = curr - (prevTime || curr);
            self2.diff = ms;
            self2.prev = prevTime;
            self2.curr = curr;
            prevTime = curr;
            args[0] = createDebug.coerce(args[0]);
            if (typeof args[0] !== "string") {
              args.unshift("%O");
            }
            let index = 0;
            args[0] = args[0].replace(/%([a-zA-Z%])/g, (match, format) => {
              if (match === "%%") {
                return "%";
              }
              index++;
              const formatter = createDebug.formatters[format];
              if (typeof formatter === "function") {
                const val = args[index];
                match = formatter.call(self2, val);
                args.splice(index, 1);
                index--;
              }
              return match;
            });
            createDebug.formatArgs.call(self2, args);
            const logFn = self2.log || createDebug.log;
            logFn.apply(self2, args);
          }
          debug5.namespace = namespace;
          debug5.useColors = createDebug.useColors();
          debug5.color = createDebug.selectColor(namespace);
          debug5.extend = extend;
          debug5.destroy = createDebug.destroy;
          Object.defineProperty(debug5, "enabled", {
            enumerable: true,
            configurable: false,
            get: () => {
              if (enableOverride !== null) {
                return enableOverride;
              }
              if (namespacesCache !== createDebug.namespaces) {
                namespacesCache = createDebug.namespaces;
                enabledCache = createDebug.enabled(namespace);
              }
              return enabledCache;
            },
            set: (v) => {
              enableOverride = v;
            }
          });
          if (typeof createDebug.init === "function") {
            createDebug.init(debug5);
          }
          return debug5;
        }
        function extend(namespace, delimiter) {
          const newDebug = createDebug(this.namespace + (typeof delimiter === "undefined" ? ":" : delimiter) + namespace);
          newDebug.log = this.log;
          return newDebug;
        }
        function enable(namespaces) {
          createDebug.save(namespaces);
          createDebug.namespaces = namespaces;
          createDebug.names = [];
          createDebug.skips = [];
          const split = (typeof namespaces === "string" ? namespaces : "").trim().replace(/\s+/g, ",").split(",").filter(Boolean);
          for (const ns of split) {
            if (ns[0] === "-") {
              createDebug.skips.push(ns.slice(1));
            } else {
              createDebug.names.push(ns);
            }
          }
        }
        function matchesTemplate(search, template) {
          let searchIndex = 0;
          let templateIndex = 0;
          let starIndex = -1;
          let matchIndex = 0;
          while (searchIndex < search.length) {
            if (templateIndex < template.length && (template[templateIndex] === search[searchIndex] || template[templateIndex] === "*")) {
              if (template[templateIndex] === "*") {
                starIndex = templateIndex;
                matchIndex = searchIndex;
                templateIndex++;
              } else {
                searchIndex++;
                templateIndex++;
              }
            } else if (starIndex !== -1) {
              templateIndex = starIndex + 1;
              matchIndex++;
              searchIndex = matchIndex;
            } else {
              return false;
            }
          }
          while (templateIndex < template.length && template[templateIndex] === "*") {
            templateIndex++;
          }
          return templateIndex === template.length;
        }
        function disable() {
          const namespaces = [
            ...createDebug.names,
            ...createDebug.skips.map((namespace) => "-" + namespace)
          ].join(",");
          createDebug.enable("");
          return namespaces;
        }
        function enabled(name) {
          for (const skip of createDebug.skips) {
            if (matchesTemplate(name, skip)) {
              return false;
            }
          }
          for (const ns of createDebug.names) {
            if (matchesTemplate(name, ns)) {
              return true;
            }
          }
          return false;
        }
        function coerce(val) {
          if (val instanceof Error) {
            return val.stack || val.message;
          }
          return val;
        }
        function destroy() {
          console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.");
        }
        createDebug.enable(createDebug.load());
        return createDebug;
      }
      module.exports = setup;
    }
  });

  // node_modules/debug/src/browser.js
  var require_browser = __commonJS({
    "node_modules/debug/src/browser.js"(exports, module) {
      exports.formatArgs = formatArgs;
      exports.save = save;
      exports.load = load;
      exports.useColors = useColors;
      exports.storage = localstorage();
      exports.destroy = /* @__PURE__ */ (() => {
        let warned = false;
        return () => {
          if (!warned) {
            warned = true;
            console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.");
          }
        };
      })();
      exports.colors = [
        "#0000CC",
        "#0000FF",
        "#0033CC",
        "#0033FF",
        "#0066CC",
        "#0066FF",
        "#0099CC",
        "#0099FF",
        "#00CC00",
        "#00CC33",
        "#00CC66",
        "#00CC99",
        "#00CCCC",
        "#00CCFF",
        "#3300CC",
        "#3300FF",
        "#3333CC",
        "#3333FF",
        "#3366CC",
        "#3366FF",
        "#3399CC",
        "#3399FF",
        "#33CC00",
        "#33CC33",
        "#33CC66",
        "#33CC99",
        "#33CCCC",
        "#33CCFF",
        "#6600CC",
        "#6600FF",
        "#6633CC",
        "#6633FF",
        "#66CC00",
        "#66CC33",
        "#9900CC",
        "#9900FF",
        "#9933CC",
        "#9933FF",
        "#99CC00",
        "#99CC33",
        "#CC0000",
        "#CC0033",
        "#CC0066",
        "#CC0099",
        "#CC00CC",
        "#CC00FF",
        "#CC3300",
        "#CC3333",
        "#CC3366",
        "#CC3399",
        "#CC33CC",
        "#CC33FF",
        "#CC6600",
        "#CC6633",
        "#CC9900",
        "#CC9933",
        "#CCCC00",
        "#CCCC33",
        "#FF0000",
        "#FF0033",
        "#FF0066",
        "#FF0099",
        "#FF00CC",
        "#FF00FF",
        "#FF3300",
        "#FF3333",
        "#FF3366",
        "#FF3399",
        "#FF33CC",
        "#FF33FF",
        "#FF6600",
        "#FF6633",
        "#FF9900",
        "#FF9933",
        "#FFCC00",
        "#FFCC33"
      ];
      function useColors() {
        if (typeof window !== "undefined" && window.process && (window.process.type === "renderer" || window.process.__nwjs)) {
          return true;
        }
        if (typeof navigator !== "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/(edge|trident)\/(\d+)/)) {
          return false;
        }
        let m;
        return typeof document !== "undefined" && document.documentElement && document.documentElement.style && document.documentElement.style.WebkitAppearance || // Is firebug? http://stackoverflow.com/a/398120/376773
        typeof window !== "undefined" && window.console && (window.console.firebug || window.console.exception && window.console.table) || // Is firefox >= v31?
        // https://developer.mozilla.org/en-US/docs/Tools/Web_Console#Styling_messages
        typeof navigator !== "undefined" && navigator.userAgent && (m = navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/)) && parseInt(m[1], 10) >= 31 || // Double check webkit in userAgent just in case we are in a worker
        typeof navigator !== "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/applewebkit\/(\d+)/);
      }
      function formatArgs(args) {
        args[0] = (this.useColors ? "%c" : "") + this.namespace + (this.useColors ? " %c" : " ") + args[0] + (this.useColors ? "%c " : " ") + "+" + module.exports.humanize(this.diff);
        if (!this.useColors) {
          return;
        }
        const c = "color: " + this.color;
        args.splice(1, 0, c, "color: inherit");
        let index = 0;
        let lastC = 0;
        args[0].replace(/%[a-zA-Z%]/g, (match) => {
          if (match === "%%") {
            return;
          }
          index++;
          if (match === "%c") {
            lastC = index;
          }
        });
        args.splice(lastC, 0, c);
      }
      exports.log = console.debug || console.log || (() => {
      });
      function save(namespaces) {
        try {
          if (namespaces) {
            exports.storage.setItem("debug", namespaces);
          } else {
            exports.storage.removeItem("debug");
          }
        } catch (error) {
        }
      }
      function load() {
        let r;
        try {
          r = exports.storage.getItem("debug") || exports.storage.getItem("DEBUG");
        } catch (error) {
        }
        if (!r && typeof process !== "undefined" && "env" in process) {
          r = process.env.DEBUG;
        }
        return r;
      }
      function localstorage() {
        try {
          return localStorage;
        } catch (error) {
        }
      }
      module.exports = require_common()(exports);
      var { formatters } = module.exports;
      formatters.j = function(v) {
        try {
          return JSON.stringify(v);
        } catch (error) {
          return "[UnexpectedJSONParseError]: " + error.message;
        }
      };
    }
  });

  // src/entry/browser.ts
  var browser_exports2 = {};
  __export(browser_exports2, {
    FhirClient: () => FhirClient,
    authorize: () => authorize2,
    createSmartClient: () => client,
    default: () => browser_default,
    init: () => init2,
    ready: () => ready2,
    settings: () => options,
    utils: () => utils
  });

  // src/HttpError.ts
  var HttpError = class extends Error {
    /**
     * The HTTP status code for this error
     */
    statusCode;
    /**
     * The HTTP status code for this error.
     * Note that this is the same as `status`, i.e. the code is available
     * through any of these.
     */
    status;
    /**
     * The HTTP status text corresponding to this error
     */
    statusText;
    /**
     * Reference to the HTTP Response object
     */
    response;
    constructor(response) {
      super(`${response.status} ${response.statusText}
URL: ${response.url}`);
      this.name = "HttpError";
      this.response = response;
      this.statusCode = response.status;
      this.status = response.status;
      this.statusText = response.statusText;
    }
    async parse() {
      if (!this.response.bodyUsed) {
        try {
          const type = this.response.headers.get("content-type") || "text/plain";
          if (type.match(/\bjson\b/i)) {
            let body = await this.response.json();
            if (body.error) {
              this.message += "\n" + body.error;
              if (body.error_description) {
                this.message += ": " + body.error_description;
              }
            } else {
              this.message += "\n\n" + JSON.stringify(body, null, 4);
            }
          } else if (type.match(/^text\//i)) {
            let body = await this.response.text();
            if (body) {
              this.message += "\n\n" + body;
            }
          }
        } catch {
        }
      }
      return this;
    }
    toJSON() {
      return {
        name: this.name,
        statusCode: this.statusCode,
        status: this.status,
        statusText: this.statusText,
        message: this.message
      };
    }
  };

  // src/settings.ts
  var patientCompartment = [
    "Account",
    "AdverseEvent",
    "AllergyIntolerance",
    "Appointment",
    "AppointmentResponse",
    "AuditEvent",
    "Basic",
    "BodySite",
    "BodyStructure",
    "CarePlan",
    "CareTeam",
    "ChargeItem",
    "Claim",
    "ClaimResponse",
    "ClinicalImpression",
    "Communication",
    "CommunicationRequest",
    "Composition",
    "Condition",
    "Consent",
    "Coverage",
    "CoverageEligibilityRequest",
    "CoverageEligibilityResponse",
    "DetectedIssue",
    "DeviceRequest",
    "DeviceUseRequest",
    "DeviceUseStatement",
    "DiagnosticOrder",
    "DiagnosticReport",
    "DocumentManifest",
    "DocumentReference",
    "EligibilityRequest",
    "Encounter",
    "EnrollmentRequest",
    "EpisodeOfCare",
    "ExplanationOfBenefit",
    "FamilyMemberHistory",
    "Flag",
    "Goal",
    "Group",
    "ImagingManifest",
    "ImagingObjectSelection",
    "ImagingStudy",
    "Immunization",
    "ImmunizationEvaluation",
    "ImmunizationRecommendation",
    "Invoice",
    "List",
    "MeasureReport",
    "Media",
    "MedicationAdministration",
    "MedicationDispense",
    "MedicationOrder",
    "MedicationRequest",
    "MedicationStatement",
    "MolecularSequence",
    "NutritionOrder",
    "Observation",
    "Order",
    "Patient",
    "Person",
    "Procedure",
    "ProcedureRequest",
    "Provenance",
    "QuestionnaireResponse",
    "ReferralRequest",
    "RelatedPerson",
    "RequestGroup",
    "ResearchSubject",
    "RiskAssessment",
    "Schedule",
    "ServiceRequest",
    "Specimen",
    "SupplyDelivery",
    "SupplyRequest",
    "VisionPrescription"
  ];
  var fhirVersions = {
    "0.4.0": 2,
    "0.5.0": 2,
    "1.0.0": 2,
    "1.0.1": 2,
    "1.0.2": 2,
    "1.1.0": 3,
    "1.4.0": 3,
    "1.6.0": 3,
    "1.8.0": 3,
    "3.0.0": 3,
    "3.0.1": 3,
    "3.3.0": 4,
    "3.5.0": 4,
    "4.0.0": 4,
    "4.0.1": 4
  };
  var patientParams = [
    "patient",
    "subject",
    "requester",
    "member",
    "actor",
    "beneficiary"
  ];
  var SMART_KEY = "SMART_KEY";

  // src/lib.ts
  var import_debug = __toESM(require_browser());
  var _debug = (0, import_debug.default)("FHIR");
  var cache = {};
  var units = {
    cm({ code, value }) {
      ensureNumerical({ code, value });
      if (code == "cm") return value;
      if (code == "m") return value * 100;
      if (code == "in") return value * 2.54;
      if (code == "[in_us]") return value * 2.54;
      if (code == "[in_i]") return value * 2.54;
      if (code == "ft") return value * 30.48;
      if (code == "[ft_us]") return value * 30.48;
      throw new Error("Unrecognized length unit: " + code);
    },
    kg({ code, value }) {
      ensureNumerical({ code, value });
      if (code == "kg") return value;
      if (code == "g") return value / 1e3;
      if (code.match(/lb/)) return value / 2.20462;
      if (code.match(/oz/)) return value / 35.274;
      throw new Error("Unrecognized weight unit: " + code);
    },
    any(pq) {
      ensureNumerical(pq);
      return pq.value;
    }
  };
  function ensureNumerical({ value, code }) {
    if (typeof value !== "number") {
      throw new Error("Found a non-numerical unit: " + value + " " + code);
    }
  }
  async function checkResponse(resp) {
    if (!resp.ok) {
      const error = new HttpError(resp);
      await error.parse();
      throw error;
    }
    return resp;
  }
  function responseToJSON(resp) {
    return resp.text().then((text) => text.length ? JSON.parse(text) : "");
  }
  function loweCaseKeys(obj) {
    if (!obj) {
      return obj;
    }
    if (Array.isArray(obj)) {
      return obj.map((v) => v && typeof v === "object" ? loweCaseKeys(v) : v);
    }
    let out = {};
    Object.keys(obj).forEach((key) => {
      const lowerKey = key.toLowerCase();
      const v = obj[key];
      out[lowerKey] = v && typeof v == "object" ? loweCaseKeys(v) : v;
    });
    return out;
  }
  async function request(url, requestOptions = {}) {
    const { includeResponse, ...options2 } = requestOptions;
    return fetch(url, {
      mode: "cors",
      ...options2,
      headers: {
        accept: "application/json",
        ...loweCaseKeys(options2.headers)
      }
    }).then(checkResponse).then((res) => {
      const type = res.headers.get("content-type") + "";
      if (type.match(/\bjson\b/i)) {
        return responseToJSON(res).then((body) => ({ res, body }));
      }
      if (type.match(/^text\//i)) {
        return res.text().then((body) => ({ res, body }));
      }
      return { res };
    }).then(({ res, body }) => {
      if (!body && res.status == 201) {
        const location2 = res.headers.get("location");
        if (location2) {
          return request(location2, { ...options2, method: "GET", body: null, includeResponse });
        }
      }
      if (includeResponse) {
        return { body, response: res };
      }
      if (body === void 0) {
        return res;
      }
      return body;
    });
  }
  function getAndCache(url, requestOptions, force = false) {
    if (force || !cache[url]) {
      cache[url] = request(url, requestOptions);
      return cache[url];
    }
    return Promise.resolve(cache[url]);
  }
  function fetchConformanceStatement(baseUrl = "/", requestOptions) {
    const url = String(baseUrl).replace(/\/*$/, "/") + "metadata";
    return getAndCache(url, requestOptions).catch((ex) => {
      throw new Error(
        `Failed to fetch the conformance statement from "${url}". ${ex}`
      );
    });
  }
  function getPath(obj, path = "") {
    path = path.trim();
    if (!path) {
      return obj;
    }
    let segments = path.split(".");
    let result = obj;
    while (result && segments.length) {
      const key = segments.shift();
      if (!key && Array.isArray(result)) {
        return result.map((o) => getPath(o, segments.join(".")));
      } else {
        result = result[key];
      }
    }
    return result;
  }
  function setPath(obj, path, value, createEmpty = false) {
    path.trim().split(".").reduce(
      (out, key, idx, arr) => {
        if (out && idx === arr.length - 1) {
          out[key] = value;
        } else {
          if (out && out[key] === void 0 && createEmpty) {
            out[key] = arr[idx + 1].match(/^[0-9]+$/) ? [] : {};
          }
          return out ? out[key] : void 0;
        }
      },
      obj
    );
    return obj;
  }
  function makeArray(arg) {
    if (Array.isArray(arg)) {
      return arg;
    }
    return [arg];
  }
  function absolute(path, baseUrl) {
    if (path.match(/^http/)) return path;
    if (path.match(/^urn/)) return path;
    return String(baseUrl || "").replace(/\/+$/, "") + "/" + path.replace(/^\/+/, "");
  }
  function randomString(strLength = 8, charSet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789") {
    const result = [];
    const len = charSet.length;
    while (strLength--) {
      result.push(charSet.charAt(Math.floor(Math.random() * len)));
    }
    return result.join("");
  }
  function jwtDecode(token, env) {
    const payload = token.split(".")[1];
    return payload ? JSON.parse(env.atob(payload)) : null;
  }
  function getTimeInFuture(secondsAhead = 120, from) {
    return Math.floor(+(from || /* @__PURE__ */ new Date()) / 1e3 + secondsAhead);
  }
  function getAccessTokenExpiration(tokenResponse, env) {
    const now = Math.floor(Date.now() / 1e3);
    if (tokenResponse.expires_in) {
      return now + tokenResponse.expires_in;
    }
    if (tokenResponse.access_token) {
      let tokenBody = jwtDecode(tokenResponse.access_token, env);
      if (tokenBody && tokenBody.exp) {
        return tokenBody.exp;
      }
    }
    return now + 300;
  }
  function byCode(observations, property) {
    const ret = {};
    function handleCodeableConcept(concept, observation) {
      if (concept && Array.isArray(concept.coding)) {
        concept.coding.forEach(({ code }) => {
          if (code) {
            ret[code] = ret[code] || [];
            ret[code].push(observation);
          }
        });
      }
    }
    makeArray(observations).forEach((o) => {
      if (o.resourceType === "Observation" && o[property]) {
        if (Array.isArray(o[property])) {
          o[property].forEach((concept) => handleCodeableConcept(concept, o));
        } else {
          handleCodeableConcept(o[property], o);
        }
      }
    });
    return ret;
  }
  function byCodes(observations, property) {
    const bank = byCode(observations, property);
    return (...codes) => codes.filter((code) => code + "" in bank).reduce(
      (prev, code) => prev.concat(bank[code + ""]),
      []
    );
  }
  function getPatientParam(conformance, resourceType) {
    const resources = getPath(conformance, "rest.0.resource") || [];
    const meta = resources.find((r) => r.type === resourceType);
    if (!meta) {
      throw new Error(`Resource "${resourceType}" is not supported by this FHIR server`);
    }
    if (!Array.isArray(meta.searchParam)) {
      throw new Error(`No search parameters supported for "${resourceType}" on this FHIR server`);
    }
    if (resourceType == "Patient" && meta.searchParam.find((x) => x.name == "_id")) {
      return "_id";
    }
    const out = patientParams.find((p) => meta.searchParam.find((x) => x.name == p));
    if (!out) {
      throw new Error("I don't know what param to use for " + resourceType);
    }
    return out;
  }
  async function getTargetWindow(target, width = 800, height = 720) {
    if (typeof target == "function") {
      target = await target();
    }
    if (target && typeof target == "object") {
      return target;
    }
    if (typeof target != "string") {
      _debug("Invalid target type '%s'. Failing back to '_self'.", typeof target);
      return self;
    }
    if (target == "_self") {
      return self;
    }
    if (target == "_parent") {
      return parent;
    }
    if (target == "_top") {
      return top || self;
    }
    if (target == "_blank") {
      let error, targetWindow = null;
      try {
        targetWindow = window.open("", "SMARTAuthPopup");
        if (!targetWindow) {
          throw new Error("Perhaps window.open was blocked");
        }
      } catch (e) {
        error = e;
      }
      if (!targetWindow) {
        _debug("Cannot open window. Failing back to '_self'. %s", error);
        return self;
      } else {
        return targetWindow;
      }
    }
    if (target == "popup") {
      let error, targetWindow = null;
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
      } catch (e) {
        error = e;
      }
      if (!targetWindow) {
        _debug("Cannot open window. Failing back to '_self'. %s", error);
        return self;
      } else {
        return targetWindow;
      }
    }
    const winOrFrame = frames[target];
    if (winOrFrame) {
      return winOrFrame;
    }
    _debug("Unknown target '%s'. Failing back to '_self'.", target);
    return self;
  }
  function assert(condition, message) {
    if (!condition) {
      throw new Error(message);
    }
  }
  function assertJsonPatch(patch) {
    assert(Array.isArray(patch), "The JSON patch must be an array");
    assert(patch.length > 0, "The JSON patch array should not be empty");
    patch.forEach((operation) => {
      assert(
        ["add", "replace", "test", "move", "copy", "remove"].indexOf(operation.op) > -1,
        'Each patch operation must have an "op" property which must be one of: "add", "replace", "test", "move", "copy", "remove"'
      );
      assert(operation.path && typeof operation.path, `Invalid "${operation.op}" operation. Missing "path" property`);
      if (operation.op == "add" || operation.op == "replace" || operation.op == "test") {
        assert("value" in operation, `Invalid "${operation.op}" operation. Missing "value" property`);
        assert(Object.keys(operation).length == 3, `Invalid "${operation.op}" operation. Contains unknown properties`);
      } else if (operation.op == "move" || operation.op == "copy") {
        assert(typeof operation.from == "string", `Invalid "${operation.op}" operation. Requires a string "from" property`);
        assert(Object.keys(operation).length == 3, `Invalid "${operation.op}" operation. Contains unknown properties`);
      } else {
        assert(Object.keys(operation).length == 2, `Invalid "${operation.op}" operation. Contains unknown properties`);
      }
    });
  }

  // src/strings.ts
  var strings_default = {
    expired: "Session expired! Please re-launch the app",
    noScopeForId: "Trying to get the ID of the selected %s. Please add 'launch' or 'launch/%s' to the requested scopes and try again.",
    noIfNoAuth: "You are trying to get %s but the app is not authorized yet.",
    noFreeContext: "Please don't use open fhir servers if you need to access launch context items like the %S."
  };

  // src/FhirClient.ts
  var debug2 = _debug.extend("FhirClient");
  var FhirClient = class {
    /**
     * The state of the client instance is an object with various properties.
     * It contains some details about how the client has been authorized and
     * determines the behavior of the client instance. This state is persisted
     * in `SessionStorage` in browsers or in request session on the servers.
     */
    fhirBaseUrl;
    /**
     * Validates the parameters and creates an instance.
     */
    constructor(fhirBaseUrl) {
      assert(
        fhirBaseUrl && typeof fhirBaseUrl === "string" && fhirBaseUrl.match(/https?:\/\/.+/),
        'A "fhirBaseUrl" string parameter is required and must begin with "http(s)"'
      );
      this.fhirBaseUrl = fhirBaseUrl;
    }
    /**
     * Default request options to be used for every request. This method can be
     * overridden in subclasses to provide custom default options.
     */
    async getRequestDefaults() {
      return {};
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
      return this.fhirRequest(resource.resourceType, {
        ...requestOptions,
        method: "POST",
        body: JSON.stringify(resource),
        headers: {
          "content-type": "application/json",
          ...(requestOptions || {}).headers
        }
      });
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
      return this.fhirRequest(`${resource.resourceType}/${resource.id}`, {
        ...requestOptions,
        method: "PUT",
        body: JSON.stringify(resource),
        headers: {
          "content-type": "application/json",
          ...(requestOptions || {}).headers
        }
      });
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
      return this.fhirRequest(url, { ...requestOptions, method: "DELETE" });
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
      assertJsonPatch(patch);
      return this.fhirRequest(url, {
        ...requestOptions,
        method: "PATCH",
        body: JSON.stringify(patch),
        headers: {
          "prefer": "return=presentation",
          "content-type": "application/json-patch+json; charset=UTF-8",
          ...requestOptions.headers
        }
      });
    }
    async resolveRef(obj, path, graph, cache2, requestOptions = {}) {
      const node = getPath(obj, path);
      if (node) {
        const isArray = Array.isArray(node);
        return Promise.all(makeArray(node).filter(Boolean).map((item, i) => {
          const ref = item.reference;
          if (ref) {
            return this.fhirRequest(ref, { ...requestOptions, includeResponse: false, cacheMap: cache2 }).then((sub) => {
              if (graph) {
                if (isArray) {
                  if (path.indexOf("..") > -1) {
                    setPath(obj, `${path.replace("..", `.${i}.`)}`, sub);
                  } else {
                    setPath(obj, `${path}.${i}`, sub);
                  }
                } else {
                  setPath(obj, path, sub);
                }
              }
            }).catch((ex) => {
              if (ex?.status === 404) {
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
    async fetchReferences(resource, references, graph, cache2 = {}, requestOptions = {}) {
      if (resource.resourceType == "Bundle") {
        for (const item of resource.entry || []) {
          if (item.resource) {
            await this.fetchReferences(item.resource, references, graph, cache2, requestOptions);
          }
        }
        return cache2;
      }
      let paths = references.map((path) => String(path).trim()).filter(Boolean);
      paths = paths.reduce((prev, cur) => {
        if (prev.includes(cur)) {
          debug2('Duplicated reference path "%s"', cur);
        } else {
          prev.push(cur);
        }
        return prev;
      }, []);
      if (!paths.length) {
        return Promise.resolve(cache2);
      }
      const groups = {};
      paths.forEach((path) => {
        const len = path.split(".").length;
        if (!groups[len]) {
          groups[len] = [];
        }
        groups[len].push(path);
      });
      let task = Promise.resolve();
      Object.keys(groups).sort().forEach((len) => {
        const group = groups[len];
        task = task.then(() => Promise.all(group.map((path) => {
          return this.resolveRef(resource, path, graph, cache2, requestOptions);
        })));
      });
      await task;
      return cache2;
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
    async *resources(bundleOrUrl, options2) {
      let count = 0;
      for await (const page of this.pages(bundleOrUrl, options2)) {
        for (const entry of page.entry || []) {
          if (options2?.limit && ++count > options2.limit) {
            return;
          }
          yield entry.resource;
        }
      }
    }
    /**
     * Given a FHIR Bundle or a URL pointing to a bundle, iterates over all
     * pages. Note that this will automatically crawl through
     * further pages (if any) but it will not detect previous pages. It is
     * designed to be called on the first page and fetch any followup pages.
     */
    async *pages(bundleOrUrl, requestOptions) {
      const { limit, ...options2 } = requestOptions || {};
      const fetchPage = (url) => this.fhirRequest(url, options2);
      let page = typeof bundleOrUrl === "string" || bundleOrUrl instanceof URL ? await fetchPage(bundleOrUrl) : bundleOrUrl;
      let count = 0;
      while (page && page.resourceType === "Bundle" && (!limit || ++count <= limit)) {
        yield page;
        if (options2?.signal?.aborted) {
          break;
        }
        const nextLink = (page.link ?? []).find(
          (l) => l.relation === "next" && typeof l.url === "string"
        );
        if (!nextLink) {
          break;
        }
        page = await fetchPage(nextLink.url);
      }
    }
    /**
     * The method responsible for making all http requests
     */
    async fhirRequest(uri, options2 = {}) {
      assert(options2, "fhirRequest requires a uri as first argument");
      const getRequestDefaults = await this.getRequestDefaults();
      options2 = {
        ...getRequestDefaults,
        ...options2,
        headers: {
          ...getRequestDefaults.headers || {},
          ...options2.headers || {}
        }
      };
      const path = uri + "";
      const url = absolute(path, this.fhirBaseUrl);
      const { cacheMap } = options2;
      if (cacheMap) {
        if (!(path in cacheMap)) {
          cacheMap[path] = request(url, options2).then((res) => {
            cacheMap[path] = res;
            return res;
          }).catch((error) => {
            delete cacheMap[path];
            throw error;
          });
        }
        return cacheMap[path];
      }
      return request(url, options2);
    }
    /**
     * Returns a promise that will be resolved with the fhir version as defined
     * in the CapabilityStatement.
     */
    async getFhirVersion() {
      return fetchConformanceStatement(this.fhirBaseUrl).then((metadata) => metadata.fhirVersion);
    }
    /**
     * Returns a promise that will be resolved with the numeric fhir version
     * - 2 for DSTU2
     * - 3 for STU3
     * - 4 for R4
     * - 0 if the version is not known
     */
    async getFhirRelease() {
      return this.getFhirVersion().then((v) => fhirVersions[v] ?? 0);
    }
  };

  // src/Client.ts
  var debug3 = _debug.extend("client");
  async function contextualize(requestOptions, client2) {
    const base = absolute("/", client2.state.serverUrl);
    async function contextualURL(_url) {
      const resourceType = _url.pathname.split("/").pop();
      assert(resourceType, `Invalid url "${_url}"`);
      assert(patientCompartment.indexOf(resourceType) > -1, `Cannot filter "${resourceType}" resources by patient`);
      const conformance = await fetchConformanceStatement(client2.state.serverUrl);
      const searchParam = getPatientParam(conformance, resourceType);
      _url.searchParams.set(searchParam, client2.patient.id);
      return _url.href;
    }
    if (typeof requestOptions == "string" || requestOptions instanceof URL) {
      return { url: await contextualURL(new URL(requestOptions + "", base)) };
    }
    requestOptions.url = await contextualURL(new URL(requestOptions.url + "", base));
    return requestOptions;
  }
  var Client = class extends FhirClient {
    /**
     * The state of the client instance is an object with various properties.
     * It contains some details about how the client has been authorized and
     * determines the behavior of the client instance. This state is persisted
     * in `SessionStorage` in browsers or in request session on the servers.
     */
    state;
    /**
     * The adapter to use to connect to the current environment. Currently we have:
     * - BrowserAdapter - for browsers
     * - NodeAdapter - for Express or vanilla NodeJS servers
     * - HapiAdapter - for HAPI NodeJS servers
     */
    environment;
    /**
     * A SMART app is typically associated with a patient. This is a namespace
     * for the patient-related functionality of the client.
     */
    patient;
    /**
     * The client may be associated with a specific encounter, if the scopes
     * permit that and if the back-end server supports that. This is a namespace
     * for encounter-related functionality.
     */
    encounter;
    /**
     * The client may be associated with a specific user, if the scopes
     * permit that. This is a namespace for user-related functionality.
     */
    user;
    /**
     * The [FhirJS](https://github.com/FHIR/fhir.js/blob/master/README.md) API.
     * **NOTE:** This will only be available if `fhir.js` is used. Otherwise it
     * will be `undefined`.
     */
    api;
    /**
     * Refers to the refresh task while it is being performed.
     * @see [[refresh]]
     */
    _refreshTask;
    /**
     * Validates the parameters and creates an instance.
     */
    constructor(environment, state) {
      const _state = typeof state == "string" ? { serverUrl: state } : state;
      assert(
        _state.serverUrl && _state.serverUrl.match(/https?:\/\/.+/),
        'A "serverUrl" option is required and must begin with "http(s)"'
      );
      super(_state.serverUrl);
      this.state = _state;
      this.environment = environment;
      this._refreshTask = null;
      const client2 = this;
      this.patient = {
        get id() {
          return client2.getPatientId();
        },
        read: (requestOptions) => {
          const id = this.patient.id;
          return id ? this.request({ ...requestOptions, url: `Patient/${id}` }) : Promise.reject(new Error("Patient is not available"));
        },
        request: (requestOptions, fhirOptions = {}) => {
          if (this.patient.id) {
            return (async () => {
              const options2 = await contextualize(requestOptions, this);
              return this.request(options2, fhirOptions);
            })();
          } else {
            return Promise.reject(new Error("Patient is not available"));
          }
        }
      };
      this.encounter = {
        get id() {
          return client2.getEncounterId();
        },
        read: (requestOptions) => {
          const id = this.encounter.id;
          return id ? this.request({ ...requestOptions, url: `Encounter/${id}` }) : Promise.reject(new Error("Encounter is not available"));
        }
      };
      this.user = {
        get fhirUser() {
          return client2.getFhirUser();
        },
        get id() {
          return client2.getUserId();
        },
        get resourceType() {
          return client2.getUserType();
        },
        read: (requestOptions) => {
          const fhirUser = this.user.fhirUser;
          return fhirUser ? this.request({ ...requestOptions, url: fhirUser }) : Promise.reject(new Error("User is not available"));
        }
      };
    }
    /**
     * Returns the ID of the selected patient or null. You should have requested
     * "launch/patient" scope. Otherwise this will return null.
     */
    getPatientId() {
      const tokenResponse = this.state.tokenResponse;
      if (tokenResponse) {
        if (!tokenResponse.patient) {
          if (!(this.state.scope || "").match(/\blaunch(\/patient)?\b/)) {
            debug3(strings_default.noScopeForId, "patient", "patient");
          } else {
            debug3("The ID of the selected patient is not available. Please check if your server supports that.");
          }
          return null;
        }
        return tokenResponse.patient;
      }
      if (this.state.authorizeUri) {
        debug3(strings_default.noIfNoAuth, "the ID of the selected patient");
      } else {
        debug3(strings_default.noFreeContext, "selected patient");
      }
      return null;
    }
    /**
     * Returns the ID of the selected encounter or null. You should have
     * requested "launch/encounter" scope. Otherwise this will return null.
     * Note that not all servers support the "launch/encounter" scope so this
     * will be null if they don't.
     */
    getEncounterId() {
      const tokenResponse = this.state.tokenResponse;
      if (tokenResponse) {
        if (!tokenResponse.encounter) {
          if (!(this.state.scope || "").match(/\blaunch(\/encounter)?\b/)) {
            debug3(strings_default.noScopeForId, "encounter", "encounter");
          } else {
            debug3("The ID of the selected encounter is not available. Please check if your server supports that, and that the selected patient has any recorded encounters.");
          }
          return null;
        }
        return tokenResponse.encounter;
      }
      if (this.state.authorizeUri) {
        debug3(strings_default.noIfNoAuth, "the ID of the selected encounter");
      } else {
        debug3(strings_default.noFreeContext, "selected encounter");
      }
      return null;
    }
    /**
     * Returns the (decoded) id_token if any. You need to request "openid" and
     * "profile" scopes if you need to receive an id_token (if you need to know
     * who the logged-in user is).
     */
    getIdToken() {
      const tokenResponse = this.state.tokenResponse;
      if (tokenResponse) {
        const idToken = tokenResponse.id_token;
        const scope = this.state.scope || "";
        if (!idToken) {
          const hasOpenid = scope.match(/\bopenid\b/);
          const hasProfile = scope.match(/\bprofile\b/);
          const hasFhirUser = scope.match(/\bfhirUser\b/);
          if (!hasOpenid || !(hasFhirUser || hasProfile)) {
            debug3(
              "You are trying to get the id_token but you are not using the right scopes. Please add 'openid' and 'fhirUser' or 'profile' to the scopes you are requesting."
            );
          } else {
            debug3("The id_token is not available. Please check if your server supports that.");
          }
          return null;
        }
        return jwtDecode(idToken, this.environment);
      }
      if (this.state.authorizeUri) {
        debug3(strings_default.noIfNoAuth, "the id_token");
      } else {
        debug3(strings_default.noFreeContext, "id_token");
      }
      return null;
    }
    /**
     * Returns the profile of the logged_in user (if any). This is a string
     * having the following shape `"{user type}/{user id}"`. For example:
     * `"Practitioner/abc"` or `"Patient/xyz"`.
     */
    getFhirUser() {
      const idToken = this.getIdToken();
      if (idToken) {
        if (idToken.fhirUser) {
          return idToken.fhirUser.split("/").slice(-2).join("/");
        }
        return idToken.profile;
      }
      return null;
    }
    /**
     * Returns the user ID or null.
     */
    getUserId() {
      const profile = this.getFhirUser();
      if (profile) {
        return profile.split("/")[1];
      }
      return null;
    }
    /**
     * Returns the type of the logged-in user or null. The result can be
     * "Practitioner", "Patient" or "RelatedPerson".
     */
    getUserType() {
      const profile = this.getFhirUser();
      if (profile) {
        return profile.split("/")[0];
      }
      return null;
    }
    /**
     * Builds and returns the value of the `Authorization` header that can be
     * sent to the FHIR server
     */
    getAuthorizationHeader() {
      const accessToken = this.getState("tokenResponse.access_token");
      if (accessToken) {
        return "Bearer " + accessToken;
      }
      const { username, password } = this.state;
      if (username && password) {
        return "Basic " + this.environment.btoa(username + ":" + password);
      }
      return null;
    }
    /**
     * Used internally to clear the state of the instance and the state in the
     * associated storage.
     */
    async _clearState() {
      const storage = this.environment.getStorage();
      const key = await storage.get(SMART_KEY);
      if (key) {
        await storage.unset(key);
      }
      await storage.unset(SMART_KEY);
      this.state.tokenResponse = {};
    }
    /**
     * Default request options to be used for every request.
     */
    async getRequestDefaults() {
      const authHeader = this.getAuthorizationHeader();
      return {
        headers: {
          ...authHeader ? { authorization: authHeader } : {}
        }
      };
    }
    /**
     * @param requestOptions Can be a string URL (relative to the serviceUrl),
     * or an object which will be passed to fetch()
     * @param fhirOptions Additional options to control the behavior
     * @param _resolvedRefs DO NOT USE! Used internally.
     * @category Request
     */
    async request(requestOptions, fhirOptions = {}, _resolvedRefs = {}) {
      const debugRequest = _debug.extend("client:request");
      assert(requestOptions, "request requires an url or request options as argument");
      let url;
      if (typeof requestOptions == "string" || requestOptions instanceof URL) {
        url = String(requestOptions);
        requestOptions = {};
      } else {
        url = String(requestOptions.url);
      }
      url = absolute(url, this.state.serverUrl);
      const options2 = {
        graph: fhirOptions.graph !== false,
        flat: !!fhirOptions.flat,
        pageLimit: fhirOptions.pageLimit ?? 1,
        resolveReferences: makeArray(fhirOptions.resolveReferences || []),
        useRefreshToken: fhirOptions.useRefreshToken !== false,
        onPage: typeof fhirOptions.onPage == "function" ? fhirOptions.onPage : void 0
      };
      const signal = requestOptions.signal || void 0;
      if (options2.useRefreshToken) {
        await this.refreshIfNeeded({ signal });
      }
      const authHeader = this.getAuthorizationHeader();
      if (authHeader) {
        requestOptions.headers = {
          ...requestOptions.headers,
          authorization: authHeader
        };
      }
      debugRequest("%s, options: %O, fhirOptions: %O", url, requestOptions, options2);
      let response;
      return super.fhirRequest(url, requestOptions).then((result) => {
        if (requestOptions.includeResponse) {
          response = result.response;
          return result.body;
        }
        return result;
      }).catch(async (error) => {
        if (error.status == 401) {
          if (!this.getState("tokenResponse.access_token")) {
            error.message += "\nThis app cannot be accessed directly. Please launch it as SMART app!";
            throw error;
          }
          if (!options2.useRefreshToken) {
            debugRequest("Your session has expired and the useRefreshToken option is set to false. Please re-launch the app.");
            await this._clearState();
            error.message += "\n" + strings_default.expired;
            throw error;
          }
          debugRequest("Auto-refresh failed! Please re-launch the app.");
          await this._clearState();
          error.message += "\n" + strings_default.expired;
          throw error;
        }
        throw error;
      }).catch((error) => {
        if (error.status == 403) {
          debugRequest("Permission denied! Please make sure that you have requested the proper scopes.");
        }
        throw error;
      }).then(async (data) => {
        if (!data || typeof data == "string" || data instanceof Response) {
          if (requestOptions.includeResponse) {
            return {
              body: data,
              response
            };
          }
          return data;
        }
        await this.fetchReferences(
          data,
          options2.resolveReferences,
          options2.graph,
          _resolvedRefs,
          requestOptions
        );
        return Promise.resolve(data).then(async (_data) => {
          if (_data && _data.resourceType == "Bundle") {
            const links = _data.link || [];
            if (options2.flat) {
              _data = (_data.entry || []).map(
                (entry) => entry.resource
              );
            }
            if (options2.onPage) {
              await options2.onPage(_data, { ..._resolvedRefs });
            }
            if (--options2.pageLimit) {
              const next = links.find((l) => l.relation == "next");
              _data = makeArray(_data);
              if (next && next.url) {
                const nextPage = await this.request(
                  {
                    url: next.url,
                    // Aborting the main request (even after it is complete)
                    // must propagate to any child requests and abort them!
                    // To do so, just pass the same AbortSignal if one is
                    // provided.
                    signal
                  },
                  options2,
                  _resolvedRefs
                );
                if (options2.onPage) {
                  return null;
                }
                if (options2.resolveReferences.length) {
                  Object.assign(_resolvedRefs, nextPage.references);
                  return _data.concat(makeArray(nextPage.data || nextPage));
                }
                return _data.concat(makeArray(nextPage));
              }
            }
          }
          return _data;
        }).then((_data) => {
          if (options2.graph) {
            _resolvedRefs = {};
          } else if (!options2.onPage && options2.resolveReferences.length) {
            return {
              data: _data,
              references: _resolvedRefs
            };
          }
          return _data;
        }).then((_data) => {
          if (requestOptions.includeResponse) {
            return {
              body: _data,
              response
            };
          }
          return _data;
        });
      });
    }
    /**
     * Checks if access token and refresh token are present. If they are, and if
     * the access token is expired or is about to expire in the next 10 seconds,
     * calls `this.refresh()` to obtain new access token.
     * @param requestOptions Any options to pass to the fetch call. Most of them
     * will be overridden, bit it might still be useful for passing additional
     * request options or an abort signal.
     * @category Request
     */
    refreshIfNeeded(requestOptions = {}) {
      const accessToken = this.getState("tokenResponse.access_token");
      const refreshToken = this.getState("tokenResponse.refresh_token");
      const expiresAt = this.state.expiresAt || 0;
      if (accessToken && refreshToken && expiresAt - 10 < Date.now() / 1e3) {
        return this.refresh(requestOptions);
      }
      return Promise.resolve(this.state);
    }
    /**
     * Use the refresh token to obtain new access token. If the refresh token is
     * expired (or this fails for any other reason) it will be deleted from the
     * state, so that we don't enter into loops trying to re-authorize.
     *
     * This method is typically called internally from [[request]] if
     * certain request fails with 401.
     *
     * @param requestOptions Any options to pass to the fetch call. Most of them
     * will be overridden, bit it might still be useful for passing additional
     * request options or an abort signal.
     * @category Request
     */
    refresh(requestOptions = {}) {
      const debugRefresh = _debug.extend("client:refresh");
      debugRefresh("Attempting to refresh with refresh_token...");
      const refreshToken = this.state?.tokenResponse?.refresh_token;
      assert(refreshToken, "Unable to refresh. No refresh_token found.");
      const tokenUri = this.state.tokenUri;
      assert(tokenUri, "Unable to refresh. No tokenUri found.");
      const scopes = this.getState("tokenResponse.scope") || "";
      const hasOfflineAccess = scopes.search(/\boffline_access\b/) > -1;
      const hasOnlineAccess = scopes.search(/\bonline_access\b/) > -1;
      assert(hasOfflineAccess || hasOnlineAccess, "Unable to refresh. No offline_access or online_access scope found.");
      if (!this._refreshTask) {
        let body = `grant_type=refresh_token&refresh_token=${encodeURIComponent(refreshToken)}`;
        if (this.environment.options.refreshTokenWithClientId) {
          body += `&client_id=${this.state.clientId}`;
        }
        const refreshRequestOptions = {
          credentials: this.environment.options.refreshTokenWithCredentials || "same-origin",
          ...requestOptions,
          method: "POST",
          mode: "cors",
          headers: {
            ...requestOptions.headers || {},
            "content-type": "application/x-www-form-urlencoded"
          },
          body
        };
        if (!("authorization" in refreshRequestOptions.headers)) {
          const { clientSecret, clientId } = this.state;
          if (clientSecret) {
            refreshRequestOptions.headers.authorization = "Basic " + this.environment.btoa(
              clientId + ":" + clientSecret
            );
          }
        }
        this._refreshTask = request(tokenUri, refreshRequestOptions).then((data) => {
          assert(data.access_token, "No access token received");
          debugRefresh("Received new access token response %O", data);
          this.state.tokenResponse = { ...this.state.tokenResponse, ...data };
          this.state.expiresAt = getAccessTokenExpiration(data, this.environment);
          return this.state;
        }).catch((error) => {
          if (this.state?.tokenResponse?.refresh_token) {
            debugRefresh("Deleting the expired or invalid refresh token.");
            delete this.state.tokenResponse.refresh_token;
          }
          throw error;
        }).finally(() => {
          this._refreshTask = null;
          const key = this.state.key;
          if (key) {
            this.environment.getStorage().set(key, this.state);
          } else {
            debugRefresh("No 'key' found in Clint.state. Cannot persist the instance.");
          }
        });
      }
      return this._refreshTask;
    }
    // utils -------------------------------------------------------------------
    /**
     * Groups the observations by code. Returns a map that will look like:
     * ```js
     * const map = client.byCodes(observations, "code");
     * // map = {
     * //     "55284-4": [ observation1, observation2 ],
     * //     "6082-2": [ observation3 ]
     * // }
     * ```
     * @param observations Array of observations
     * @param property The name of a CodeableConcept property to group by
     * @remarks This should be deprecated and moved elsewhere. One should not have
     * to obtain an instance of [[Client]] just to use utility functions like this.
     * @deprecated
     * @category Utility
     */
    byCode(observations, property) {
      return byCode(observations, property);
    }
    /**
     * First groups the observations by code using `byCode`. Then returns a function
     * that accepts codes as arguments and will return a flat array of observations
     * having that codes. Example:
     * ```js
     * const filter = client.byCodes(observations, "category");
     * filter("laboratory") // => [ observation1, observation2 ]
     * filter("vital-signs") // => [ observation3 ]
     * filter("laboratory", "vital-signs") // => [ observation1, observation2, observation3 ]
     * ```
     * @param observations Array of observations
     * @param property The name of a CodeableConcept property to group by
     * @remarks This should be deprecated and moved elsewhere. One should not have
     * to obtain an instance of [[Client]] just to use utility functions like this.
     * @deprecated
     * @category Utility
     */
    byCodes(observations, property) {
      return byCodes(observations, property);
    }
    /**
     * @category Utility
     */
    units = units;
    /**
     * Walks through an object (or array) and returns the value found at the
     * provided path. This function is very simple so it intentionally does not
     * support any argument polymorphism, meaning that the path can only be a
     * dot-separated string. If the path is invalid returns undefined.
     * @param obj The object (or Array) to walk through
     * @param path The path (eg. "a.b.4.c")
     * @returns {*} Whatever is found in the path or undefined
     * @remarks This should be deprecated and moved elsewhere. One should not have
     * to obtain an instance of [[Client]] just to use utility functions like this.
     * @deprecated
     * @category Utility
     */
    getPath(obj, path = "") {
      return getPath(obj, path);
    }
    /**
     * Returns a copy of the client state. Accepts a dot-separated path argument
     * (same as for `getPath`) to allow for selecting specific properties.
     * Examples:
     * ```js
     * client.getState(); // -> the entire state object
     * client.getState("serverUrl"); // -> the URL we are connected to
     * client.getState("tokenResponse.patient"); // -> The selected patient ID (if any)
     * ```
     * @param path The path (eg. "a.b.4.c")
     * @returns {*} Whatever is found in the path or undefined
     */
    getState(path = "") {
      return getPath({ ...this.state }, path);
    }
  };

  // src/smart.ts
  var debug4 = _debug.extend("oauth2");
  function isBrowser() {
    return typeof window === "object";
  }
  async function fetchWellKnownJson(baseUrl = "/", requestOptions) {
    const url = String(baseUrl).replace(/\/*$/, "/") + ".well-known/smart-configuration";
    return getAndCache(url, requestOptions).catch((ex) => {
      throw new Error(`Failed to fetch the well-known json "${url}". ${ex.message}`);
    });
  }
  async function getSecurityExtensionsFromWellKnownJson(baseUrl = "/", requestOptions) {
    return fetchWellKnownJson(baseUrl, requestOptions).then((meta) => {
      if (!meta.authorization_endpoint || !meta.token_endpoint) {
        throw new Error("Invalid wellKnownJson");
      }
      return {
        registrationUri: meta.registration_endpoint || "",
        authorizeUri: meta.authorization_endpoint,
        tokenUri: meta.token_endpoint,
        codeChallengeMethods: meta.code_challenge_methods_supported || []
      };
    });
  }
  async function getSecurityExtensionsFromConformanceStatement(baseUrl = "/", requestOptions) {
    return fetchConformanceStatement(baseUrl, requestOptions).then((meta) => {
      const nsUri = "http://fhir-registry.smarthealthit.org/StructureDefinition/oauth-uris";
      const extensions = (getPath(meta || {}, "rest.0.security.extension") || []).filter((e) => e.url === nsUri).map((o) => o.extension)[0];
      const out = {
        registrationUri: "",
        authorizeUri: "",
        tokenUri: "",
        codeChallengeMethods: []
      };
      if (extensions) {
        extensions.forEach((ext) => {
          if (ext.url === "register") {
            out.registrationUri = ext.valueUri;
          }
          if (ext.url === "authorize") {
            out.authorizeUri = ext.valueUri;
          }
          if (ext.url === "token") {
            out.tokenUri = ext.valueUri;
          }
        });
      }
      return out;
    });
  }
  async function getSecurityExtensions(baseUrl = "/", wellKnownRequestOptions, conformanceRequestOptions) {
    return getSecurityExtensionsFromWellKnownJson(baseUrl, wellKnownRequestOptions).catch(() => getSecurityExtensionsFromConformanceStatement(baseUrl, conformanceRequestOptions));
  }
  async function authorize(env, params = {}) {
    const url = env.getUrl();
    if (Array.isArray(params)) {
      const urlISS = url.searchParams.get("iss") || url.searchParams.get("fhirServiceUrl");
      if (!urlISS) {
        throw new Error(
          'Passing in an "iss" url parameter is required if authorize uses multiple configurations'
        );
      }
      const cfg = params.find((x) => {
        if (x.issMatch) {
          if (typeof x.issMatch === "function") {
            return !!x.issMatch(urlISS);
          }
          if (typeof x.issMatch === "string") {
            return x.issMatch === urlISS;
          }
          if (x.issMatch instanceof RegExp) {
            return x.issMatch.test(urlISS);
          }
        }
        return false;
      });
      assert(cfg, `No configuration found matching the current "iss" parameter "${urlISS}"`);
      return await authorize(env, cfg);
    }
    const {
      clientSecret,
      fakeTokenResponse,
      encounterId,
      target,
      width,
      height,
      pkceMode,
      clientPublicKeySetUrl,
      // Two deprecated values to use as fall-back values later
      redirect_uri,
      client_id
    } = params;
    let {
      iss,
      launch,
      patientId,
      fhirServiceUrl,
      redirectUri,
      noRedirect,
      scope = "",
      clientId,
      completeInTarget,
      clientPrivateJwk,
      stateKey
    } = params;
    const storage = env.getStorage();
    iss = url.searchParams.get("iss") || iss;
    fhirServiceUrl = url.searchParams.get("fhirServiceUrl") || fhirServiceUrl;
    launch = url.searchParams.get("launch") || launch;
    patientId = url.searchParams.get("patientId") || patientId;
    clientId = url.searchParams.get("clientId") || clientId;
    if (!clientId) {
      clientId = client_id;
    }
    if (!redirectUri) {
      redirectUri = redirect_uri;
    }
    if (!redirectUri) {
      redirectUri = env.relative(".");
    } else if (!redirectUri.match(/^https?\:\/\//)) {
      redirectUri = env.relative(redirectUri);
    }
    const serverUrl = String(iss || fhirServiceUrl || "");
    if (!serverUrl) {
      throw new Error(
        "No server url found. It must be specified as `iss` or as `fhirServiceUrl` parameter"
      );
    }
    if (iss) {
      debug4("Making %s launch...", launch ? "EHR" : "standalone");
    }
    if (launch && !scope.match(/launch/)) {
      scope += " launch";
    }
    if (isBrowser()) {
      const inFrame = isInFrame();
      const inPopUp = isInPopUp();
      if ((inFrame || inPopUp) && completeInTarget !== true && completeInTarget !== false) {
        completeInTarget = inFrame;
        console.warn(
          'Your app is being authorized from within an iframe or popup window. Please be explicit and provide a "completeInTarget" option. Use "true" to complete the authorization in the same window, or "false" to try to complete it in the parent or the opener window. See http://docs.smarthealthit.org/client-js/api.html'
        );
      }
    }
    const oldKey = await storage.get(SMART_KEY);
    await storage.unset(oldKey);
    stateKey = stateKey ?? randomString(16);
    const state = {
      clientId,
      scope,
      redirectUri,
      serverUrl,
      clientSecret,
      clientPrivateJwk,
      tokenResponse: {},
      key: stateKey,
      completeInTarget,
      clientPublicKeySetUrl
    };
    const fullSessionStorageSupport = isBrowser() ? getPath(env, "options.fullSessionStorageSupport") : true;
    if (fullSessionStorageSupport) {
      await storage.set(SMART_KEY, stateKey);
    }
    if (fakeTokenResponse) {
      Object.assign(state.tokenResponse, fakeTokenResponse);
    }
    if (patientId) {
      Object.assign(state.tokenResponse, { patient: patientId });
    }
    if (encounterId) {
      Object.assign(state.tokenResponse, { encounter: encounterId });
    }
    let redirectUrl = redirectUri + "?state=" + encodeURIComponent(stateKey);
    if (fhirServiceUrl && !iss) {
      debug4("Making fake launch...");
      await storage.set(stateKey, state);
      if (noRedirect) {
        return redirectUrl;
      }
      return await env.redirect(redirectUrl);
    }
    const extensions = await getSecurityExtensions(
      serverUrl,
      params.wellKnownRequestOptions,
      params.conformanceRequestOptions
    );
    Object.assign(state, extensions);
    await storage.set(stateKey, state);
    if (!state.authorizeUri) {
      if (noRedirect) {
        return redirectUrl;
      }
      return await env.redirect(redirectUrl);
    }
    const redirectParams = [
      "response_type=code",
      "client_id=" + encodeURIComponent(clientId || ""),
      "scope=" + encodeURIComponent(scope),
      "redirect_uri=" + encodeURIComponent(redirectUri),
      "aud=" + encodeURIComponent(serverUrl),
      "state=" + encodeURIComponent(stateKey)
    ];
    if (launch) {
      redirectParams.push("launch=" + encodeURIComponent(launch));
    }
    if (shouldIncludeChallenge(extensions.codeChallengeMethods.includes("S256"), pkceMode)) {
      let codes = await env.security.generatePKCEChallenge();
      Object.assign(state, codes);
      await storage.set(stateKey, state);
      redirectParams.push("code_challenge=" + state.codeChallenge);
      redirectParams.push("code_challenge_method=S256");
    }
    redirectUrl = state.authorizeUri + "?" + redirectParams.join("&");
    if (noRedirect) {
      return redirectUrl;
    }
    if (target && isBrowser()) {
      let win;
      win = await getTargetWindow(target, width, height);
      if (win !== self) {
        try {
          win.sessionStorage.removeItem(oldKey);
          win.sessionStorage.setItem(stateKey, JSON.stringify(state));
        } catch (ex) {
          _debug(`Failed to modify window.sessionStorage. Perhaps it is from different origin?. Failing back to "_self". %s`, ex);
          win = self;
        }
      }
      if (win !== self) {
        try {
          win.location.href = redirectUrl;
          self.addEventListener("message", onMessage);
        } catch (ex) {
          _debug(`Failed to modify window.location. Perhaps it is from different origin?. Failing back to "_self". %s`, ex);
          self.location.href = redirectUrl;
        }
      } else {
        self.location.href = redirectUrl;
      }
      return;
    } else {
      return await env.redirect(redirectUrl);
    }
  }
  function shouldIncludeChallenge(S256supported, pkceMode) {
    if (pkceMode === "disabled") {
      return false;
    }
    if (pkceMode === "unsafeV1") {
      return true;
    }
    if (pkceMode === "required") {
      if (!S256supported) {
        throw new Error("Required PKCE code challenge method (`S256`) was not found in the server's codeChallengeMethods declaration.");
      }
      return true;
    }
    return S256supported;
  }
  function isInFrame() {
    try {
      return self !== top && parent !== self;
    } catch (e) {
      return true;
    }
  }
  function isInPopUp() {
    try {
      return self === top && !!opener && opener !== self && !!window.name;
    } catch (e) {
      return false;
    }
  }
  function onMessage(e) {
    if (e.data.type == "completeAuth" && e.origin === new URL(self.location.href).origin) {
      window.removeEventListener("message", onMessage);
      window.location.href = e.data.url;
    }
  }
  async function ready(env, options2 = {}) {
    const url = env.getUrl();
    const Storage2 = env.getStorage();
    const params = url.searchParams;
    let key = params.get("state") || options2.stateKey;
    const code = params.get("code") || options2.code;
    const authError = params.get("error");
    const authErrorDescription = params.get("error_description");
    if (!key) {
      key = await Storage2.get(SMART_KEY);
    }
    if (authError || authErrorDescription) {
      throw new Error([
        authError,
        authErrorDescription
      ].filter(Boolean).join(": "));
    }
    debug4("key: %s, code: %s", key, code);
    assert(key, "No 'state' parameter found. Please (re)launch the app.");
    let state = await Storage2.get(key);
    const fullSessionStorageSupport = isBrowser() ? getPath(env, "options.fullSessionStorageSupport") : true;
    if (isBrowser() && state && !state.completeInTarget) {
      const inFrame = isInFrame();
      const inPopUp = isInPopUp();
      if ((inFrame || inPopUp) && !url.searchParams.get("complete")) {
        url.searchParams.set("complete", "1");
        const { href, origin } = url;
        if (inFrame) {
          parent.postMessage({ type: "completeAuth", url: href }, origin);
        }
        if (inPopUp) {
          opener.postMessage({ type: "completeAuth", url: href }, origin);
          window.close();
        }
        return new Promise(() => {
        });
      }
    }
    url.searchParams.delete("complete");
    const hasState = params.has("state") || options2.stateKey ? true : false;
    if (isBrowser() && getPath(env, "options.replaceBrowserHistory") && (code || hasState)) {
      if (code) {
        params.delete("code");
        debug4("Removed code parameter from the url.");
      }
      if (hasState && fullSessionStorageSupport) {
        params.delete("state");
        debug4("Removed state parameter from the url.");
      }
      if (window.history.replaceState) {
        window.history.replaceState({}, "", url.href);
      }
    }
    assert(state, "No state found! Please (re)launch the app.");
    const authorized = !code || state.tokenResponse?.access_token;
    if (!authorized && state.tokenUri) {
      assert(code, "'code' url parameter is required");
      debug4("Preparing to exchange the code for access token...");
      const requestOptions = await buildTokenRequest(env, {
        code,
        state,
        clientPublicKeySetUrl: options2.clientPublicKeySetUrl,
        privateKey: options2.privateKey || state.clientPrivateJwk
      });
      debug4("Token request options: %O", requestOptions);
      const tokenResponse = await request(state.tokenUri, requestOptions);
      debug4("Token response: %O", tokenResponse);
      assert(tokenResponse.access_token, "Failed to obtain access token.");
      state.expiresAt = getAccessTokenExpiration(tokenResponse, env);
      state = { ...state, tokenResponse };
      await Storage2.set(key, state);
      debug4("Authorization successful!");
    } else {
      debug4(
        state.tokenResponse?.access_token ? "Already authorized" : "No authorization needed"
      );
    }
    if (fullSessionStorageSupport) {
      await Storage2.set(SMART_KEY, key);
    }
    const client2 = new Client(env, state);
    debug4("Created client instance: %O", client2);
    return client2;
  }
  async function buildTokenRequest(env, {
    code,
    state,
    clientPublicKeySetUrl,
    privateKey
  }) {
    const { redirectUri, clientSecret, tokenUri, clientId, codeVerifier } = state;
    assert(redirectUri, "Missing state.redirectUri");
    assert(tokenUri, "Missing state.tokenUri");
    assert(clientId, "Missing state.clientId");
    const requestOptions = {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: `code=${code}&grant_type=authorization_code&redirect_uri=${encodeURIComponent(redirectUri)}`
    };
    if (clientSecret) {
      requestOptions.headers.authorization = "Basic " + env.btoa(
        clientId + ":" + clientSecret
      );
      debug4(
        "Using state.clientSecret to construct the authorization header: %s",
        requestOptions.headers.authorization
      );
    } else if (privateKey) {
      const pk = "key" in privateKey ? privateKey.key : await env.security.importJWK(privateKey);
      const jwtHeaders = {
        typ: "JWT",
        kid: privateKey.kid,
        jku: clientPublicKeySetUrl || state.clientPublicKeySetUrl
      };
      const jwtClaims = {
        iss: clientId,
        sub: clientId,
        aud: tokenUri,
        jti: env.base64urlencode(env.security.randomBytes(32)),
        exp: getTimeInFuture(120)
        // two minutes in the future
      };
      const clientAssertion = await env.security.signCompactJws(privateKey.alg, pk, jwtHeaders, jwtClaims);
      requestOptions.body += `&client_assertion_type=${encodeURIComponent("urn:ietf:params:oauth:client-assertion-type:jwt-bearer")}`;
      requestOptions.body += `&client_assertion=${encodeURIComponent(clientAssertion)}`;
      debug4("Using state.clientPrivateJwk to add a client_assertion to the POST body");
    } else {
      debug4("Public client detected; adding state.clientId to the POST body");
      requestOptions.body += `&client_id=${encodeURIComponent(clientId)}`;
    }
    if (codeVerifier) {
      debug4("Found state.codeVerifier, adding to the POST body");
      requestOptions.body += "&code_verifier=" + codeVerifier;
    }
    return requestOptions;
  }
  async function init(env, authorizeOptions, readyOptions) {
    const url = env.getUrl();
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    if (code && state) {
      return ready(env, readyOptions);
    }
    const storage = env.getStorage();
    const key = state || await storage.get(SMART_KEY);
    const cached = await storage.get(key);
    if (cached) {
      return new Client(env, cached);
    }
    return authorize(env, authorizeOptions).then(() => {
      return new Promise(() => {
      });
    });
  }

  // src/storage/BrowserStorage.ts
  var Storage = class {
    /**
     * Gets the value at `key`. Returns a promise that will be resolved
     * with that value (or undefined for missing keys).
     */
    async get(key) {
      const value = sessionStorage[key];
      if (value) {
        return JSON.parse(value);
      }
      return null;
    }
    /**
     * Sets the `value` on `key` and returns a promise that will be resolved
     * with the value that was set.
     */
    async set(key, value) {
      sessionStorage[key] = JSON.stringify(value);
      return value;
    }
    /**
     * Deletes the value at `key`. Returns a promise that will be resolved
     * with true if the key was deleted or with false if it was not (eg. if
     * did not exist).
     */
    async unset(key) {
      if (key in sessionStorage) {
        delete sessionStorage[key];
        return true;
      }
      return false;
    }
  };

  // src/security/browser.ts
  var browser_exports = {};
  __export(browser_exports, {
    digestSha256: () => digestSha256,
    generatePKCEChallenge: () => generatePKCEChallenge,
    importJWK: () => importJWK,
    randomBytes: () => randomBytes,
    signCompactJws: () => signCompactJws
  });

  // node_modules/js-base64/base64.mjs
  var _hasBuffer = typeof Buffer === "function";
  var _TD = typeof TextDecoder === "function" ? new TextDecoder() : void 0;
  var _TE = typeof TextEncoder === "function" ? new TextEncoder() : void 0;
  var b64ch = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
  var b64chs = Array.prototype.slice.call(b64ch);
  var b64tab = ((a) => {
    let tab = {};
    a.forEach((c, i) => tab[c] = i);
    return tab;
  })(b64chs);
  var b64re = /^(?:[A-Za-z\d+\/]{4})*?(?:[A-Za-z\d+\/]{2}(?:==)?|[A-Za-z\d+\/]{3}=?)?$/;
  var _fromCC = String.fromCharCode.bind(String);
  var _U8Afrom = typeof Uint8Array.from === "function" ? Uint8Array.from.bind(Uint8Array) : (it) => new Uint8Array(Array.prototype.slice.call(it, 0));
  var _mkUriSafe = (src) => src.replace(/=/g, "").replace(/[+\/]/g, (m0) => m0 == "+" ? "-" : "_");
  var _tidyB64 = (s) => s.replace(/[^A-Za-z0-9\+\/]/g, "");
  var btoaPolyfill = (bin) => {
    let u32, c0, c1, c2, asc = "";
    const pad = bin.length % 3;
    for (let i = 0; i < bin.length; ) {
      if ((c0 = bin.charCodeAt(i++)) > 255 || (c1 = bin.charCodeAt(i++)) > 255 || (c2 = bin.charCodeAt(i++)) > 255)
        throw new TypeError("invalid character found");
      u32 = c0 << 16 | c1 << 8 | c2;
      asc += b64chs[u32 >> 18 & 63] + b64chs[u32 >> 12 & 63] + b64chs[u32 >> 6 & 63] + b64chs[u32 & 63];
    }
    return pad ? asc.slice(0, pad - 3) + "===".substring(pad) : asc;
  };
  var _btoa = typeof btoa === "function" ? (bin) => btoa(bin) : _hasBuffer ? (bin) => Buffer.from(bin, "binary").toString("base64") : btoaPolyfill;
  var _fromUint8Array = _hasBuffer ? (u8a) => Buffer.from(u8a).toString("base64") : (u8a) => {
    const maxargs = 4096;
    let strs = [];
    for (let i = 0, l = u8a.length; i < l; i += maxargs) {
      strs.push(_fromCC.apply(null, u8a.subarray(i, i + maxargs)));
    }
    return _btoa(strs.join(""));
  };
  var fromUint8Array = (u8a, urlsafe = false) => urlsafe ? _mkUriSafe(_fromUint8Array(u8a)) : _fromUint8Array(u8a);
  var cb_utob = (c) => {
    if (c.length < 2) {
      var cc = c.charCodeAt(0);
      return cc < 128 ? c : cc < 2048 ? _fromCC(192 | cc >>> 6) + _fromCC(128 | cc & 63) : _fromCC(224 | cc >>> 12 & 15) + _fromCC(128 | cc >>> 6 & 63) + _fromCC(128 | cc & 63);
    } else {
      var cc = 65536 + (c.charCodeAt(0) - 55296) * 1024 + (c.charCodeAt(1) - 56320);
      return _fromCC(240 | cc >>> 18 & 7) + _fromCC(128 | cc >>> 12 & 63) + _fromCC(128 | cc >>> 6 & 63) + _fromCC(128 | cc & 63);
    }
  };
  var re_utob = /[\uD800-\uDBFF][\uDC00-\uDFFFF]|[^\x00-\x7F]/g;
  var utob = (u) => u.replace(re_utob, cb_utob);
  var _encode = _hasBuffer ? (s) => Buffer.from(s, "utf8").toString("base64") : _TE ? (s) => _fromUint8Array(_TE.encode(s)) : (s) => _btoa(utob(s));
  var encode = (src, urlsafe = false) => urlsafe ? _mkUriSafe(_encode(src)) : _encode(src);
  var encodeURI = (src) => encode(src, true);
  var re_btou = /[\xC0-\xDF][\x80-\xBF]|[\xE0-\xEF][\x80-\xBF]{2}|[\xF0-\xF7][\x80-\xBF]{3}/g;
  var cb_btou = (cccc) => {
    switch (cccc.length) {
      case 4:
        var cp = (7 & cccc.charCodeAt(0)) << 18 | (63 & cccc.charCodeAt(1)) << 12 | (63 & cccc.charCodeAt(2)) << 6 | 63 & cccc.charCodeAt(3), offset = cp - 65536;
        return _fromCC((offset >>> 10) + 55296) + _fromCC((offset & 1023) + 56320);
      case 3:
        return _fromCC((15 & cccc.charCodeAt(0)) << 12 | (63 & cccc.charCodeAt(1)) << 6 | 63 & cccc.charCodeAt(2));
      default:
        return _fromCC((31 & cccc.charCodeAt(0)) << 6 | 63 & cccc.charCodeAt(1));
    }
  };
  var btou = (b) => b.replace(re_btou, cb_btou);
  var atobPolyfill = (asc) => {
    asc = asc.replace(/\s+/g, "");
    if (!b64re.test(asc))
      throw new TypeError("malformed base64.");
    asc += "==".slice(2 - (asc.length & 3));
    let u24, r1, r2;
    let binArray = [];
    for (let i = 0; i < asc.length; ) {
      u24 = b64tab[asc.charAt(i++)] << 18 | b64tab[asc.charAt(i++)] << 12 | (r1 = b64tab[asc.charAt(i++)]) << 6 | (r2 = b64tab[asc.charAt(i++)]);
      if (r1 === 64) {
        binArray.push(_fromCC(u24 >> 16 & 255));
      } else if (r2 === 64) {
        binArray.push(_fromCC(u24 >> 16 & 255, u24 >> 8 & 255));
      } else {
        binArray.push(_fromCC(u24 >> 16 & 255, u24 >> 8 & 255, u24 & 255));
      }
    }
    return binArray.join("");
  };
  var _atob = typeof atob === "function" ? (asc) => atob(_tidyB64(asc)) : _hasBuffer ? (asc) => Buffer.from(asc, "base64").toString("binary") : atobPolyfill;
  var _toUint8Array = _hasBuffer ? (a) => _U8Afrom(Buffer.from(a, "base64")) : (a) => _U8Afrom(_atob(a).split("").map((c) => c.charCodeAt(0)));
  var _decode = _hasBuffer ? (a) => Buffer.from(a, "base64").toString("utf8") : _TD ? (a) => _TD.decode(_toUint8Array(a)) : (a) => btou(_atob(a));
  var _unURI = (a) => _tidyB64(a.replace(/[-_]/g, (m0) => m0 == "-" ? "+" : "/"));
  var decode = (src) => _decode(_unURI(src));

  // src/security/browser.ts
  if (!globalThis?.crypto?.subtle) {
    if (!globalThis.isSecureContext) {
      throw new Error(
        "Some of the required subtle crypto functionality is not available unless you run this app in secure context (using HTTPS or running locally). See https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts"
      );
    }
    throw new Error(
      "Some of the required subtle crypto functionality is not available in the current environment (no crypto.subtle). Please use a polyfill to provide this functionality."
    );
  }
  var crypto = globalThis.crypto;
  var subtle = crypto.subtle;
  var ALGS = {
    ES384: {
      name: "ECDSA",
      namedCurve: "P-384"
    },
    RS384: {
      name: "RSASSA-PKCS1-v1_5",
      modulusLength: 4096,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: {
        name: "SHA-384"
      }
    }
  };
  function randomBytes(count) {
    return crypto.getRandomValues(new Uint8Array(count));
  }
  async function digestSha256(payload) {
    const prepared = new TextEncoder().encode(payload);
    const hash = await subtle.digest("SHA-256", prepared);
    return new Uint8Array(hash);
  }
  var generatePKCEChallenge = async (entropy = 96) => {
    const inputBytes = randomBytes(entropy);
    const codeVerifier = fromUint8Array(inputBytes, true);
    const codeChallenge = fromUint8Array(await digestSha256(codeVerifier), true);
    return { codeChallenge, codeVerifier };
  };
  async function importJWK(jwk) {
    if (!jwk.alg) {
      throw new Error('The "alg" property of the JWK must be set to "ES384" or "RS384"');
    }
    if (!Array.isArray(jwk.key_ops)) {
      jwk.key_ops = ["sign"];
    }
    if (!jwk.key_ops.includes("sign")) {
      throw new Error('The "key_ops" property of the JWK does not contain "sign"');
    }
    try {
      return await subtle.importKey(
        "jwk",
        jwk,
        ALGS[jwk.alg],
        jwk.ext === true,
        jwk.key_ops
        // || ['sign']
      );
    } catch (e) {
      throw new Error(`The ${jwk.alg} is not supported by this browser: ${e}`);
    }
  }
  async function signCompactJws(alg, privateKey, header, payload) {
    const jwtHeader = JSON.stringify({ ...header, alg });
    const jwtPayload = JSON.stringify(payload);
    const jwtAuthenticatedContent = `${encodeURI(jwtHeader)}.${encodeURI(jwtPayload)}`;
    const signature = await subtle.sign(
      { ...privateKey.algorithm, hash: "SHA-384" },
      privateKey,
      new TextEncoder().encode(jwtAuthenticatedContent)
    );
    return `${jwtAuthenticatedContent}.${fromUint8Array(new Uint8Array(signature), true)}`;
  }

  // src/adapters/BrowserAdapter.ts
  var BrowserAdapter = class {
    /**
     * Stores the URL instance associated with this adapter
     */
    _url = null;
    /**
     * Holds the Storage instance associated with this instance
     */
    _storage = null;
    /**
     * Environment-specific options
     */
    options;
    security = browser_exports;
    /**
     * @param options Environment-specific options
     */
    constructor(options2 = {}) {
      this.options = {
        // Replaces the browser's current URL
        // using window.history.replaceState API or by reloading.
        replaceBrowserHistory: true,
        // When set to true, this variable will fully utilize
        // HTML5 sessionStorage API.
        // This variable can be overridden to false by setting
        // FHIR.oauth2.settings.fullSessionStorageSupport = false.
        // When set to false, the sessionStorage will be keyed
        // by a state variable. This is to allow the embedded IE browser
        // instances instantiated on a single thread to continue to
        // function without having sessionStorage data shared
        // across the embedded IE instances.
        fullSessionStorageSupport: true,
        // Do we want to send cookies while making a request to the token
        // endpoint in order to obtain new access token using existing
        // refresh token. In rare cases the auth server might require the
        // client to send cookies along with those requests. In this case
        // developers will have to change this before initializing the app
        // like so:
        // `FHIR.oauth2.settings.refreshTokenWithCredentials = "include";`
        // or
        // `FHIR.oauth2.settings.refreshTokenWithCredentials = "same-origin";`
        // Can be one of:
        // "include"     - always send cookies
        // "same-origin" - only send cookies if we are on the same domain (default)
        // "omit"        - do not send cookies
        refreshTokenWithCredentials: "same-origin",
        ...options2
      };
    }
    /**
     * Given a relative path, returns an absolute url using the instance base URL
     */
    relative(path) {
      return new URL(path, this.getUrl().href).href;
    }
    /**
     * In browsers we need to be able to (dynamically) check if fhir.js is
     * included in the page. If it is, it should have created a "fhir" variable
     * in the global scope.
     */
    get fhir() {
      return typeof fhir === "function" ? fhir : null;
    }
    /**
     * Given the current environment, this method must return the current url
     * as URL instance
     */
    getUrl() {
      if (!this._url) {
        this._url = new URL(location + "");
      }
      return this._url;
    }
    /**
     * Given the current environment, this method must redirect to the given
     * path
     */
    redirect(to) {
      location.href = to;
    }
    /**
     * Returns a BrowserStorage object which is just a wrapper around
     * sessionStorage
     */
    getStorage() {
      if (!this._storage) {
        this._storage = new Storage();
      }
      return this._storage;
    }
    /**
     * ASCII string to Base64
     */
    atob(str) {
      return window.atob(str);
    }
    /**
     * Base64 to ASCII string
     */
    btoa(str) {
      return window.btoa(str);
    }
    base64urlencode(input) {
      if (typeof input == "string") {
        return encodeURI(input);
      }
      return fromUint8Array(input, true);
    }
    base64urldecode(input) {
      return decode(input);
    }
    /**
     * Creates and returns adapter-aware SMART api. Not that while the shape of
     * the returned object is well known, the arguments to this function are not.
     * Those who override this method are free to require any environment-specific
     * arguments. For example in node we will need a request, a response and
     * optionally a storage or storage factory function.
     */
    getSmartApi() {
      return {
        ready: (...args) => ready(this, ...args),
        authorize: (options2) => authorize(this, options2),
        init: (options2) => init(this, options2),
        client: (state) => new Client(this, state),
        options: this.options,
        utils: {
          security: browser_exports
        }
      };
    }
  };

  // src/entry/browser.ts
  var adapter = new BrowserAdapter();
  var { ready: ready2, authorize: authorize2, init: init2, client, options, utils } = adapter.getSmartApi();
  var oauth2 = {
    settings: options,
    ready: ready2,
    authorize: authorize2,
    init: init2
  };
  var FHIR = {
    client,
    // Use this class if you are connecting to open server (no authorization).
    FhirClient,
    utils,
    oauth2
  };
  var browser_default = FHIR;
  return __toCommonJS(browser_exports2);
})();
;window.FHIR = FHIR.default;})();
//# sourceMappingURL=fhir-client.js.map
