module.exports = {

    // coverage ----------------------------------------------------------------

    // enable code coverage analysis (-c, --coverage)
    // coverage: false,

    // set code coverage path (--coverage-path)
    // coveragePath: "dist",

    // set code coverage excludes (--coverage-exclude)
    // coverageExclude: "lib/**.*",

    // include all files in coveragePath in report (--coverage-all)
    // coverageAll: true,

    // --coverage-flat                 prevent recursive inclusion of all files in coveragePath in report
    // coverageFlat: false,

    // --coverage-module               enable coverage on external module
    // coverageModule: true,

    // --coverage-pattern              file pattern to use for locating files for coverage
    // coveragePattern: "src/**.*",

    // sourcemaps --------------------------------------------------------------

    // enable support for sourcemaps (-S, --sourcemaps)
    sourcemaps: true,

    // transform ---------------------------------------------------------------
    // javascript file that exports an array of objects ie.
    // [ { ext: ".js", transform: function (content, filename) { ... } } ]
    // (-T, --transform)
    // transform: "node_modules/lab-transform-typescript",

    // reporters ---------------------------------------------------------------
    // reporter type [console, html, json, tap, lcov, clover, junit]
    // Note that the order of entries corresponds to the `output` below
    // (-r, --reporter)
    reporter: ["console"],

    // output ------------------------------------------------------------------
    // file path to write test results
    // Note that the order of entries corresponds to the `reporter` above
    // (-o, --output)
    // output: ["stdout"],

    // Other -------------------------------------------------------------------
    // ignore a list of globals for the leak detection (comma separated)
    // (-I, --globals)
    globals: "crypto,__coverage__,__spreadArray", // "__core-js_shared__",

    // --bail                          exit the process with a non zero exit code on the first test failure
    bail: false,

    // -p, --default-plan-threshold    minimum plan threshold to apply to all tests that don't define any plan
    defaultPlanThreshold: 90,

    // -e, --environment               value to set NODE_ENV before tests
    environment: "test",

    // -f, --flat                      prevent recursive collection of tests within the provided path
    flat: false,

    // -l, --leaks                     disable global variable leaks detection
    leaks: true,

    // --shuffle                       shuffle script execution order
    shuffle: false,

    // -s, --silence                   silence test output
    silence: false,

    // -k, --silent-skips              don’t output skipped tests
    silentSkips: false,

    // -t, --threshold                 code coverage threshold percentage
    // threshold: 90,

    // -m, --timeout                   timeout for each test in milliseconds
    timeout: 5000,

    // -M, --context-timeout           timeout for before, after, beforeEach, afterEach in milliseconds
    contextTimeout: 1000,

    // -Y, --types                     test types definitions
    types: false,
    // --types-test                    location of types definitions test file

    // -v, --verbose                   verbose test output
    verbose: true,

    // -V, --version                   version information
    // -h, --help                      display usage options
    // -a, --assert                    specify an assertion library module path to require and
    //                                 make available under Lab.assertions
    // -C, --colors                    enable color output (defaults to terminal capabilities)
    // -d, --dry                       skip all tests (dry run)
    // --inspect                       starts lab with the node.js native debugger
    // --seed                          use this seed to randomize the order with `--shuffle`.
    //                                 This is useful to debug order dependent test failures
    // -L, --lint                      enable linting
    lint: false,
    // -n, --linter                    linter path to use
    // --lint-fix                      apply any fixes from the linter.
    // --lint-options                  specify options to pass to linting program. It must be a
    //                                 string that is JSON.parse(able).
    // --lint-errors-threshold         linter errors threshold in absolute value
    // --lint-warnings-threshold       linter warnings threshold in absolute value
    // -P, --pattern                   file pattern to use for locating tests
    // -g, --grep                      only run tests matching the given pattern which is
    //                                 internally compiled to a RegExp
    // -i, --id                        test identifier
};
