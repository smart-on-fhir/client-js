const path = require("path");
const { BundleAnalyzerPlugin } = require("webpack-bundle-analyzer");
const { DefinePlugin } = require("webpack");

module.exports = function(env, argv) {
    process.env.BABEL_ENV = argv.pure ? "pure" : "browser";
    const isDev = argv.mode === "development";

    return {
        context: __dirname,
        entry: "./src/browser.js",
        target: "web",
        output: {
            path      : path.resolve(__dirname, "dist/build"),
            filename  : `fhir-client${argv.pure ? ".pure" : ""}${isDev ? "" : ".min"}.js`,
            library: "FHIR",
            libraryTarget: "window"
        },
        devtool: "source-map",
        optimization: {
            providedExports: false,
            usedExports: true,
            sideEffects: true
        },
        module: {
            rules: [
                {
                    test: /\.js$/,
                    include: [
                        path.join(__dirname, "src"),
                    ],
                    use: "babel-loader"
                }
            ]
        },
        resolve: {
            extensions: [".js"]
        },
        plugins: [
            new DefinePlugin({
                "global.FHIRCLIENT_PURE": argv.pure
            }),
            new BundleAnalyzerPlugin({
                analyzerMode  : "static",
                openAnalyzer  : false,
                reportFilename: `bundle${argv.pure ? ".pure" : ""}.${isDev ? "dev" : "prod"}.html`
            })
        ]
    };
};
