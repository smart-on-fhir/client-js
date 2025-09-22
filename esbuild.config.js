const esbuild = require('esbuild');

const watch = process.argv.includes('--watch');

async function buildAll() {
    try {
        // Minified bundle
        const minCtx = await esbuild.context({
            entryPoints: ['src/entry/browser.ts'],
            bundle     : true,
            minify     : true,
            sourcemap  : true,
            outfile    : 'dist/build/fhir-client.min.js',
            target     : ['chrome99', 'firefox99', 'edge99'],
            platform   : 'browser',
            format     : 'iife',
            logLevel   : 'info',
            globalName : 'FHIR',
            banner     : { js: '// @ts-nocheck' },
            metafile   : true,
        });
        if (watch) {
            await minCtx.watch();
        }
        else {
            const result = await minCtx.rebuild();
            console.log(await esbuild.analyzeMetafile(result.metafile));
            await minCtx.dispose();
        }

        // Pretty-printed bundle
        const prettyCtx = await esbuild.context({
            entryPoints: ['src/entry/browser.ts'],
            bundle     : true,
            minify     : false,
            sourcemap  : true,
            outfile    : 'dist/build/fhir-client.js',
            target     : ['chrome99', 'firefox99', 'edge99'],
            platform   : 'browser',
            format     : 'iife',
            logLevel   : 'info',
            globalName : 'FHIR',
            banner     : { js: '// @ts-nocheck' },
            metafile   : true,
        });

        if (watch) {
            await prettyCtx.watch();
        }
        else {
            const result = await prettyCtx.rebuild();
            console.log(await esbuild.analyzeMetafile(result.metafile));
            await prettyCtx.dispose();
        }
    } catch (err) {
        process.exit(1);
    }
}

buildAll();
