import { body, param } from "express-validator";
import { AVAILABILITY_STATUS, LANGUAGES } from "../utils/constants.js";
import { cnicValidator } from "../utils/validation.helper.utils.js";

/**
 * ===============================================
 * LAWYER PROFILE VALIDATORS
 * ===============================================
 */

// Step 1: Basic Information
const lawyerStep1Validator = () => [
  body("fullName")
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Full name must be 2-100 characters"),
  body("fullNameUrdu")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Urdu name cannot exceed 100 characters"),
  body("email")
    .optional()
    .trim()
    .isEmail()
    .withMessage("Please enter a valid email"),
  body("phoneNumber")
    .optional()
    .trim()
    .matches(/^\+?[0-9]{10,15}$/)
    .withMessage("Please enter a valid phone number"),
  body("dateOfBirth")
    .optional()
    .isISO8601()
    .withMessage("Date of birth must be a valid date"),
  body("city")
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage("City cannot exceed 50 characters"),
  body("postalAddress")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Postal address cannot exceed 500 characters"),
];

// Step 2: Professional Qualifications (Flat Fields)
const lawyerStep2Validator = () => [
  body("licenseNo")
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage("License number cannot exceed 50 characters"),
  body("associationBar")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Association bar cannot exceed 100 characters"),
  body("barCity")
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage("Bar city cannot exceed 50 characters"),
  body("yearsOfExperience")
    .optional({ values: "falsy" })
    .trim()
    .toInt()
    .isInt({ min: 0, max: 60 })
    .withMessage("Years of experience must be between 0 and 60"),
];

// Step 3: Practice Areas
const lawyerStep3Validator = () => [
  body("areasOfPractice")
    .optional()
    .custom((value) => {
      const arr = typeof value === "string" ? JSON.parse(value) : value;
      if (!Array.isArray(arr) || arr.length === 0) {
        throw new Error("Areas of practice must be a non-empty array");
      }
      return true;
    }),
  body("courtJurisdiction")
    .optional()
    .custom((value) => {
      const arr = typeof value === "string" ? JSON.parse(value) : value;
      if (!Array.isArray(arr) || arr.length === 0) {
        throw new Error("Court jurisdiction must be a non-empty array");
      }
      return true;
    }),
  body("languagesSpoken")
    .optional()
    .custom((value) => {
      const arr = typeof value === "string" ? JSON.parse(value) : value;
      if (!Array.isArray(arr)) {
        throw new Error("Languages spoken must be an array");
      }
      const validLangs = Object.values(LANGUAGES);
      for (const lang of arr) {
        if (!validLangs.includes(lang)) {
          throw new Error(
            `Invalid language: ${lang}. Valid options: ${validLangs.join(", ")}`,
          );
        }
      }
      return true;
    }),
  body("servicesOffered")
    .optional()
    .custom((value) => {
      const arr = typeof value === "string" ? JSON.parse(value) : value;
      if (!Array.isArray(arr)) {
        throw new Error("Services offered must be an array");
      }
      if (arr.length > 7) {
        throw new Error("Services offered cannot exceed 7 items");
      }
      return true;
    }),
];

// Step 4: Availability
const lawyerStep4Validator = () => [
  body("availabilityStatus")
    .optional()
    .isIn(Object.values(AVAILABILITY_STATUS))
    .withMessage(
      `Availability status must be one of: ${Object.values(AVAILABILITY_STATUS).join(", ")}`,
    ),
  body("practiceLocations")
    .optional()
    .custom((value) => {
      const arr = typeof value === "string" ? JSON.parse(value) : value;
      if (!Array.isArray(arr)) {
        throw new Error("Practice locations must be an array");
      }
      for (const loc of arr) {
        if (!loc.location) {
          throw new Error("Each practice location must have a location field");
        }
      }
      return true;
    }),
  body("professionalBio")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Professional bio cannot exceed 500 characters"),
];

// Step 5: Documents
const lawyerStep5Validator = () => [cnicValidator()];
const lawyerEducationCreateValidator = () => [
  body("degree")
    .exists()
    .withMessage("degree is required")
    .bail()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Degree must be 2-100 characters"),

  body("university")
    .exists()
    .withMessage("university is required")
    .bail()
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage("University must be 2-200 characters"),

  body("passingYear")
    .exists()
    .withMessage("passingYear is required")
    .bail()
    .isInt({ min: 1950, max: new Date().getFullYear() })
    .withMessage(
      `Passing year must be between 1950 and ${new Date().getFullYear()}`,
    ),
];

// Education Update Validator (all optional)
const lawyerEducationUpdateValidator = () => [
  param("educationId").isMongoId().withMessage("Invalid educationId"),

  body("degree")
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Degree must be 2-100 characters"),

  body("university")
    .optional()
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage("University must be 2-200 characters"),

  body("passingYear")
    .optional()
    .isInt({ min: 1950, max: new Date().getFullYear() })
    .withMessage(
      `Passing year must be between 1950 and ${new Date().getFullYear()}`,
    ),
];
/**
 * Unified Profile Validator - Combines all step validators
 * Use this for PATCH /api/lawyers/profile
 */
const lawyerUnifiedProfileValidator = () => [
  ...lawyerStep1Validator(),
  ...lawyerStep2Validator(),
  ...lawyerStep3Validator(),
  ...lawyerStep4Validator(),
  ...lawyerStep5Validator(),
];

export {
  lawyerStep1Validator,
  lawyerStep2Validator,
  lawyerStep3Validator,
  lawyerStep4Validator,
  lawyerStep5Validator,
  lawyerUnifiedProfileValidator,
  lawyerEducationUpdateValidator,
  lawyerEducationCreateValidator,
};
