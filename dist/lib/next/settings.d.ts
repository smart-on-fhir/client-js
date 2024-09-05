/**
 * Combined list of FHIR resource types accepting patient parameter in FHIR R2-R4
 */
export declare const patientCompartment: string[];
/**
 * Map of FHIR releases and their abstract version as number
 */
export declare const fhirVersions: {
    "0.4.0": number;
    "0.5.0": number;
    "1.0.0": number;
    "1.0.1": number;
    "1.0.2": number;
    "1.1.0": number;
    "1.4.0": number;
    "1.6.0": number;
    "1.8.0": number;
    "3.0.0": number;
    "3.0.1": number;
    "3.3.0": number;
    "3.5.0": number;
    "4.0.0": number;
    "4.0.1": number;
};
/**
 * Combined (FHIR R2-R4) list of search parameters that can be used to scope
 * a request by patient ID.
 */
export declare const patientParams: string[];
/**
 * The name of the sessionStorage entry that contains the current key
 */
export declare const SMART_KEY = "SMART_KEY";
