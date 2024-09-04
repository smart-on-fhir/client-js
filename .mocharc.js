module.exports = {
    
    extensions: ["ts"],

    spec: [
        "./test/**/*.test.ts",
    ],

    timeout: 15000, // defaults to 2000ms; increase if needed
    checkLeaks: true,
    allowUncaught: true, // Allow uncaught errors to propagate
    jobs: 1, // Number of concurrent jobs for --parallel; use 1 to run in serial; default: (number of CPU cores - 1)
    parallel: false, // Run tests in parallel
    retries: 0, // Retry failed tests this many times
    // bail: true,

    exit: true,

    watch: false,
    'watch-files': ['src/**/*.ts', 'test/**/*.ts'],
    // 'watch-ignore': []

    global: [
        'window',
        'self',
        'top',
        'parent',
        'opener',
        'frames',
        'screen',
        'sessionStorage',
        'location'
    ]
}