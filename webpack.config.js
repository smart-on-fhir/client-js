const path = require("path");
const { merge } = require("webpack-merge");
const { BundleAnalyzerPlugin } = require("webpack-bundle-analyzer");
const { DefinePlugin } = require("webpack");

const BASE_CONFIG = {
    context: __dirname,
    entry  : "./src/entry/browser.ts",
    target : "web",
    devtool: "source-map",
    output : {
        path         : path.resolve(__dirname, "dist/build"),
        library      : "FHIR",
        libraryTarget: "window",
        // libraryExport: "default"
    },
    optimization: {
        providedExports: false,
        usedExports: true,
        sideEffects: true
    },
    resolve: {
        extensions: [".ts", ".js"]
    }
};

const PURE_DEV_BUILD = merge(BASE_CONFIG, {
    mode: "development",
    output: {
        filename: "fhir-client.pure.js"
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                exclude: /node_modules/,
                use: [
                    "babel-loader?envName=pure",
                    "ts-loader"
                ]
            }
        ]
    },
    plugins: [
        new DefinePlugin({ "FHIRCLIENT_PURE": true }),
        new BundleAnalyzerPlugin({
            analyzerMode  : "static",
            openAnalyzer  : false,
            reportFilename: "bundle.pure.dev.html"
        })
    ]
});

const PURE_PROD_BUILD = merge(BASE_CONFIG, {
    mode: "production",
    output: {
        filename: "fhir-client.pure.min.js"
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                exclude: /node_modules/,
                use: [
                    "babel-loader?envName=pure",
                    "ts-loader"
                ]
            }
        ]
    },
    plugins: [
        new DefinePlugin({ "FHIRCLIENT_PURE": true }),
        new BundleAnalyzerPlugin({
            analyzerMode  : "static",
            openAnalyzer  : false,
            reportFilename: "bundle.pure.prod.html"
        })
    ]
});

const BROWSER_DEV_BUILD = merge(BASE_CONFIG, {
    mode: "development",
    output: {
        filename: "fhir-client.js"
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                include: [
                    path.join(__dirname, "src"),
                    path.join(__dirname, "node_modules/debug")
                ],
                use: "babel-loader?envName=browser"
            },
            {
                test: /\.ts$/,
                include: [
                    path.join(__dirname, "src")
                ],
                use: [
                    "babel-loader?envName=browser",
                    "ts-loader"
                ]
            }
        ]
    },
    plugins: [
        new BundleAnalyzerPlugin({
            analyzerMode  : "static",
            openAnalyzer  : false,
            reportFilename: "bundle.dev.html"
        })
    ]
});

const BROWSER_PROD_BUILD = merge(BASE_CONFIG, {
    mode: "production",
    output: {
        filename: "fhir-client.min.js"
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                include: [
                    path.join(__dirname, "src"),
                    path.join(__dirname, "node_modules/debug")
                ],
                use: "babel-loader?envName=browser"
            },
            {
                test: /\.ts$/,
                exclude: /node_modules/,
                use: [
                    "babel-loader?envName=browser",
                    "ts-loader"
                ]
            }
        ]
    },
    plugins: [
        new BundleAnalyzerPlugin({
            analyzerMode  : "static",
            openAnalyzer  : false,
            reportFilename: "bundle.dev.html"
        })
    ]
});


module.exports = [
    PURE_DEV_BUILD,
    PURE_PROD_BUILD,
    BROWSER_DEV_BUILD,
    BROWSER_PROD_BUILD
];
