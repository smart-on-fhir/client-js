module.exports = {
    env: {
        pure: {},
        browser: {
            plugins: ["@babel/plugin-transform-runtime"],
            presets: [
                ["@babel/preset-env", {
                    useBuiltIns: "usage",
                    modules: "commonjs",
                    corejs: {
                        version: 3,
                        proposals: true
                    },
                    targets: [
                        "last 2 Chrome versions",
                        "last 2 firefox versions",
                        "last 2 Edge versions",
                        "ie 11"
                    ],
                    debug: true,
                    // loose: true, // needed for IE 10
                }]
            ]
        },
        module: {
            presets: [
                ["@babel/preset-env", {
                    useBuiltIns: "usage",
                    modules: "commonjs",
                    corejs: {
                        version: 3
                    },
                    targets: [
                        "node 18"
                    ]
                }]
            ]
        }
    }
};
