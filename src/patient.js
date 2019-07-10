// List of resources with 'patient' or 'subject' properties (as of FHIR DSTU2 1.0.0)
// (Based on https://github.com/FHIR/fhir.js/blob/master/src/middlewares/patient.js)
var targets = [
    "Account",
    "AllergyIntolerance",
    "BodySite",
    "CarePlan",
    "Claim",
    "ClinicalImpression",
    "Communication",
    "CommunicationRequest",
    "Composition",
    "Condition",
    "Contract",
    "DetectedIssue",
    "Device",
    "DeviceUseRequest",
    "DeviceUseStatement",
    "DiagnosticOrder",
    "DiagnosticReport",
    "DocumentManifest",
    "DocumentReference",
    "Encounter",
    "EnrollmentRequest",
    "EpisodeOfCare",
    "FamilyMemberHistory",
    "Flag",
    "Goal",
    "ImagingObjectSelection",
    "ImagingStudy",
    "Immunization",
    "ImmunizationRecommendation",
    "List",
    "Media",
    "MedicationAdministration",
    "MedicationDispense",
    "MedicationOrder",
    "MedicationStatement",
    "NutritionOrder",
    "Observation",
    "Order",
    "Procedure",
    "ProcedureRequest",
    "QuestionnaireResponse",
    "ReferralRequest",
    "RelatedPerson",
    "RiskAssessment",
    "Specimen",
    "SupplyDelivery",
    "SupplyRequest",
    "VisionPrescription"
];

const {
    absolute,
    debug: _debug
} = require("./lib");

const debug = _debug.extend("client:patient");

/**
 * Adds patient context to requestOptions object to be used with fhirclient.Client.request
 * @param {Object|String} requestOptions Can be a string URL (relative to
 *  the serviceUrl), or an object which will be passed to fetch()
 * @param {fhirclient.Client} client Current FHIR client object containing patient context
 * @return {Object|String} requestOptions object contextualied to current patient
 */
function contextualize (requestOptions, client) {

    const patient = client.patient.id;
    const base = absolute("/", client.state.serverUrl);

    if (!patient) return Promise.reject(new Error("Patient is not available"));

    function contextualURL(url) {
        const type = url.pathname.split("/").pop();
        const params = url.searchParams;

        if (targets.indexOf(type) >= 0){
            params.set("patient", patient);
        }
    
        debug(`Contextualized request url: ${url.href}`);

        return url.href;
    }

    if (typeof requestOptions == "string" || requestOptions instanceof URL) {
        let url = new URL(requestOptions, base);
        return contextualURL(url);
    }
    else {
        let url = new URL(requestOptions.url, base);
        requestOptions.url = contextualURL(url);
        return requestOptions;
    }
}

module.exports = contextualize;