window["FHIR"] =
/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, { enumerable: true, get: getter });
/******/ 		}
/******/ 	};
/******/
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		}
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/
/******/ 	// create a fake namespace object
/******/ 	// mode & 1: value is a module id, require it
/******/ 	// mode & 2: merge all properties of value into the ns
/******/ 	// mode & 4: return value when already ns object
/******/ 	// mode & 8|1: behave like require
/******/ 	__webpack_require__.t = function(value, mode) {
/******/ 		if(mode & 1) value = __webpack_require__(value);
/******/ 		if(mode & 8) return value;
/******/ 		if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
/******/ 		var ns = Object.create(null);
/******/ 		__webpack_require__.r(ns);
/******/ 		Object.defineProperty(ns, 'default', { enumerable: true, value: value });
/******/ 		if(mode & 2 && typeof value != 'string') for(var key in value) __webpack_require__.d(ns, key, function(key) { return value[key]; }.bind(null, key));
/******/ 		return ns;
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = "./src/browser.js");
/******/ })
/************************************************************************/
/******/ ({

/***/ "./node_modules/debug/node_modules/ms/index.js":
/*!*****************************************************!*\
  !*** ./node_modules/debug/node_modules/ms/index.js ***!
  \*****************************************************/
/*! all exports used */
/***/ (function(module, exports) {

/**
 * Helpers.
 */

var s = 1000;
var m = s * 60;
var h = m * 60;
var d = h * 24;
var w = d * 7;
var y = d * 365.25;

/**
 * Parse or format the given `val`.
 *
 * Options:
 *
 *  - `long` verbose formatting [false]
 *
 * @param {String|Number} val
 * @param {Object} [options]
 * @throws {Error} throw an error if val is not a non-empty string or a number
 * @return {String|Number}
 * @api public
 */

module.exports = function(val, options) {
  options = options || {};
  var type = typeof val;
  if (type === 'string' && val.length > 0) {
    return parse(val);
  } else if (type === 'number' && isNaN(val) === false) {
    return options.long ? fmtLong(val) : fmtShort(val);
  }
  throw new Error(
    'val is not a non-empty string or a valid number. val=' +
      JSON.stringify(val)
  );
};

/**
 * Parse the given `str` and return milliseconds.
 *
 * @param {String} str
 * @return {Number}
 * @api private
 */

function parse(str) {
  str = String(str);
  if (str.length > 100) {
    return;
  }
  var match = /^((?:\d+)?\-?\d?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)?$/i.exec(
    str
  );
  if (!match) {
    return;
  }
  var n = parseFloat(match[1]);
  var type = (match[2] || 'ms').toLowerCase();
  switch (type) {
    case 'years':
    case 'year':
    case 'yrs':
    case 'yr':
    case 'y':
      return n * y;
    case 'weeks':
    case 'week':
    case 'w':
      return n * w;
    case 'days':
    case 'day':
    case 'd':
      return n * d;
    case 'hours':
    case 'hour':
    case 'hrs':
    case 'hr':
    case 'h':
      return n * h;
    case 'minutes':
    case 'minute':
    case 'mins':
    case 'min':
    case 'm':
      return n * m;
    case 'seconds':
    case 'second':
    case 'secs':
    case 'sec':
    case 's':
      return n * s;
    case 'milliseconds':
    case 'millisecond':
    case 'msecs':
    case 'msec':
    case 'ms':
      return n;
    default:
      return undefined;
  }
}

/**
 * Short format for `ms`.
 *
 * @param {Number} ms
 * @return {String}
 * @api private
 */

function fmtShort(ms) {
  var msAbs = Math.abs(ms);
  if (msAbs >= d) {
    return Math.round(ms / d) + 'd';
  }
  if (msAbs >= h) {
    return Math.round(ms / h) + 'h';
  }
  if (msAbs >= m) {
    return Math.round(ms / m) + 'm';
  }
  if (msAbs >= s) {
    return Math.round(ms / s) + 's';
  }
  return ms + 'ms';
}

/**
 * Long format for `ms`.
 *
 * @param {Number} ms
 * @return {String}
 * @api private
 */

function fmtLong(ms) {
  var msAbs = Math.abs(ms);
  if (msAbs >= d) {
    return plural(ms, msAbs, d, 'day');
  }
  if (msAbs >= h) {
    return plural(ms, msAbs, h, 'hour');
  }
  if (msAbs >= m) {
    return plural(ms, msAbs, m, 'minute');
  }
  if (msAbs >= s) {
    return plural(ms, msAbs, s, 'second');
  }
  return ms + ' ms';
}

/**
 * Pluralization helper.
 */

function plural(ms, msAbs, n, name) {
  var isPlural = msAbs >= n * 1.5;
  return Math.round(ms / n) + ' ' + name + (isPlural ? 's' : '');
}


/***/ }),

/***/ "./node_modules/debug/src/browser.js":
/*!*******************************************!*\
  !*** ./node_modules/debug/src/browser.js ***!
  \*******************************************/
/*! exports used: default */
/***/ (function(module, exports, __webpack_require__) {

/* WEBPACK VAR INJECTION */(function(process) {/* eslint-env browser */

/**
 * This is the web browser implementation of `debug()`.
 */

exports.log = log;
exports.formatArgs = formatArgs;
exports.save = save;
exports.load = load;
exports.useColors = useColors;
exports.storage = localstorage();

/**
 * Colors.
 */

exports.colors = [
	'#0000CC',
	'#0000FF',
	'#0033CC',
	'#0033FF',
	'#0066CC',
	'#0066FF',
	'#0099CC',
	'#0099FF',
	'#00CC00',
	'#00CC33',
	'#00CC66',
	'#00CC99',
	'#00CCCC',
	'#00CCFF',
	'#3300CC',
	'#3300FF',
	'#3333CC',
	'#3333FF',
	'#3366CC',
	'#3366FF',
	'#3399CC',
	'#3399FF',
	'#33CC00',
	'#33CC33',
	'#33CC66',
	'#33CC99',
	'#33CCCC',
	'#33CCFF',
	'#6600CC',
	'#6600FF',
	'#6633CC',
	'#6633FF',
	'#66CC00',
	'#66CC33',
	'#9900CC',
	'#9900FF',
	'#9933CC',
	'#9933FF',
	'#99CC00',
	'#99CC33',
	'#CC0000',
	'#CC0033',
	'#CC0066',
	'#CC0099',
	'#CC00CC',
	'#CC00FF',
	'#CC3300',
	'#CC3333',
	'#CC3366',
	'#CC3399',
	'#CC33CC',
	'#CC33FF',
	'#CC6600',
	'#CC6633',
	'#CC9900',
	'#CC9933',
	'#CCCC00',
	'#CCCC33',
	'#FF0000',
	'#FF0033',
	'#FF0066',
	'#FF0099',
	'#FF00CC',
	'#FF00FF',
	'#FF3300',
	'#FF3333',
	'#FF3366',
	'#FF3399',
	'#FF33CC',
	'#FF33FF',
	'#FF6600',
	'#FF6633',
	'#FF9900',
	'#FF9933',
	'#FFCC00',
	'#FFCC33'
];

/**
 * Currently only WebKit-based Web Inspectors, Firefox >= v31,
 * and the Firebug extension (any Firefox version) are known
 * to support "%c" CSS customizations.
 *
 * TODO: add a `localStorage` variable to explicitly enable/disable colors
 */

// eslint-disable-next-line complexity
function useColors() {
	// NB: In an Electron preload script, document will be defined but not fully
	// initialized. Since we know we're in Chrome, we'll just detect this case
	// explicitly
	if (typeof window !== 'undefined' && window.process && (window.process.type === 'renderer' || window.process.__nwjs)) {
		return true;
	}

	// Internet Explorer and Edge do not support colors.
	if (typeof navigator !== 'undefined' && navigator.userAgent && navigator.userAgent.toLowerCase().match(/(edge|trident)\/(\d+)/)) {
		return false;
	}

	// Is webkit? http://stackoverflow.com/a/16459606/376773
	// document is undefined in react-native: https://github.com/facebook/react-native/pull/1632
	return (typeof document !== 'undefined' && document.documentElement && document.documentElement.style && document.documentElement.style.WebkitAppearance) ||
		// Is firebug? http://stackoverflow.com/a/398120/376773
		(typeof window !== 'undefined' && window.console && (window.console.firebug || (window.console.exception && window.console.table))) ||
		// Is firefox >= v31?
		// https://developer.mozilla.org/en-US/docs/Tools/Web_Console#Styling_messages
		(typeof navigator !== 'undefined' && navigator.userAgent && navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/) && parseInt(RegExp.$1, 10) >= 31) ||
		// Double check webkit in userAgent just in case we are in a worker
		(typeof navigator !== 'undefined' && navigator.userAgent && navigator.userAgent.toLowerCase().match(/applewebkit\/(\d+)/));
}

/**
 * Colorize log arguments if enabled.
 *
 * @api public
 */

function formatArgs(args) {
	args[0] = (this.useColors ? '%c' : '') +
		this.namespace +
		(this.useColors ? ' %c' : ' ') +
		args[0] +
		(this.useColors ? '%c ' : ' ') +
		'+' + module.exports.humanize(this.diff);

	if (!this.useColors) {
		return;
	}

	const c = 'color: ' + this.color;
	args.splice(1, 0, c, 'color: inherit');

	// The final "%c" is somewhat tricky, because there could be other
	// arguments passed either before or after the %c, so we need to
	// figure out the correct index to insert the CSS into
	let index = 0;
	let lastC = 0;
	args[0].replace(/%[a-zA-Z%]/g, match => {
		if (match === '%%') {
			return;
		}
		index++;
		if (match === '%c') {
			// We only are interested in the *last* %c
			// (the user may have provided their own)
			lastC = index;
		}
	});

	args.splice(lastC, 0, c);
}

/**
 * Invokes `console.log()` when available.
 * No-op when `console.log` is not a "function".
 *
 * @api public
 */
function log(...args) {
	// This hackery is required for IE8/9, where
	// the `console.log` function doesn't have 'apply'
	return typeof console === 'object' &&
		console.log &&
		console.log(...args);
}

/**
 * Save `namespaces`.
 *
 * @param {String} namespaces
 * @api private
 */
function save(namespaces) {
	try {
		if (namespaces) {
			exports.storage.setItem('debug', namespaces);
		} else {
			exports.storage.removeItem('debug');
		}
	} catch (error) {
		// Swallow
		// XXX (@Qix-) should we be logging these?
	}
}

/**
 * Load `namespaces`.
 *
 * @return {String} returns the previously persisted debug modes
 * @api private
 */
function load() {
	let r;
	try {
		r = exports.storage.getItem('debug');
	} catch (error) {
		// Swallow
		// XXX (@Qix-) should we be logging these?
	}

	// If debug isn't set in LS, and we're in Electron, try to load $DEBUG
	if (!r && typeof process !== 'undefined' && 'env' in process) {
		r = process.env.DEBUG;
	}

	return r;
}

/**
 * Localstorage attempts to return the localstorage.
 *
 * This is necessary because safari throws
 * when a user disables cookies/localstorage
 * and you attempt to access it.
 *
 * @return {LocalStorage}
 * @api private
 */

function localstorage() {
	try {
		// TVMLKit (Apple TV JS Runtime) does not have a window object, just localStorage in the global context
		// The Browser also has localStorage in the global context.
		return localStorage;
	} catch (error) {
		// Swallow
		// XXX (@Qix-) should we be logging these?
	}
}

module.exports = __webpack_require__(/*! ./common */ "./node_modules/debug/src/common.js")(exports);

const {formatters} = module.exports;

/**
 * Map %j to `JSON.stringify()`, since no Web Inspectors do that by default.
 */

formatters.j = function (v) {
	try {
		return JSON.stringify(v);
	} catch (error) {
		return '[UnexpectedJSONParseError]: ' + error.message;
	}
};

/* WEBPACK VAR INJECTION */}.call(this, __webpack_require__(/*! ./../../process/browser.js */ "./node_modules/process/browser.js")))

/***/ }),

/***/ "./node_modules/debug/src/common.js":
/*!******************************************!*\
  !*** ./node_modules/debug/src/common.js ***!
  \******************************************/
/*! all exports used */
/***/ (function(module, exports, __webpack_require__) {


/**
 * This is the common logic for both the Node.js and web browser
 * implementations of `debug()`.
 */

function setup(env) {
	createDebug.debug = createDebug;
	createDebug.default = createDebug;
	createDebug.coerce = coerce;
	createDebug.disable = disable;
	createDebug.enable = enable;
	createDebug.enabled = enabled;
	createDebug.humanize = __webpack_require__(/*! ms */ "./node_modules/debug/node_modules/ms/index.js");

	Object.keys(env).forEach(key => {
		createDebug[key] = env[key];
	});

	/**
	* Active `debug` instances.
	*/
	createDebug.instances = [];

	/**
	* The currently active debug mode names, and names to skip.
	*/

	createDebug.names = [];
	createDebug.skips = [];

	/**
	* Map of special "%n" handling functions, for the debug "format" argument.
	*
	* Valid key names are a single, lower or upper-case letter, i.e. "n" and "N".
	*/
	createDebug.formatters = {};

	/**
	* Selects a color for a debug namespace
	* @param {String} namespace The namespace string for the for the debug instance to be colored
	* @return {Number|String} An ANSI color code for the given namespace
	* @api private
	*/
	function selectColor(namespace) {
		let hash = 0;

		for (let i = 0; i < namespace.length; i++) {
			hash = ((hash << 5) - hash) + namespace.charCodeAt(i);
			hash |= 0; // Convert to 32bit integer
		}

		return createDebug.colors[Math.abs(hash) % createDebug.colors.length];
	}
	createDebug.selectColor = selectColor;

	/**
	* Create a debugger with the given `namespace`.
	*
	* @param {String} namespace
	* @return {Function}
	* @api public
	*/
	function createDebug(namespace) {
		let prevTime;

		function debug(...args) {
			// Disabled?
			if (!debug.enabled) {
				return;
			}

			const self = debug;

			// Set `diff` timestamp
			const curr = Number(new Date());
			const ms = curr - (prevTime || curr);
			self.diff = ms;
			self.prev = prevTime;
			self.curr = curr;
			prevTime = curr;

			args[0] = createDebug.coerce(args[0]);

			if (typeof args[0] !== 'string') {
				// Anything else let's inspect with %O
				args.unshift('%O');
			}

			// Apply any `formatters` transformations
			let index = 0;
			args[0] = args[0].replace(/%([a-zA-Z%])/g, (match, format) => {
				// If we encounter an escaped % then don't increase the array index
				if (match === '%%') {
					return match;
				}
				index++;
				const formatter = createDebug.formatters[format];
				if (typeof formatter === 'function') {
					const val = args[index];
					match = formatter.call(self, val);

					// Now we need to remove `args[index]` since it's inlined in the `format`
					args.splice(index, 1);
					index--;
				}
				return match;
			});

			// Apply env-specific formatting (colors, etc.)
			createDebug.formatArgs.call(self, args);

			const logFn = self.log || createDebug.log;
			logFn.apply(self, args);
		}

		debug.namespace = namespace;
		debug.enabled = createDebug.enabled(namespace);
		debug.useColors = createDebug.useColors();
		debug.color = selectColor(namespace);
		debug.destroy = destroy;
		debug.extend = extend;
		// Debug.formatArgs = formatArgs;
		// debug.rawLog = rawLog;

		// env-specific initialization logic for debug instances
		if (typeof createDebug.init === 'function') {
			createDebug.init(debug);
		}

		createDebug.instances.push(debug);

		return debug;
	}

	function destroy() {
		const index = createDebug.instances.indexOf(this);
		if (index !== -1) {
			createDebug.instances.splice(index, 1);
			return true;
		}
		return false;
	}

	function extend(namespace, delimiter) {
		const newDebug = createDebug(this.namespace + (typeof delimiter === 'undefined' ? ':' : delimiter) + namespace);
		newDebug.log = this.log;
		return newDebug;
	}

	/**
	* Enables a debug mode by namespaces. This can include modes
	* separated by a colon and wildcards.
	*
	* @param {String} namespaces
	* @api public
	*/
	function enable(namespaces) {
		createDebug.save(namespaces);

		createDebug.names = [];
		createDebug.skips = [];

		let i;
		const split = (typeof namespaces === 'string' ? namespaces : '').split(/[\s,]+/);
		const len = split.length;

		for (i = 0; i < len; i++) {
			if (!split[i]) {
				// ignore empty strings
				continue;
			}

			namespaces = split[i].replace(/\*/g, '.*?');

			if (namespaces[0] === '-') {
				createDebug.skips.push(new RegExp('^' + namespaces.substr(1) + '$'));
			} else {
				createDebug.names.push(new RegExp('^' + namespaces + '$'));
			}
		}

		for (i = 0; i < createDebug.instances.length; i++) {
			const instance = createDebug.instances[i];
			instance.enabled = createDebug.enabled(instance.namespace);
		}
	}

	/**
	* Disable debug output.
	*
	* @return {String} namespaces
	* @api public
	*/
	function disable() {
		const namespaces = [
			...createDebug.names.map(toNamespace),
			...createDebug.skips.map(toNamespace).map(namespace => '-' + namespace)
		].join(',');
		createDebug.enable('');
		return namespaces;
	}

	/**
	* Returns true if the given mode name is enabled, false otherwise.
	*
	* @param {String} name
	* @return {Boolean}
	* @api public
	*/
	function enabled(name) {
		if (name[name.length - 1] === '*') {
			return true;
		}

		let i;
		let len;

		for (i = 0, len = createDebug.skips.length; i < len; i++) {
			if (createDebug.skips[i].test(name)) {
				return false;
			}
		}

		for (i = 0, len = createDebug.names.length; i < len; i++) {
			if (createDebug.names[i].test(name)) {
				return true;
			}
		}

		return false;
	}

	/**
	* Convert regexp to namespace
	*
	* @param {RegExp} regxep
	* @return {String} namespace
	* @api private
	*/
	function toNamespace(regexp) {
		return regexp.toString()
			.substring(2, regexp.toString().length - 2)
			.replace(/\.\*\?$/, '*');
	}

	/**
	* Coerce `val`.
	*
	* @param {Mixed} val
	* @return {Mixed}
	* @api private
	*/
	function coerce(val) {
		if (val instanceof Error) {
			return val.stack || val.message;
		}
		return val;
	}

	createDebug.enable(createDebug.load());

	return createDebug;
}

module.exports = setup;


/***/ }),

/***/ "./node_modules/process/browser.js":
/*!*****************************************!*\
  !*** ./node_modules/process/browser.js ***!
  \*****************************************/
/*! all exports used */
/***/ (function(module, exports) {

// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };


/***/ }),

/***/ "./node_modules/webpack/buildin/global.js":
/*!***********************************!*\
  !*** (webpack)/buildin/global.js ***!
  \***********************************/
/*! all exports used */
/***/ (function(module, exports) {

var g;

// This works in non-strict mode
g = (function() {
	return this;
})();

try {
	// This works if eval is allowed (see CSP)
	g = g || new Function("return this")();
} catch (e) {
	// This works if the window reference is available
	if (typeof window === "object") g = window;
}

// g can still be undefined, but nothing to do about it...
// We return undefined, instead of nothing here, so it's
// easier to handle this case. if(!global) { ...}

module.exports = g;


/***/ }),

/***/ "./src/Client.js":
/*!***********************!*\
  !*** ./src/Client.js ***!
  \***********************/
/*! exports used: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "default", function() { return FhirClient; });
/* harmony import */ var _lib__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./lib */ "./src/lib.js");
/* harmony import */ var _strings__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./strings */ "./src/strings.js");
/* harmony import */ var _smart__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./smart */ "./src/smart.js");
/* harmony import */ var _settings__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./settings */ "./src/settings.js");
/// <reference path="types.d.ts" />



 // @ts-ignore
