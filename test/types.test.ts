import { expect }   from "@hapi/code";
import * as Lab     from "@hapi/lab";
import * as Path    from "path";
import * as ts      from "typescript";

export const lab = Lab.script();
const { it, describe } = lab;

/**
 * Reproduces https://github.com/smart-on-fhir/client-js/issues/170:
 * a @types/fhir R4 resource whose Meta omits lastUpdated must be
 * assignable to fhirclient.FHIR.Resource (e.g. Client.create).
 */
const ASSIGNABILITY_SNIPPET = `
import type { QuestionnaireResponse } from "fhir/r4";
import { fhirclient } from "./src/types";

const qr: QuestionnaireResponse = {
    resourceType: "QuestionnaireResponse",
    status: "completed",
    meta: {}
};

function create(resource: fhirclient.FHIR.Resource) {
    return resource;
}

create(qr);

const meta: fhirclient.FHIR.Meta = {};
void meta;
`;

describe("FHIR types", () => {

    it("allows Meta.lastUpdated to be omitted (#170)", { timeout: 20000 }, () => {
        const filename = Path.join(process.cwd(), "__meta_assignability__.ts");
        const compilerOptions: ts.CompilerOptions = {
            strict: true,
            noEmit: true,
            esModuleInterop: true,
            skipLibCheck: true,
            module: ts.ModuleKind.CommonJS,
            moduleResolution: ts.ModuleResolutionKind.NodeJs,
            target: ts.ScriptTarget.ES2019
        };

        const host = ts.createCompilerHost(compilerOptions);
        const origGetSourceFile = host.getSourceFile.bind(host);
        host.getSourceFile = (fileName, languageVersion, onError) => {
            if (Path.resolve(fileName) === Path.resolve(filename)) {
                return ts.createSourceFile(fileName, ASSIGNABILITY_SNIPPET, languageVersion, true);
            }
            return origGetSourceFile(fileName, languageVersion, onError);
        };
        const origFileExists = host.fileExists.bind(host);
        host.fileExists = (fileName) => {
            return Path.resolve(fileName) === Path.resolve(filename) || origFileExists(fileName);
        };
        const origReadFile = host.readFile.bind(host);
        host.readFile = (fileName) => {
            return Path.resolve(fileName) === Path.resolve(filename) ? ASSIGNABILITY_SNIPPET : origReadFile(fileName);
        };

        const program = ts.createProgram([filename], compilerOptions, host);
        const errors = ts.getPreEmitDiagnostics(program)
            .filter(d => d.category === ts.DiagnosticCategory.Error)
            .map(d => ts.flattenDiagnosticMessageText(d.messageText, "\n"));

        expect(errors).to.equal([]);
    });
});
