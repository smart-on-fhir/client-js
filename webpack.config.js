const path = require("path");
const merge = require("webpack-merge").default;
const { BundleAnalyzerPlugin } = require("webpack-bundle-analyzer");


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
        extensions: [".ts", ".js"],
    }
};

const BROWSER_DEV_BUILD = merge(BASE_CONFIG, {
    mode: "development",
    target: "browserslist",
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
    target: "browserslist",
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
            reportFilename: "bundle.prod.html"
        })
    ]
});


module.exports = [
    BROWSER_DEV_BUILD,
    BROWSER_PROD_BUILD
];