// eslint-disable-next-line no-undef

const {
  Response
} =  true ? window : undefined;

const debug = _lib__WEBPACK_IMPORTED_MODULE_0__["debug"].extend("client");
/**
 * Adds patient context to requestOptions object to be used with fhirclient.Client.request
 * @param {Object|String} requestOptions Can be a string URL (relative to
 *  the serviceUrl), or an object which will be passed to fetch()
 * @param {fhirclient.Client} client Current FHIR client object containing patient context
 * @return {Promise<Object|String>} requestOptions object contextualized to current patient
 */


async function contextualize(requestOptions, client) {
  // This code could be useful for implementing FHIR version awareness in the future:
  //   const fhirVersionsMap = require("./data/fhir-versions");
  //   const fetchFhirVersion = require("./smart").fetchFhirVersion;
  //   const fhirVersion = client.state.fhirVersion || await fetchFhirVersion(client.state.serverUrl) || "";
  //   const fhirRelease = fhirVersionsMap[fhirVersion];
  const base = Object(_lib__WEBPACK_IMPORTED_MODULE_0__["absolute"])("/", client.state.serverUrl);

  async function contextualURL(url) {
    const resourceType = url.pathname.split("/").pop();

    if (_settings__WEBPACK_IMPORTED_MODULE_3__["patientCompartment"].indexOf(resourceType) == -1) {
      throw new Error(`Cannot filter "${resourceType}" resources by patient`);
    }

    const conformance = await Object(_smart__WEBPACK_IMPORTED_MODULE_2__["fetchConformanceStatement"])(client.state.serverUrl);
    const searchParam = Object(_lib__WEBPACK_IMPORTED_MODULE_0__["getPatientParam"])(conformance, resourceType);
    url.searchParams.set(searchParam, client.patient.id);
    return url.href;
  }

  if (typeof requestOptions == "string" || requestOptions instanceof URL) {
    let url = new URL(requestOptions + "", base);
    return contextualURL(url);
  }

  let url = new URL(requestOptions.url, base);
  requestOptions.url = await contextualURL(url);
  return requestOptions;
}
/**
 * Gets single reference by id. Caches the result.
 * @param {String} refId
 * @param {Object} cache A map to store the resolved refs
 * @param {FhirClient} client The client instance
 * @returns {Promise<Object>} The resolved reference
 * @private
 */


