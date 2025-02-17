"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.SMART_KEY = exports.patientParams = exports.fhirVersions = exports.patientCompartment = void 0;
/**
 * Combined list of FHIR resource types accepting patient parameter in FHIR R2-R4
 */
exports.patientCompartment = ["Account", "AdverseEvent", "AllergyIntolerance", "Appointment", "AppointmentResponse", "AuditEvent", "Basic", "BodySite", "BodyStructure", "CarePlan", "CareTeam", "ChargeItem", "Claim", "ClaimResponse", "ClinicalImpression", "Communication", "CommunicationRequest", "Composition", "Condition", "Consent", "Coverage", "CoverageEligibilityRequest", "CoverageEligibilityResponse", "DetectedIssue", "DeviceRequest", "DeviceUseRequest", "DeviceUseStatement", "DiagnosticOrder", "DiagnosticReport", "DocumentManifest", "DocumentReference", "EligibilityRequest", "Encounter", "EnrollmentRequest", "EpisodeOfCare", "ExplanationOfBenefit", "FamilyMemberHistory", "Flag", "Goal", "Group", "ImagingManifest", "ImagingObjectSelection", "ImagingStudy", "Immunization", "ImmunizationEvaluation", "ImmunizationRecommendation", "Invoice", "List", "MeasureReport", "Media", "MedicationAdministration", "MedicationDispense", "MedicationOrder", "MedicationRequest", "MedicationStatement", "MolecularSequence", "NutritionOrder", "Observation", "Order", "Patient", "Person", "Procedure", "ProcedureRequest", "Provenance", "QuestionnaireResponse", "ReferralRequest", "RelatedPerson", "RequestGroup", "ResearchSubject", "RiskAssessment", "Schedule", "ServiceRequest", "Specimen", "SupplyDelivery", "SupplyRequest", "VisionPrescription"];
/**
 * Map of FHIR releases and their abstract version as number
 */
exports.fhirVersions = {
  "0.4.0": 2,
  "0.5.0": 2,
  "1.0.0": 2,
  "1.0.1": 2,
  "1.0.2": 2,
  "1.1.0": 3,
  "1.4.0": 3,
  "1.6.0": 3,
  "1.8.0": 3,
  "3.0.0": 3,
  "3.0.1": 3,
  "3.3.0": 4,
  "3.5.0": 4,
  "4.0.0": 4,
  "4.0.1": 4
};
/**
 * Combined (FHIR R2-R4) list of search parameters that can be used to scope
 * a request by patient ID.
 */
exports.patientParams = ["patient", "subject", "requester", "member", "actor", "beneficiary"];
/**
 * The name of the sessionStorage entry that contains the current key
 */
exports.SMART_KEY = "SMART_KEY";