import { body } from "express-validator";
import { BAD_REQUEST } from "../error/error.js";
import { ROLES } from "../utils/constants.js";
/**
 * File validator for multer single file: req.file
 * Field name: profilePicture
 * Allowed: jpeg/jpg/png/webp
 * Max size should already be enforced by multer (1MB in your config),
 * but we still keep mimetype check here for safety.
 */
export const validateProfilePicture = (req, res, next) => {
  if (!req.file) return next(); // optional file

  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  if (!allowedTypes.includes(req.file.mimetype)) {
    return next(new BAD_REQUEST("Only image files (JPG, PNG, WEBP) are allowed"));
  }

  next();
};

/**
 * ===============================================
 * STAFF REGISTRATION VALIDATOR
 * ===============================================
 * multipart/form-data
 * fields: name, email, password, role(optional), isActive(optional), profilePicture(optional file)
 */
export const staffRegisterValidator = () => [
  body("name")
    .exists({ checkFalsy: true })
    .withMessage("Name is required")
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Name must be between 2 and 100 characters"),

  body("email")
    .exists({ checkFalsy: true })
    .withMessage("Email is required")
    .trim()
    .isEmail()
    .withMessage("Email is invalid")
    .normalizeEmail(),

  body("password")
    .exists({ checkFalsy: true })
    .withMessage("Password is required")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long"),

body("role")
  .optional()
  .trim()
  .isIn([ROLES.ADMIN])
  .withMessage("Only admin role is allowed"),
  body("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be a boolean value")
    .toBoolean(),
];

/**
 * ===============================================
 * STAFF UPDATE VALIDATOR
 * ===============================================
 * fields can be: name, role, isActive, profilePicture(optional file)
 */
export const staffUpdateValidator = () => [
  body("name")
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Name must be between 2 and 100 characters"),

body("role")
  .optional()
  .trim()
  .isIn([ROLES.ADMIN])
  .withMessage("Only admin role is allowed"),
  
  body("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be a boolean value")
    .toBoolean(),
];

/**
 * ===============================================
 * STAFF EMAIL VERIFY VALIDATOR
 * ===============================================
 * body: { staffId, otp }
 */
export const staffVerifyEmailValidator = () => [
  body("email")
    .exists({ checkFalsy: true })
    .withMessage("Email is required")
    .trim()
    .isEmail()
    .withMessage("Email is invalid")
    .normalizeEmail(),
  body("otp")
    .exists({ checkFalsy: true })
    .withMessage("OTP is required")
    .isLength({ min: 6, max: 6 })
    .withMessage("OTP must be 6 digits")
    .isNumeric()
    .withMessage("OTP must be numeric"),
];

/**
 * ===============================================
 * RESEND OTP VALIDATOR
 * ===============================================
 * body: { staffId }
 */
export const staffResendOtpValidator = () => [
  body("email")
    .exists({ checkFalsy: true })
    .withMessage("Email is required")
    .trim()
    .isEmail()
    .withMessage("Email is invalid")
    .normalizeEmail(),
];
export const staffVerifyLoginOtpValidator = () => [
  body("email")
    .exists({ checkFalsy: true })
    .withMessage("Email is required")
    .trim()
    .isEmail()
    .withMessage("Email is invalid")
    .normalizeEmail(),

  body("otp")
    .exists({ checkFalsy: true })
    .withMessage("OTP is required")
    .isLength({ min: 6, max: 6 })
    .withMessage("OTP must be 6 digits")
    .isNumeric()
    .withMessage("OTP must be numeric"),
];
export const staffLoginValidator = () => [
  body("email")
    .exists({ checkFalsy: true })
    .withMessage("Email is required")
    .trim()
    .isEmail()
    .withMessage("Email is invalid")
    .normalizeEmail(),
  body("password")
    .exists({ checkFalsy: true })
    .withMessage("Password is required")
      .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long"),
]