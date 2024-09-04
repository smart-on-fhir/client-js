import typescript from "@rollup/plugin-typescript"
import resolve    from "@rollup/plugin-node-resolve"
import terser     from "@rollup/plugin-terser"
import analyze    from "rollup-plugin-analyzer"

let analyzePluginIterations = 0;

export default [
    
    // =========================================================================
    // Browser bundle
    // =========================================================================
    {
        input: "src/entry/browser.ts",
        watch: {
            include: 'src/**'
        },
        output: {
            file     : "dist/build/fhir-client.js",
            format   : "iife",
            name     : "FHIR",
            sourcemap: false,
        },
        plugins: [
            resolve(),
            typescript({
                compilerOptions: {
                    module          : "esnext",
                    listEmittedFiles: false,
                    sourceMap       : false
                }
            }),
            analyze({
                showExports: true,
                onAnalysis: () => {
                    if (analyzePluginIterations > 0) {
                        throw ""; // We only want reports on the first output
                    }
                    analyzePluginIterations++;
                }
            })
        ]
    },

    // =========================================================================
    // Minified browser bundle
    // =========================================================================
    {
        input: "src/entry/browser.ts",
        watch: {
            include: 'src/**'
        },
        output: {
            file   : "dist/build/fhir-client.min.js",
            format : "iife",
            name   : "FHIR",
            sourcemap: true,
            plugins: [
                terser()
            ],
        },
        plugins: [
            resolve(),
            typescript({
                compilerOptions: {
                    module          : "esnext",
                    listEmittedFiles: false,
                    sourceMap       : true
                }
            })
        ]
    },

    // =========================================================================
    // ES module for modern browsers
    // =========================================================================
    {
        input: "src/entry/browser.ts",
        watch: {
            include: 'src/**'
        },
        output: {
            file     : "dist/build/fhir-client.mjs",
            format   : "es",
            sourcemap: false,
        },
        plugins: [
            resolve(),
            typescript({
                compilerOptions: {
                    module          : "esnext",
                    listEmittedFiles: false,
                    sourceMap       : false
                }
            })
        ]
    }
]
