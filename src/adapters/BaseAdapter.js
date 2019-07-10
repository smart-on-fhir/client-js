const smart  = require("../smart");
const Client = require("../Client");

/**
 * This is the abstract base class that adapters must inherit. It just a
 * collection of environment-specific methods that subclasses have to implement.
 * @type { fhirclient.Adapter }
 */
class BaseAdapter
{
    /**
     * @param {Object} options Environment-specific options
     */
    constructor(options = {})
    {
        this.options = {
            // Replaces the browser's current URL
            // using window.history.replaceState API or by reloading.
            replaceBrowserHistory: true,

            // Enables workaround for Firefox history.replaceState bug (see https://bugzilla.mozilla.org/show_bug.cgi?id=1422334)
            // Affected Firefox versions: 56.0+
            // Bug still present in Firefox 68.0
            // Side effects of workaround: `#` added to app URL. If this is not desirable set to false.
            fixBug1422334: true,

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
    relative(path)
    {
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
    getSmartApi()
    {
        return {
            ready    : (...args) => smart.ready(this, ...args),
            authorize: options   => smart.authorize(this, options),
            init     : (...args) => smart.init(this, ...args),
            client   : state     => new Client(this, state),
            options  : this.options
        };
    }
}

module.exports = BaseAdapter;
