module.exports = {

    entryPoints: [ "./src" ],

    // resolve | expand | packages
    entryPointStrategy: "expand",

    // Set the name of the project that will be used in the header of the
    // template.
    name: "FHIRClient",

    // Specifies the location the documentation should be written to.
    out: "docs/typedoc",

    // Define patterns for excluded files when specifying paths.
    exclude: [ "./src/lib" ],

    // Define patterns for files that should be considered being external.
    // externalPattern: "node_modules",

    // Prevent externally resolved TypeScript files from being documented.
    // excludeExternals: true,

    logLevel: "Warn",

    // Ignores private variables and methods
    // excludePrivate: false,

    // Ignores protected variables and methods
    // excludeProtected: false,

    // Specifies whether categorization will be done at the group level.
    // categorizeByGroup: true,

    // Specifies the order in which categories appear. * indicates the relative
    // order for categories not in the list.
    // categoryOrder: "*",

    // --defaultCategory         Specifies the default category for reflections without a category.
    // defaultCategory: "fhirclient",
    // --disableOutputCheck      Should TypeDoc disable the testing and cleaning of the output directory?
    // --entryPoint              Specifies the fully qualified name of the root symbol. Defaults to global namespace.
    // entryPoint: "FHIR",
    // --gaID                    Set the Google Analytics tracking ID and activate tracking code.
    // --gaSite                  Set the site name for Google Analytics. Defaults to `auto`.
    // --gitRevision             Use specified revision instead of the last revision for linking to GitHub source files.
    // --hideGenerator           Do not print the TypeDoc link at the end of the page.
    // --includes DIRECTORY      Specifies the location to look for included documents (use [[include:FILENAME]] in comments).
    // --json                    Specifies the location and file name a json file describing the project is written to.
    // --logger                  Specify the logger that should be used, 'none' or 'console'
    // --media DIRECTORY         Specifies the location with media files that should be copied to the output directory.
    // --options                 Specify a js option file that should be loaded. If not specified TypeDoc will look for 'typedoc.js' in the current directory.
    // --plugin                  Specify the npm plugins that should be loaded. Omit to load all installed plugins, set to 'none' to load no plugins.
    // --readme                  Path to the readme file that should be displayed on the index page. Pass `none` to disable the index page and start the documentation on the globals page.
    readme: "../README.md",
    // --theme                   Specify the path to the theme that should be used or 'default' or 'minimal' to use built-in themes.
    // theme: "docs/typedoc-theme"
    // --toc                     Specifies the top level table of contents.
    // --tsconfig                Specify a typescript config file that should be loaded. If not specified TypeDoc will look for 'tsconfig.json' in the current directory.
    
    // customCss: "docs/typedoc-theme/assets/css/main.css"

    validation: {
        notExported  : false,
        invalidLink  : true,
        notDocumented: false
    },

    // intentionallyNotExported: ["InternalClass", "src/other.ts:OtherInternal"],
    // requiredToBeDocumented: ["Enum", "Class"],

    includeVersion: true,

};