function getRef(refId, cache, client) {
  let sub = cache[refId];

  if (!sub) {
    // Note that we set cache[refId] immediately! When the promise is settled
    // it will be updated. This is to avoid a ref being fetched twice because
    // some of these requests are executed in parallel.
    cache[refId] = client.request(refId).then(sub => {
      cache[refId] = sub;
      return sub;
    }, error => {
      delete cache[refId];
      throw error;
    });
    return cache[refId];
  }

  return sub;
}
/**
 * Resolves a reference in the given resource.
 * @param {Object} obj FHIR Resource
 */


function resolveRef(obj, path, graph, cache, client) {
  const node = Object(_lib__WEBPACK_IMPORTED_MODULE_0__["getPath"])(obj, path);

  if (node) {
    const isArray = Array.isArray(node);
    return Promise.all(Object(_lib__WEBPACK_IMPORTED_MODULE_0__["makeArray"])(node).map((item, i) => {
      const ref = item.reference;

      if (ref) {
        return getRef(ref, cache, client).then(sub => {
          if (graph) {
            if (isArray) {
              Object(_lib__WEBPACK_IMPORTED_MODULE_0__["setPath"])(obj, `${path}.${i}`, sub);
            } else {
              Object(_lib__WEBPACK_IMPORTED_MODULE_0__["setPath"])(obj, path, sub);
            }
          }
        }).catch(() => {
          /* ignore */
        });
      }
    }));
  }
}
/**
 * Given a resource and a list of ref paths - resolves them all
 * @param {Object} obj FHIR Resource
 * @param {Object} fhirOptions The fhir options of the initiating request call
 * @param {Object} cache A map to store fetched refs
 * @param {FhirClient} client The client instance
 * @private
 */


function resolveRefs(obj, fhirOptions, cache, client) {
  // 1. Sanitize paths, remove any invalid ones
  let paths = Object(_lib__WEBPACK_IMPORTED_MODULE_0__["makeArray"])(fhirOptions.resolveReferences).filter(Boolean) // No false, 0, null, undefined or ""
  .map(path => String(path).trim()).filter(Boolean); // No space-only strings
  // 2. Remove duplicates

  paths = paths.filter((p, i) => {
    let index = paths.indexOf(p, i + 1);

    if (index > -1) {
      debug("Duplicated reference path \"%s\"", p);
      return false;
    }

    return true;
  }); // 3. Early exit if no valid paths are found

  if (!paths.length) {
    return Promise.resolve();
  } // 4. Group the paths by depth so that child refs are looked up
  // after their parents!


  const groups = {};
  paths.forEach(path => {
    const len = path.split(".").length;

    if (!groups[len]) {
      groups[len] = [];
    }

    groups[len].push(path);
  }); // 5. Execute groups sequentially! Paths within same group are
  // fetched in parallel!

  /**
   * @type any
   */

  let task = Promise.resolve();
  Object.keys(groups).sort().forEach(len => {
    const group = groups[len];
    task = task.then(() => Promise.all(group.map(path => {
      return resolveRef(obj, path, fhirOptions.graph, cache, client);
    })));
  });
  return task;
}
/**
 * @implements { fhirclient.Client }
 */


class FhirClient {
  /**
   * @param {object} environment
   * @param {fhirclient.ClientState|string} state
   */
  constructor(environment, state) {
    /**
     * @type fhirclient.ClientState
     */
    const _state = typeof state == "string" ? {
      serverUrl: state
    } : state; // Valid serverUrl is required!


    if (!_state.serverUrl || !_state.serverUrl.match(/https?:\/\/.+/)) {
      throw new Error("A \"serverUrl\" option is required and must begin with \"http(s)\"");
    }

    this.state = _state;
    this.environment = environment;
    const client = this; // patient api ---------------------------------------------------------

    this.patient = {
      get id() {
        return client.getPatientId();
      },

      read: () => {
        const id = this.patient.id;
        return id ? this.request(`Patient/${id}`) : Promise.reject(new Error("Patient is not available"));
      },
      request: (requestOptions, fhirOptions = {}) => {
        if (this.patient.id) {
          return (async () => {
            const options = await contextualize(requestOptions, this);
            return this.request(options, fhirOptions);
          })();
        } else {
          return Promise.reject(new Error("Patient is not available"));
        }
      }
    }; // encounter api -------------------------------------------------------

    this.encounter = {
      get id() {
        return client.getEncounterId();
      },

      read: () => {
        const id = this.encounter.id;
        return id ? this.request(`Encounter/${id}`) : Promise.reject(new Error("Encounter is not available"));
      }
    }; // user api ------------------------------------------------------------

    this.user = {
      get fhirUser() {
        return client.getFhirUser();
      },

      get id() {
        return client.getUserId();
      },

      get resourceType() {
        return client.getUserType();
      },

      read: () => {
        const fhirUser = this.user.fhirUser;
        return fhirUser ? this.request(fhirUser) : Promise.reject(new Error("User is not available"));
      }
    }; // fhir.js api (attached automatically in browser)
    // ---------------------------------------------------------------------

    if (environment.fhir) {
      this.connect(environment.fhir);
    }
  }

  connect(fhirJs) {
    if (typeof fhirJs == "function") {
      const options = {
        baseUrl: this.state.serverUrl.replace(/\/$/, "")
      };
      const accessToken = Object(_lib__WEBPACK_IMPORTED_MODULE_0__["getPath"])(this, "state.tokenResponse.access_token");

      if (accessToken) {
        options.auth = {
          token: accessToken
        };
      } else {
        const {
          username,
          password
        } = this.state;

        if (username && password) {
          options.auth = {
            user: username,
            pass: password
          };
        }
      }

      this.api = fhirJs(options);
      const patientId = Object(_lib__WEBPACK_IMPORTED_MODULE_0__["getPath"])(this, "state.tokenResponse.patient");

      if (patientId) {
        this.patient.api = fhirJs({ ...options,
          patient: patientId
        });
      }
    }
  }
  /**
   * Returns the ID of the selected patient or null. You should have requested
   * "launch/patient" scope. Otherwise this will return null.
   */


