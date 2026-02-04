import { body } from "express-validator";

/**
 * Validation Helper Utilities
 * Reusable validation rules to eliminate duplication across validators
 */

export const emailValidator = (fieldName = "email") =>
    body(fieldName)
        .trim()
        .notEmpty().withMessage("Email is required")
        .isEmail().withMessage("Please enter a valid email");

export const phoneValidator = (fieldName = "phoneNumber") =>
    body(fieldName)
        .trim()
        .notEmpty().withMessage("Phone number is required")
        .matches(/^\+?[0-9]{10,15}$/).withMessage("Please enter a valid phone number");

export const cnicValidator = (fieldName = "cnic") =>
    body(fieldName)
        .optional()
        .matches(/^\d{5}-\d{7}-\d{1}$/).withMessage("CNIC must be in format XXXXX-XXXXXXX-X");

export const passwordValidator = (fieldName = "password") =>
    body(fieldName)
        .notEmpty().withMessage("Password is required")
        .isLength({ min: 6 }).withMessage("Password must be at least 6 characters");

export const confirmPasswordValidator = (passwordField = "password") =>
    body("confirmPassword")
        .notEmpty().withMessage("Confirm password is required")
        .custom((value, { req }) => {
            if (value !== req.body[passwordField]) throw new Error("Passwords do not match");
            return true;
        });