  getPatientId() {
    const tokenResponse = this.state.tokenResponse;

    if (tokenResponse) {
      // We have been authorized against this server but we don't know
      // the patient. This should be a scope issue.
      if (!tokenResponse.patient) {
        if (!(this.state.scope || "").match(/\blaunch(\/patient)?\b/)) {
          debug(_strings__WEBPACK_IMPORTED_MODULE_1__["default"].noScopeForId, "patient", "patient");
        } else {
          // The server should have returned the patient!
          debug("The ID of the selected patient is not available. Please check if your server supports that.");
        }

        return null;
      }

      return tokenResponse.patient;
    }

    if (this.state.authorizeUri) {
      debug(_strings__WEBPACK_IMPORTED_MODULE_1__["default"].noIfNoAuth, "the ID of the selected patient");
    } else {
      debug(_strings__WEBPACK_IMPORTED_MODULE_1__["default"].noFreeContext, "selected patient");
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
      // We have been authorized against this server but we don't know
      // the encounter. This should be a scope issue.
      if (!tokenResponse.encounter) {
        if (!(this.state.scope || "").match(/\blaunch(\/encounter)?\b/)) {
          debug(_strings__WEBPACK_IMPORTED_MODULE_1__["default"].noScopeForId, "encounter", "encounter");
        } else {
          // The server should have returned the encounter!
          debug("The ID of the selected encounter is not available. Please check if your server supports that, and that the selected patient has any recorded encounters.");
        }

        return null;
      }

      return tokenResponse.encounter;
    }

    if (this.state.authorizeUri) {
      debug(_strings__WEBPACK_IMPORTED_MODULE_1__["default"].noIfNoAuth, "the ID of the selected encounter");
    } else {
      debug(_strings__WEBPACK_IMPORTED_MODULE_1__["default"].noFreeContext, "selected encounter");
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
      const scope = this.state.scope || ""; // We have been authorized against this server but we don't have
      // the id_token. This should be a scope issue.

      if (!idToken) {
        const hasOpenid = scope.match(/\bopenid\b/);
        const hasProfile = scope.match(/\bprofile\b/);
        const hasFhirUser = scope.match(/\bfhirUser\b/);

        if (!hasOpenid || !(hasFhirUser || hasProfile)) {
          debug("You are trying to get the id_token but you are not using the right scopes. Please add 'openid' and 'fhirUser' or 'profile' to the scopes you are requesting.");
        } else {
          // The server should have returned the id_token!
          debug("The id_token is not available. Please check if your server supports that.");
        }

        return null;
      }

      return Object(_lib__WEBPACK_IMPORTED_MODULE_0__["jwtDecode"])(idToken);
    }

    if (this.state.authorizeUri) {
      debug(_strings__WEBPACK_IMPORTED_MODULE_1__["default"].noIfNoAuth, "the id_token");
    } else {
      debug(_strings__WEBPACK_IMPORTED_MODULE_1__["default"].noFreeContext, "id_token");
    }

    return null;
  }
  /**
   * Returns the profile of the logged_in user (if any). This is a string
   * having the following shape "{user type}/{user id}". For example:
   * "Practitioner/abc" or "Patient/xyz".
   */


  getFhirUser() {
    const idToken = this.getIdToken();

    if (idToken) {
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

  getAuthorizationHeader() {
    const accessToken = Object(_lib__WEBPACK_IMPORTED_MODULE_0__["getPath"])(this, "state.tokenResponse.access_token");

    if (accessToken) {
      return "Bearer " + accessToken;
    }

    const {
      username,
      password
    } = this.state;

    if (username && password) {
      return "Basic " + Object(_lib__WEBPACK_IMPORTED_MODULE_0__["btoa"])(username + ":" + password);
    }

    return null;
  }

  async _clearState() {
    const storage = this.environment.getStorage();
    const key = await storage.get(_settings__WEBPACK_IMPORTED_MODULE_3__["SMART_KEY"]);

    if (key) {
      await storage.unset(key);
    }

    await storage.unset(_settings__WEBPACK_IMPORTED_MODULE_3__["SMART_KEY"]);
    this.state.tokenResponse = {};
  }
  /**
   * @param {Object} resource A FHIR resource to be created
   */


  create(resource) {
    return this.request({
      url: `${resource.resourceType}`,
      method: "POST",
      body: JSON.stringify(resource),
      headers: {
        "Content-Type": "application/fhir+json"
      }
    });
  }
  /**
   * @param {Object} resource A FHIR resource to be updated
   */


  update(resource) {
    return this.request({
      url: `${resource.resourceType}/${resource.id}`,
      method: "PUT",
      body: JSON.stringify(resource),
      headers: {
        "Content-Type": "application/fhir+json"
      }
    });
  }
  /**
   * @param {String} url Relative URI of the FHIR resource to be deleted
   * (format: `resourceType/id`)
   */


  delete(url) {
    return this.request({
      url,
      method: "DELETE"
    });
  }
  /**
   * @param {Object|String} requestOptions Can be a string URL (relative to
   *  the serviceUrl), or an object which will be passed to fetch()
   * @param {fhirclient.FhirOptions} fhirOptions Additional options to control the behavior
   * @param {object} _resolvedRefs DO NOT USE! Used internally.
   */


  async request(requestOptions, fhirOptions = {}, _resolvedRefs = {}) {
    const debug = _lib__WEBPACK_IMPORTED_MODULE_0__["debug"].extend("client:request");

    if (!requestOptions) {
      throw new Error("request requires an url or request options as argument");
    } // url -----------------------------------------------------------------


    let url;

    if (typeof requestOptions == "string" || requestOptions instanceof URL) {
      url = String(requestOptions);
      requestOptions = {};
    } else {
      url = String(requestOptions.url);
    }

    url = Object(_lib__WEBPACK_IMPORTED_MODULE_0__["absolute"])(url, this.state.serverUrl); // authentication ------------------------------------------------------

    const authHeader = this.getAuthorizationHeader();

    if (authHeader) {
      requestOptions.headers = { ...requestOptions.headers,
        Authorization: authHeader
      };
    } // fhirOptions.graph ---------------------------------------------------


    fhirOptions.graph = fhirOptions.graph !== false; // fhirOptions.flat ----------------------------------------------------

    fhirOptions.flat = !!fhirOptions.flat; // fhirOptions.pageLimit -----------------------------------------------

    if (!fhirOptions.pageLimit && fhirOptions.pageLimit !== 0) {
      fhirOptions.pageLimit = 1;
    }

    const hasPageCallback = typeof fhirOptions.onPage == "function";
    debug("%s, options: %O, fhirOptions: %O", url, requestOptions, fhirOptions);
    return Object(_lib__WEBPACK_IMPORTED_MODULE_0__["request"])(url, requestOptions) // Automatic re-auth via refresh token -----------------------------
    .catch(error => {
      debug("%o", error);

      if (error.status == 401 && fhirOptions.useRefreshToken !== false) {
        const hasRefreshToken = Object(_lib__WEBPACK_IMPORTED_MODULE_0__["getPath"])(this, "state.tokenResponse.refresh_token");

        if (hasRefreshToken) {
          return this.refresh().then(() => this.request({ ...requestOptions,
            url
          }, fhirOptions, _resolvedRefs));
        }
      }

      throw error;
    }) // Handle 401 ------------------------------------------------------
    .catch(async error => {
      if (error.status == 401) {
        // !accessToken -> not authorized -> No session. Need to launch.
        if (!Object(_lib__WEBPACK_IMPORTED_MODULE_0__["getPath"])(this, "state.tokenResponse.access_token")) {
          throw new Error("This app cannot be accessed directly. Please launch it as SMART app!");
        } // !fhirOptions.useRefreshToken -> auto-refresh not enabled
        // Session expired. Need to re-launch. Clear state to
        // start over!


        if (fhirOptions.useRefreshToken === false) {
          debug("Your session has expired and the useRefreshToken option is set to false. Please re-launch the app.");
          await this._clearState();
          throw new Error(_strings__WEBPACK_IMPORTED_MODULE_1__["default"].expired);
        } // otherwise -> auto-refresh failed. Session expired.
        // Need to re-launch. Clear state to start over!


        debug("Auto-refresh failed! Please re-launch the app.");
        await this._clearState();
        throw new Error(_strings__WEBPACK_IMPORTED_MODULE_1__["default"].expired);
      }

      throw error;
    }) // Handle 403 ------------------------------------------------------
    .catch(error => {
      if (error.status == 403) {
        debug("Permission denied! Please make sure that you have requested the proper scopes.");
      }

      throw error;
    }) // Handle raw requests (anything other than json) ------------------
    .then(data => {
      if (!data) return data;
      if (typeof data == "string") return data;
      if (typeof data == "object" && data instanceof Response) return data; // Resolve References ----------------------------------------------

      return (async data => {
        if (data) {
          if (data.resourceType == "Bundle") {
            await Promise.all((data.entry || []).map(item => resolveRefs(item.resource, fhirOptions, _resolvedRefs, this)));
          } else {
            await resolveRefs(data, fhirOptions, _resolvedRefs, this);
          }
        }

        return data;
      })(data) // Pagination ------------------------------------------------------
      .then(async data => {
        if (data && data.resourceType == "Bundle") {
          const links = data.link || [];

          if (fhirOptions.flat) {
            data = (data.entry || []).map(entry => entry.resource);
          }

          if (hasPageCallback) {
            await fhirOptions.onPage(data, { ..._resolvedRefs
            });
          }

          if (--fhirOptions.pageLimit) {
            const next = links.find(l => l.relation == "next");
            data = Object(_lib__WEBPACK_IMPORTED_MODULE_0__["makeArray"])(data);

            if (next && next.url) {
              const nextPage = await this.request(next.url, fhirOptions, _resolvedRefs);

              if (hasPageCallback) {
                return null;
              }

              if (fhirOptions.resolveReferences && fhirOptions.resolveReferences.length) {
                Object.assign(_resolvedRefs, nextPage.references);
                return data.concat(Object(_lib__WEBPACK_IMPORTED_MODULE_0__["makeArray"])(nextPage.data || nextPage));
              }

              return data.concat(Object(_lib__WEBPACK_IMPORTED_MODULE_0__["makeArray"])(nextPage));
            }
          }
        }

        return data;
      }) // Finalize --------------------------------------------------------
      .then(data => {
        if (fhirOptions.graph) {
          _resolvedRefs = {};
        } else if (!hasPageCallback && fhirOptions.resolveReferences.length) {
          return {
            data,
            references: _resolvedRefs
          };
        }

        return data;
      });
    });
  }
  /**
   * Use the refresh token to obtain new access token. If the refresh token is
   * expired (or this fails for any other reason) it will be deleted from the
   * state, so that we don't enter into loops trying to re-authorize.
   */


  refresh() {
    const debug = _lib__WEBPACK_IMPORTED_MODULE_0__["debug"].extend("client:refresh");

    debug("Attempting to refresh with refresh_token...");
    const refreshToken = Object(_lib__WEBPACK_IMPORTED_MODULE_0__["getPath"])(this, "state.tokenResponse.refresh_token");

    if (!refreshToken) {
      throw new Error("Unable to refresh. No refresh_token found.");
    }

    const tokenUri = this.state.tokenUri;

    if (!tokenUri) {
      throw new Error("Unable to refresh. No tokenUri found.");
    }

    const scopes = Object(_lib__WEBPACK_IMPORTED_MODULE_0__["getPath"])(this, "state.tokenResponse.scope") || "";

    if (scopes.indexOf("offline_access") == -1 && scopes.indexOf("online_access") == -1) {
      throw new Error("Unable to refresh. No offline_access or online_access scope found.");
    } // This method is typically called internally from `request` if certain
    // request fails with 401. However, clients will often run multiple
    // requests in parallel which may result in multiple refresh calls.
    // To avoid that, we keep a to the current refresh task (if any).


    if (!this._refreshTask) {
      this._refreshTask = Object(_lib__WEBPACK_IMPORTED_MODULE_0__["request"])(tokenUri, {
        mode: "cors",
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded"
        },
        body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(refreshToken)}`,
        credentials: "include"
      }).then(data => {
        if (!data.access_token) {
          throw new Error("No access token received");
        }

        return data;
      }).then(data => {
        debug("Received new access token %O", data);
        Object.assign(this.state.tokenResponse, data);
        return this.state;
      }).catch(error => {
        debug("Deleting the expired or invalid refresh token.");
        delete this.state.tokenResponse.refresh_token;
        throw error;
      }).finally(() => {
        this._refreshTask = null;
        this.environment.getStorage().set(this.state.key, this.state);
      });
    }

    return this._refreshTask;
  } // utils -------------------------------------------------------------------

  /**
   * @param {object|object[]} observations
   * @param {string} property
   */


  byCode(observations, property) {
    return Object(_lib__WEBPACK_IMPORTED_MODULE_0__["byCode"])(observations, property);
  }
  /**
   * @param {object|object[]} observations
   * @param {string} property
   * @returns {(codes: string[]) => object[]}
   */


  byCodes(observations, property) {
    return Object(_lib__WEBPACK_IMPORTED_MODULE_0__["byCodes"])(observations, property);
  }

  get units() {
    return _lib__WEBPACK_IMPORTED_MODULE_0__["units"];
  }

  getPath(object, path) {
    return Object(_lib__WEBPACK_IMPORTED_MODULE_0__["getPath"])(object, path);
  }
  /**
   * Returns a promise that will be resolved with the fhir version as defined
   * in the conformance statement.
   */


  getFhirVersion() {
    return Object(_smart__WEBPACK_IMPORTED_MODULE_2__["fetchFhirVersion"])(this.state.serverUrl);
  }
  /**
   * Returns a promise that will be resolved with the numeric fhir version
   * - 2 for DSTU2
   * - 3 for STU3
   * - 4 for R4
   * - 0 if the version is not known
   */


  getFhirRelease() {
    return this.getFhirVersion().then(v => _settings__WEBPACK_IMPORTED_MODULE_3__["fhirVersions"][v || ""] || 0);
  }

}

/***/ }),

/***/ "./src/HttpError.js":
/*!**************************!*\
  !*** ./src/HttpError.js ***!
  \**************************/
/*! exports used: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "default", function() { return HttpError; });
class HttpError extends Error {
  constructor(message, statusCode, statusText) {
    super(message);
    this.message = message;
    this.name = "HttpError";
    this.statusCode = statusCode;
    this.status = statusCode;
    this.statusText = statusText;
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

  static create(failure) {
    // start with generic values
    var status = 0;
    var statusText = "Error";
    var message = "Unknown error";

    if (failure) {
      if (typeof failure == "object") {
        if (failure instanceof Error) {
          message = failure.message;
        } else if (failure.error) {
          status = failure.error.status || 0;
          statusText = failure.error.statusText || "Error";

          if (failure.error.responseText) {
            message = failure.error.responseText;
          }
        }
      } else if (typeof failure == "string") {
        message = failure;
      }
    }

    return new HttpError(message, status, statusText);
  }

}

/***/ }),

/***/ "./src/adapters/BaseAdapter.js":
/*!*************************************!*\
  !*** ./src/adapters/BaseAdapter.js ***!
  \*************************************/
/*! exports used: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "default", function() { return BaseAdapter; });
/* harmony import */ var _smart__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../smart */ "./src/smart.js");
/* harmony import */ var _Client__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../Client */ "./src/Client.js");


/**
 * This is the abstract base class that adapters must inherit. It just a
 * collection of environment-specific methods that subclasses have to implement.
 * @type { fhirclient.Adapter }
 */

class BaseAdapter {
  /**
   * @param {Object} options Environment-specific options
   */
  constructor(options = {}) {
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
      ...options
    };
  }

  getUrl() {
    return new URL("");
  }

  getStorage() {}
  /**
   * @param {String} path
   */


  relative(path) {
    return new URL(path, this.getUrl().href).href;
  }
  /**
   * Creates and returns adapter-aware SMART api. Not that while the shape of
   * the returned object is well known, the arguments to this function are not.
   * Those who override this method are free to require any environment-specific
   * arguments. For example in node we will need a request, a response and
   * optionally a storage or storage factory function.
   * @returns { fhirclient.SMART }
   */


  getSmartApi() {
    return {
      ready: (...args) => _smart__WEBPACK_IMPORTED_MODULE_0__["ready"](this, ...args),
      authorize: options => _smart__WEBPACK_IMPORTED_MODULE_0__["authorize"](this, options),
      init: (...args) => _smart__WEBPACK_IMPORTED_MODULE_0__["init"](this, ...args),
      client: state => new _Client__WEBPACK_IMPORTED_MODULE_1__["default"](this, state),
      options: this.options
    };
  }

}

/***/ }),

/***/ "./src/adapters/BrowserAdapter.js":
/*!****************************************!*\
  !*** ./src/adapters/BrowserAdapter.js ***!
  \****************************************/
/*! exports used: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* unused harmony export Adapter */
/* harmony import */ var _storage_BrowserStorage__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../storage/BrowserStorage */ "./src/storage/BrowserStorage.js");
/* harmony import */ var _BaseAdapter__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./BaseAdapter */ "./src/adapters/BaseAdapter.js");
/* eslint-env browser */

/* global fhir */


/**
 * Browser Adapter
 * @type {fhirclient.Adapter}
 */

class BrowserAdapter extends _BaseAdapter__WEBPACK_IMPORTED_MODULE_1__["default"] {
  /**
   * In browsers we need to be able to (dynamically) check if fhir.js is
   * included in the page. If it is, it should have created a "fhir" variable
   * in the global scope.
   */
  get fhir() {
    // @ts-ignore
    return typeof fhir === "function" ? fhir : null;
  }
  /**
   * Given the current environment, this method must return the current url
   * as URL instance
   * @returns {URL}
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
   * @param {String} to The path to redirect to
   * @returns {void}
   */


  redirect(to) {
    location.href = to;
  }
  /**
   * Returns a BrowserStorage object which is just a wrapper around
   * sessionStorage
   * @returns {BrowserStorage}
   */


  getStorage() {
    if (!this._storage) {
      this._storage = new _storage_BrowserStorage__WEBPACK_IMPORTED_MODULE_0__["default"]();
    }

    return this._storage;
  }

  static smart(options) {
    return new BrowserAdapter(options).getSmartApi();
  }

}

/* harmony default export */ __webpack_exports__["default"] = (BrowserAdapter.smart);


/***/ }),

/***/ "./src/browser.js":
/*!************************!*\
  !*** ./src/browser.js ***!
  \************************/
/*! all exports used */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "client", function() { return client; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "oauth2", function() { return oauth2; });
/* harmony import */ var _adapters_BrowserAdapter__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./adapters/BrowserAdapter */ "./src/adapters/BrowserAdapter.js");
/* eslint-env browser */
// In Browsers we create an adapter, get the SMART api from it and build the
// global FHIR object

const {
  ready,
  authorize,
  init,
  client,
  options
} = Object(_adapters_BrowserAdapter__WEBPACK_IMPORTED_MODULE_0__["default"])(); // We have two kinds of browser builds - "pure" for new browsers and "legacy"
// for old ones. In pure builds we assume that the browser supports everything
// we need. In legacy mode, the library also acts as a polyfill. Babel will
// automatically polyfill everything except "fetch", which we have to handle
// manually.
// @ts-ignore
// eslint-disable-next-line no-undef

if (false) {} // $lab:coverage:off$



const oauth2 = {
  settings: options,
  ready,
  authorize,
  init
}; // $lab:coverage:on$

/***/ }),

/***/ "./src/lib.js":
/*!********************!*\
  !*** ./src/lib.js ***!
  \********************/
/*! exports used: absolute, btoa, byCode, byCodes, debug, getAndCache, getPath, getPatientParam, isBrowser, jwtDecode, makeArray, randomString, request, setPath, units */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* WEBPACK VAR INJECTION */(function(global) {/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "debug", function() { return _debug; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "isBrowser", function() { return isBrowser; });
/* unused harmony export checkResponse */
/* unused harmony export responseToJSON */
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "request", function() { return request; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "getAndCache", function() { return getAndCache; });
/* unused harmony export humanizeError */
/* unused harmony export stripTrailingSlash */
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "getPath", function() { return getPath; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "setPath", function() { return setPath; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "makeArray", function() { return makeArray; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "absolute", function() { return absolute; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "randomString", function() { return randomString; });
/* unused harmony export atob */
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "btoa", function() { return btoa; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "jwtDecode", function() { return jwtDecode; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "byCode", function() { return byCode; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "byCodes", function() { return byCodes; });
/* unused harmony export ensureNumerical */
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "units", function() { return units; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "getPatientParam", function() { return getPatientParam; });
/* harmony import */ var _HttpError__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./HttpError */ "./src/HttpError.js");
/* harmony import */ var _settings__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./settings */ "./src/settings.js");
/* harmony import */ var debug__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! debug */ "./node_modules/debug/src/browser.js");
/* harmony import */ var debug__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(debug__WEBPACK_IMPORTED_MODULE_2__);
/*
 * This file contains some shared functions. The are used by other modules, but
 * are defined here so that tests can import this library and test them.
 */


 // @ts-ignore
// eslint-disable-next-line no-undef

const {
  fetch
} =  true ? window : undefined;

const _debug = debug__WEBPACK_IMPORTED_MODULE_2___default()("FHIR");


function isBrowser() {
  return typeof window === "object";
}
/**
 * Used in fetch Promise chains to reject if the "ok" property is not true
 */

async function checkResponse(resp) {
  if (!resp.ok) {
    throw await humanizeError(resp);
  }

  return resp;
}
/**
 * Used in fetch Promise chains to return the JSON version of the response.
 * Note that `resp.json()` will throw on empty body so we use resp.text()
 * instead.
 * @param {Response} resp
 * @returns {Promise<object|string>}
 */

function responseToJSON(resp) {
  return resp.text().then(text => text.length ? JSON.parse(text) : "");
}
/**
 * This is our built-in request function. It does a few things by default
 * (unless told otherwise):
 * - Makes CORS requests
 * - Sets accept header to "application/json"
 * - Handles errors
 * - If the response is json return the json object
 * - If the response is text return the result text
 * - Otherwise return the response object on which we call stuff like `.blob()`
 * @param {String|Request} url
 * @param {Object} options
 */

function request(url, options = {}) {
  return fetch(url, {
    mode: "cors",
    ...options,
    headers: {
      accept: "application/json",
      ...options.headers
    }
  }).then(checkResponse).then(res => {
    const type = res.headers.get("Content-Type") + "";

    if (type.match(/\bjson\b/i)) {
      return responseToJSON(res);
    }

    if (type.match(/^text\//i)) {
      return res.text();
    }

    return res;
  });
}
const getAndCache = (() => {
  let cache = {};
  return (url, force = "development" === "test") => {
    if (force || !cache[url]) {
      cache[url] = request(url);
    }

    return cache[url];
  };
})();
async function humanizeError(resp) {
  let msg = `${resp.status} ${resp.statusText}\nURL: ${resp.url}`;

  try {
    const type = resp.headers.get("Content-Type") || "text/plain";

    if (type.match(/\bjson\b/i)) {
      const json = await resp.json();

      if (json.error) {
        msg += "\n" + json.error;

        if (json.error_description) {
          msg += ": " + json.error_description;
        }
      } else {
        msg += "\n\n" + JSON.stringify(json, null, 4);
      }
    }

    if (type.match(/^text\//i)) {
      const text = await resp.text();

      if (text) {
        msg += "\n\n" + text;
      }
    }
  } catch (_) {// ignore
  }

  throw new _HttpError__WEBPACK_IMPORTED_MODULE_0__["default"](msg, resp.status, resp.statusText);
}
function stripTrailingSlash(str) {
  return String(str || "").replace(/\/+$/, "");
}
/**
 * Walks through an object (or array) and returns the value found at the
 * provided path. This function is very simple so it intentionally does not
 * support any argument polymorphism, meaning that the path can only be a
 * dot-separated string. If the path is invalid returns undefined.
 * @param {Object} obj The object (or Array) to walk through
 * @param {String} path The path (eg. "a.b.4.c")
 * @returns {*} Whatever is found in the path or undefined
 */

function getPath(obj, path = "") {
  path = path.trim();

  if (!path) {
    return obj;
  }

  return path.split(".").reduce((out, key) => out ? out[key] : undefined, obj);
}
/**
 * Like getPath, but if the node is found, its value is set to @value
 * @param {Object} obj The object (or Array) to walk through
 * @param {String} path The path (eg. "a.b.4.c")
 * @param {*} value The value to set
 * @returns {Object} The modified object
 */

function setPath(obj, path, value) {
  path.trim().split(".").reduce((out, key, idx, arr) => {
    if (out && idx === arr.length - 1) {
      out[key] = value;
    } else {
      return out ? out[key] : undefined;
    }
  }, obj);
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
  return baseUrl.replace(/\/+$/, "") + "/" + path.replace(/^\/+/, "");
}
/**
 * Generates random strings. By default this returns random 8 characters long
 * alphanumeric strings.
 * @param {Number} strLength The length of the output string. Defaults to 8.
 * @param {String} charSet A string containing all the possible characters.
 *     Defaults to all the upper and lower-case letters plus digits.
 */

function randomString(strLength = 8, charSet = null) {
  const result = [];
  charSet = charSet || "ABCDEFGHIJKLMNOPQRSTUVWXYZ" + "abcdefghijklmnopqrstuvwxyz" + "0123456789";
  const len = charSet.length;

  while (strLength--) {
    result.push(charSet.charAt(Math.floor(Math.random() * len)));
  }

  return result.join("");
}
function atob(str) {
  if (isBrowser()) {
    // eslint-disable-next-line no-undef
    return window.atob(str);
  } // The "global." makes Webpack understand that it doesn't have to include
  // the Buffer code in the bundle


  return global.Buffer.from(str, "base64").toString("ascii");
}
function btoa(str) {
  if (isBrowser()) {
    // eslint-disable-next-line no-undef
    return window.btoa(str);
  } // The "global." makes Webpack understand that it doesn't have to include
  // the Buffer code in the bundle


  return global.Buffer.from(str).toString("base64");
}
function jwtDecode(token) {
  const payload = token.split(".")[1];
  return JSON.parse(atob(payload));
}
/**
 * Groups the observations by code. Returns a map that will look like:
 * {
 *   "55284-4": [ observation1, observation2 ],
 *   "6082-2" : [ observation3 ]
 * }
 * @param {Object|Object[]} observations Array of observations
 * @param {String} property The name of a CodeableConcept property to group by
 * @returns {Object}
 */

function byCode(observations, property) {
  const ret = {};

  function handleCodeableConcept(concept, observation) {
    if (concept && Array.isArray(concept.coding)) {
      concept.coding.forEach(({
        code
      }) => {
        ret[code] = ret[code] || [];
        ret[code].push(observation);
      });
    }
  }

  makeArray(observations).forEach(o => {
    if (o.resourceType === "Observation" && o[property]) {
      if (Array.isArray(o[property])) {
        o[property].forEach(concept => handleCodeableConcept(concept, o));
      } else {
        handleCodeableConcept(o[property], o);
      }
    }
  });
  return ret;
}
/**
 * First groups the observations by code using `byCode`. Then returns a function
 * that accepts codes as arguments and will return a flat array of observations
 * having that codes
 * @param {Object|Object[]} observations Array of observations
 * @param {String} property The name of a CodeableConcept property to group by
 * @returns {(codes: string[]) => object[]}
 */

function byCodes(observations, property) {
  const bank = byCode(observations, property);
  return (...codes) => codes.filter(code => code + "" in bank).reduce((prev, code) => [...prev, ...bank[code + ""]], []);
}
function ensureNumerical({
  value,
  code
}) {
  if (typeof value !== "number") {
    throw new Error("Found a non-numerical unit: " + value + " " + code);
  }
}
const units = {
  cm({
    code,
    value
  }) {
    ensureNumerical({
      code,
      value
    });
    if (code == "cm") return value;
    if (code == "m") return value * 100;
    if (code == "in") return value * 2.54;
    if (code == "[in_us]") return value * 2.54;
    if (code == "[in_i]") return value * 2.54;
    if (code == "ft") return value * 30.48;
    if (code == "[ft_us]") return value * 30.48;
    throw new Error("Unrecognized length unit: " + code);
  },

  kg({
    code,
    value
  }) {
    ensureNumerical({
      code,
      value
    });
    if (code == "kg") return value;
    if (code == "g") return value / 1000;
    if (code.match(/lb/)) return value / 2.20462;
    if (code.match(/oz/)) return value / 35.274;
    throw new Error("Unrecognized weight unit: " + code);
  },

  any(pq) {
    ensureNumerical(pq);
    return pq.value;
  }

};
/**
 * Given a conformance statement and a resource type, returns the name of the
 * URL parameter that can be used to scope the resource type by patient ID.
 * @param {fhirclient.JsonObject} conformance
 * @param {string} resourceType
 */

function getPatientParam(conformance, resourceType) {
  // Find what resources are supported by this server
  const resources = getPath(conformance, "rest.0.resource") || []; // Check if this resource is supported

  const meta = resources.find(r => r.type === resourceType);
  if (!meta) throw new Error("Resource not supported"); // Check if any search parameters are available for this resource

  if (!Array.isArray(meta.searchParam)) throw new Error(`No search parameters supported for "${resourceType}" on this FHIR server`); // This is a rare case vut could happen in generic workflows

  if (resourceType == "Patient" && meta.searchParam.find(x => x.name == "_id")) return "_id"; // Now find the first possible parameter name

  let out = _settings__WEBPACK_IMPORTED_MODULE_1__["patientParams"].find(p => meta.searchParam.find(x => x.name == p)); // If there is no match

  if (!out) throw new Error("I don't know what param to use for " + resourceType);
  return out;
}
/* WEBPACK VAR INJECTION */}.call(this, __webpack_require__(/*! ./../node_modules/webpack/buildin/global.js */ "./node_modules/webpack/buildin/global.js")))

/***/ }),

/***/ "./src/settings.js":
/*!*************************!*\
  !*** ./src/settings.js ***!
  \*************************/
/*! exports used: SMART_KEY, fhirVersions, patientCompartment, patientParams */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "patientCompartment", function() { return patientCompartment; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "fhirVersions", function() { return fhirVersions; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "patientParams", function() { return patientParams; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "SMART_KEY", function() { return SMART_KEY; });
/**
 * Combined list of FHIR resource types accepting patient parameter in FHIR R2-R4
 */
const patientCompartment = ["Account", "AdverseEvent", "AllergyIntolerance", "Appointment", "AppointmentResponse", "AuditEvent", "Basic", "BodySite", "BodyStructure", "CarePlan", "CareTeam", "ChargeItem", "Claim", "ClaimResponse", "ClinicalImpression", "Communication", "CommunicationRequest", "Composition", "Condition", "Consent", "Coverage", "CoverageEligibilityRequest", "CoverageEligibilityResponse", "DetectedIssue", "DeviceRequest", "DeviceUseRequest", "DeviceUseStatement", "DiagnosticOrder", "DiagnosticReport", "DocumentManifest", "DocumentReference", "EligibilityRequest", "Encounter", "EnrollmentRequest", "EpisodeOfCare", "ExplanationOfBenefit", "FamilyMemberHistory", "Flag", "Goal", "Group", "ImagingManifest", "ImagingObjectSelection", "ImagingStudy", "Immunization", "ImmunizationEvaluation", "ImmunizationRecommendation", "Invoice", "List", "MeasureReport", "Media", "MedicationAdministration", "MedicationDispense", "MedicationOrder", "MedicationRequest", "MedicationStatement", "MolecularSequence", "NutritionOrder", "Observation", "Order", "Patient", "Person", "Procedure", "ProcedureRequest", "Provenance", "QuestionnaireResponse", "ReferralRequest", "RelatedPerson", "RequestGroup", "ResearchSubject", "RiskAssessment", "Schedule", "ServiceRequest", "Specimen", "SupplyDelivery", "SupplyRequest", "VisionPrescription"];
/**
 * Map of FHIR releases and their abstract version as number
 */

const fhirVersions = {
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
  "4.0.0": 4
};
/**
 * Combined (FHIR R2-R4) list of search parameters that can be used to scope
 * a request by patient ID.
 */

const patientParams = ["requester", "patient", "subject", "member", "actor", "beneficiary"];
/**
 * The name of the sessionStorage entry that contains the current key
 */

const SMART_KEY = "SMART_KEY";

/***/ }),

/***/ "./src/smart.js":
/*!**********************!*\
  !*** ./src/smart.js ***!
  \**********************/
/*! exports used: authorize, fetchConformanceStatement, fetchFhirVersion, init, ready */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "fetchConformanceStatement", function() { return fetchConformanceStatement; });
/* unused harmony export fetchWellKnownJson */
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "fetchFhirVersion", function() { return fetchFhirVersion; });
/* unused harmony export getSecurityExtensions */
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "authorize", function() { return authorize; });
/* unused harmony export completeAuth */
/* unused harmony export buildTokenRequest */
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "ready", function() { return ready; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "init", function() { return init; });
/* harmony import */ var _lib__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./lib */ "./src/lib.js");
/* harmony import */ var _Client__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./Client */ "./src/Client.js");
/* harmony import */ var _settings__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./settings */ "./src/settings.js");
/* global window */




const debug = _lib__WEBPACK_IMPORTED_MODULE_0__["debug"].extend("oauth2");


/**
 * Fetches the conformance statement from the given base URL.
 * Note that the result is cached in memory (until the page is reloaded in the
 * browser) because it might have to be re-used by the client
 * @param {String} baseUrl The base URL of the FHIR server
 * @returns {Promise<fhirclient.JsonObject>}
 */

function fetchConformanceStatement(baseUrl = "/") {
  const url = String(baseUrl).replace(/\/*$/, "/") + "metadata";
  return Object(_lib__WEBPACK_IMPORTED_MODULE_0__["getAndCache"])(url).catch(ex => {
    throw new Error(`Failed to fetch the conformance statement from "${url}". ${ex}`);
  });
}
function fetchWellKnownJson(baseUrl = "/") {
  const url = String(baseUrl).replace(/\/*$/, "/") + ".well-known/smart-configuration";
  return Object(_lib__WEBPACK_IMPORTED_MODULE_0__["getAndCache"])(url).catch(ex => {
    throw new Error(`Failed to fetch the well-known json "${url}". ${ex.message}`);
  });
}
function fetchFhirVersion(baseUrl = "/") {
  return fetchConformanceStatement(baseUrl).then(metadata => metadata.fhirVersion);
}
/**
 * Given a fhir server returns an object with it's Oauth security endpoints that
 * we are interested in
 * @param {String} baseUrl Fhir server base URL
 * @returns { Promise<fhirclient.OAuthSecurityExtensions> }
 */

function getSecurityExtensions(baseUrl = "/") {
  return fetchWellKnownJson(baseUrl).then(meta => {
    if (!meta.authorization_endpoint || !meta.token_endpoint) {
      throw new Error("Invalid wellKnownJson");
    }

    return {
      registrationUri: meta.registration_endpoint || "",
      authorizeUri: meta.authorization_endpoint,
      tokenUri: meta.token_endpoint
    };
  }).catch(() => fetchConformanceStatement(baseUrl).then(metadata => {
    const nsUri = "http://fhir-registry.smarthealthit.org/StructureDefinition/oauth-uris";
    const extensions = (Object(_lib__WEBPACK_IMPORTED_MODULE_0__["getPath"])(metadata || {}, "rest.0.security.extension") || []).filter(e => e.url === nsUri).map(o => o.extension)[0];
    const out = {
      registrationUri: "",
      authorizeUri: "",
      tokenUri: ""
    };

    if (extensions) {
      extensions.forEach(ext => {
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
  }));
}
/**
 * @param {Object} env
 * @param {fhirclient.AuthorizeParams} params
 * @param {Boolean} [_noRedirect = false] If true, resolve with the redirect url
 * without trying to redirect to it
 * @returns { Promise<never|string> }
 */

async function authorize(env, params = {}, _noRedirect = false) {
  // Obtain input
  let {
    iss,
    launch,
    fhirServiceUrl,
    redirect_uri,
    redirectUri,
    scope = "",
    clientSecret,
    fakeTokenResponse,
    patientId,
    encounterId,
    client_id,
    clientId
  } = params;
  const url = env.getUrl();
  const storage = env.getStorage(); // For these three an url param takes precedence over inline option

  iss = url.searchParams.get("iss") || iss;
  fhirServiceUrl = url.searchParams.get("fhirServiceUrl") || fhirServiceUrl;
  launch = url.searchParams.get("launch") || launch;

  if (!clientId) {
    clientId = client_id;
  }

  if (!redirectUri) {
    redirectUri = redirect_uri;
  }

  if (!redirectUri) {
    redirectUri = env.relative(".");
  } else {
    redirectUri = env.relative(redirectUri);
  }

  const serverUrl = String(iss || fhirServiceUrl || ""); // Validate input

  if (!serverUrl) {
    throw new Error("No server url found. It must be specified as `iss` or as " + "`fhirServiceUrl` parameter");
  }

  if (iss) {
    debug("Making %s launch...", launch ? "EHR" : "standalone");
  } // append launch scope if needed


  if (launch && !scope.match(/launch/)) {
    scope += " launch";
  } // prevent inheritance of tokenResponse from parent window


  await storage.unset(_settings__WEBPACK_IMPORTED_MODULE_2__["SMART_KEY"]); // create initial state

  const stateKey = Object(_lib__WEBPACK_IMPORTED_MODULE_0__["randomString"])(16);
  const state = {
    clientId,
    scope,
    redirectUri,
    serverUrl,
    clientSecret,
    tokenResponse: {},
    key: stateKey
  }; // fakeTokenResponse to override stuff (useful in development)

  if (fakeTokenResponse) {
    Object.assign(state.tokenResponse, fakeTokenResponse);
  } // Fixed patientId (useful in development)


  if (patientId) {
    Object.assign(state.tokenResponse, {
      patient: patientId
    });
  } // Fixed encounterId (useful in development)


  if (encounterId) {
    Object.assign(state.tokenResponse, {
      encounter: encounterId
    });
  }

  let redirectUrl = redirectUri + "?state=" + encodeURIComponent(stateKey); // bypass oauth if fhirServiceUrl is used (but iss takes precedence)

  if (fhirServiceUrl && !iss) {
    debug("Making fake launch..."); // Storage.set(stateKey, state);

    await storage.set(stateKey, state);

    if (_noRedirect) {
      return redirectUrl;
    }

    return await env.redirect(redirectUrl);
  } // Get oauth endpoints and add them to the state


  const extensions = await getSecurityExtensions(serverUrl);
  Object.assign(state, extensions);
  await storage.set(stateKey, state); // If this happens to be an open server and there is no authorizeUri

  if (!state.authorizeUri) {
    if (_noRedirect) {
      return redirectUrl;
    }

    return await env.redirect(redirectUrl);
  } // build the redirect uri


  const redirectParams = ["response_type=code", "client_id=" + encodeURIComponent(clientId), "scope=" + encodeURIComponent(scope), "redirect_uri=" + encodeURIComponent(redirectUri), "aud=" + encodeURIComponent(serverUrl), "state=" + encodeURIComponent(stateKey)]; // also pass this in case of EHR launch

  if (launch) {
    redirectParams.push("launch=" + encodeURIComponent(launch));
  }

  redirectUrl = state.authorizeUri + "?" + redirectParams.join("&");

  if (_noRedirect) {
    return redirectUrl;
  }

  return await env.redirect(redirectUrl);
}
/**
 * The completeAuth function should only be called on the page that represents
 * the redirectUri. We typically land there after a redirect from the
 * authorization server..
 * @returns { Promise<fhirclient.Client> }
 */

async function completeAuth(env) {
  const url = env.getUrl();
  const Storage = env.getStorage();
  const params = url.searchParams;
  let key = params.get("state");
  const code = params.get("code");
  const authError = params.get("error");
  const authErrorDescription = params.get("error_description");

  if (!key) {
    key = await Storage.get(_settings__WEBPACK_IMPORTED_MODULE_2__["SMART_KEY"]);
  } // Start by checking the url for `error` and `error_description` parameters.
  // This happens when the auth server rejects our authorization attempt. In
  // this case it has no other way to tell us what the error was, other than
  // appending these parameters to the redirect url.
  // From client's point of view, this is not very reliable (because we can't
  // know how we have landed on this page - was it a redirect or was it loaded
  // manually). However, if `completeAuth()` is being called, we can assume
  // that the url comes from the auth server (otherwise the app won't work
  // anyway).


  if (authError || authErrorDescription) {
    let msg = [authError, authErrorDescription].filter(Boolean).join(": ");
    throw new Error(msg);
  }

  debug("key: %s, code: %O", key, code); // key might be coming from the page url so it might be empty or missing

  if (!key) {
    throw new Error("No 'state' parameter found. Please (re)launch the app.");
  } // Check if we have a previous state


  let state = await Storage.get(key);
  const fullSessionStorageSupport = Object(_lib__WEBPACK_IMPORTED_MODULE_0__["isBrowser"])() ? Object(_lib__WEBPACK_IMPORTED_MODULE_0__["getPath"])(env, "options.fullSessionStorageSupport") : true; // Do we have to remove the `code` and `state` params from the URL?

  const hasState = params.has("state");

  if (Object(_lib__WEBPACK_IMPORTED_MODULE_0__["isBrowser"])() && Object(_lib__WEBPACK_IMPORTED_MODULE_0__["getPath"])(env, "options.replaceBrowserHistory") && (code || hasState)) {
    // `code` is the flag that tell us to request an access token.
    // We have to remove it, otherwise the page will authorize on
    // every load!
    if (code) {
      params.delete("code");
      debug("Removed code parameter from the url.");
    } // If we have `fullSessionStorageSupport` it means we no longer
    // need the `state` key. It will be stored to a well know
    // location - sessionStorage[SMART_KEY]. However, no
    // fullSessionStorageSupport means that this "well know location"
    // might be shared between windows and tabs. In this case we
    // MUST keep the `state` url parameter.


    if (hasState && fullSessionStorageSupport) {
      params.delete("state");
      debug("Removed state parameter from the url.");
    } // If the browser does not support the replaceState method for the
    // History Web API, the "code" parameter cannot be removed. As a
    // consequence, the page will (re)authorize on every load. The
    // workaround is to reload the page to new location without those
    // parameters. If that is not acceptable replaceBrowserHistory
    // should be set to false.


    if (window.history.replaceState) {
      window.history.replaceState({}, "", url.href);
    }
  } // If the state does not exist, it means the page has been loaded directly.


  if (!state) {
    throw new Error("No state found! Please (re)launch the app.");
  } // Assume the client has already completed a token exchange when
  // there is no code (but we have a state) or access token is found in state


  const authorized = !code || state.tokenResponse.access_token; // If we are authorized already, then this is just a reload.
  // Otherwise, we have to complete the code flow

  if (!authorized) {
    debug("Preparing to exchange the code for access token...");
    const requestOptions = await buildTokenRequest(code, state);
    debug("Token request options: %O", requestOptions); // The EHR authorization server SHALL return a JSON structure that
    // includes an access token or a message indicating that the
    // authorization request has been denied.

    let tokenResponse = await Object(_lib__WEBPACK_IMPORTED_MODULE_0__["request"])(state.tokenUri, requestOptions);
    debug("Token response: %O", tokenResponse);

    if (!tokenResponse.access_token) {
      throw new Error("Failed to obtain access token.");
    } // save the tokenResponse so that we don't have to re-authorize on
    // every page reload


    state = { ...state,
      tokenResponse
    };
    await Storage.set(key, state);
    debug("Authorization successful!");
  } else {
    debug(state.tokenResponse.access_token ? "Already authorized" : "No authorization needed");
  }

  if (fullSessionStorageSupport) {
    await Storage.set(_settings__WEBPACK_IMPORTED_MODULE_2__["SMART_KEY"], key);
  }

  const client = new _Client__WEBPACK_IMPORTED_MODULE_1__["default"](env, state);
  debug("Created client instance: %O", client);
  return client;
}
/**
 * Builds the token request options. Does not make the request, just
 * creates it's configuration and returns it in a Promise.
 */

function buildTokenRequest(code, state) {
  const {
    redirectUri,
    clientSecret,
    tokenUri,
    clientId
  } = state;

  if (!redirectUri) {
    throw new Error("Missing state.redirectUri");
  }

  if (!tokenUri) {
    throw new Error("Missing state.tokenUri");
  }

  if (!clientId) {
    throw new Error("Missing state.clientId");
  }

  const requestOptions = {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded"
    },
    body: `code=${code}&grant_type=authorization_code&redirect_uri=${encodeURIComponent(redirectUri)}`
  }; // For public apps, authentication is not possible (and thus not required),
  // since a client with no secret cannot prove its identity when it issues a
  // call. (The end-to-end system can still be secure because the client comes
  // from a known, https protected endpoint specified and enforced by the
  // redirect uri.) For confidential apps, an Authorization header using HTTP
  // Basic authentication is required, where the username is the app’s
  // client_id and the password is the app’s client_secret (see example).

  if (clientSecret) {
    requestOptions.headers.Authorization = "Basic " + Object(_lib__WEBPACK_IMPORTED_MODULE_0__["btoa"])(clientId + ":" + clientSecret);
    debug("Using state.clientSecret to construct the authorization header: %s", requestOptions.headers.Authorization);
  } else {
    debug("No clientSecret found in state. Adding the clientId to the POST body");
    requestOptions.body += `&client_id=${encodeURIComponent(clientId)}`;
  }

  return requestOptions;
}
/**
 * @param {Object} env
 * @param {() => Promise<fhirclient.Client>} [onSuccess]
 * @param {() => never} [onError]
 * @returns { Promise<fhirclient.Client> }
 */

async function ready(env, onSuccess, onError) {
  let task = completeAuth(env);

  if (onSuccess) {
    task = task.then(onSuccess);
  }

  if (onError) {
    task = task.catch(onError);
  }

  return task;
}
async function init(env, options) {
  const url = env.getUrl();
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state"); // if `code` and `state` params are present we need to complete the auth flow

  if (code && state) {
    return completeAuth(env);
  } // Check for existing client state. If state is found, it means a client
  // instance have already been created in this session and we should try to
  // "revive" it.


  const storage = env.getStorage();
  const key = state || (await storage.get(_settings__WEBPACK_IMPORTED_MODULE_2__["SMART_KEY"]));
  const cached = await storage.get(key);

  if (cached) {
    return new _Client__WEBPACK_IMPORTED_MODULE_1__["default"](env, cached);
  } // Otherwise try to launch


  return authorize(env, options).then(() => {
    // `init` promises a Client but that cannot happen in this case. The
    // browser will be redirected (unload the page and be redirected back
    // to it later and the same init function will be called again). On
    // success, authorize will resolve with the redirect url but we don't
    // want to return that from this promise chain because it is not a
    // Client instance. At the same time, if authorize fails, we do want to
    // pass the error to those waiting for a client instance.
    return new Promise(() => {
      /* leave it pending!!! */
    });
  });
}

/***/ }),

/***/ "./src/storage/BrowserStorage.js":
/*!***************************************!*\
  !*** ./src/storage/BrowserStorage.js ***!
  \***************************************/
/*! exports used: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "default", function() { return Storage; });
/* eslint-env browser */
class Storage {
  /**
   * Gets the value at `key`. Returns a promise that will be resolved
   * with that value (or undefined for missing keys).
   * @param {String} key
   * @returns {Promise<any>}
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
   * @param {String} key
   * @param {any} value
   * @returns {Promise<any>}
   */


  async set(key, value) {
    sessionStorage[key] = JSON.stringify(value);
    return value;
  }
  /**
   * Deletes the value at `key`. Returns a promise that will be resolved
   * with true if the key was deleted or with false if it was not (eg. if
   * did not exist).
   * @param {String} key
   * @returns {Promise<Boolean>}
   */


  async unset(key) {
    if (key in sessionStorage) {
      delete sessionStorage[key];
      return true;
    }

    return false;
  }

}

/***/ }),

/***/ "./src/strings.js":
/*!************************!*\
  !*** ./src/strings.js ***!
  \************************/
/*! exports used: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
// This map contains reusable debug messages (only those used in multiple places)
/* harmony default export */ __webpack_exports__["default"] = ({
  expired: "Session expired! Please re-launch the app",
  noScopeForId: "Trying to get the ID of the selected %s. Please add 'launch' or 'launch/%s' to the requested scopes and try again.",
  noIfNoAuth: "You are trying to get %s but the app is not authorized yet.",
  noFreeContext: "Please don't use open fhir servers if you need to access launch context items like the %S."
});

/***/ })

/******/ });
//# sourceMappingURL=fhir-client.pure.js.map