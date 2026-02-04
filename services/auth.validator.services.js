import { body, validationResult } from 'express-validator';
import { BAD_REQUEST } from '../error/error.js';
import {
    emailValidator,
    phoneValidator,
    passwordValidator,
    confirmPasswordValidator
} from '../utils/validation.helper.utils.js';

/**
 * ===============================================
 * AUTH VALIDATORS
 * ===============================================
 */

// Client Registration
const clientRegistrationValidator = () => [
    body("fullName")
        .trim()
        .notEmpty().withMessage("Full name is required")
        .isLength({ min: 2, max: 100 }).withMessage("Full name must be 2-100 characters"),
    body("fatherName")
        .trim()
        .notEmpty().withMessage("Father name is required")
        .isLength({ min: 2, max: 100 }).withMessage("Father name must be 2-100 characters"),
    body("dateOfBirth")
        .optional()
        .isISO8601().withMessage("Invalid date format (use YYYY-MM-DD)"),
    emailValidator(),
    phoneValidator(),
    passwordValidator(),
    confirmPasswordValidator()
];

// Lawyer Registration
const lawyerRegistrationValidator = () => [
    body("fullName")
        .trim()
        .notEmpty().withMessage("Full name is required")
        .isLength({ min: 2, max: 100 }),
    emailValidator(),
    phoneValidator(),
    body("barCouncil")
        .optional()
        .trim(),
    body("licenseNo")
        .optional()
        .trim(),
    body("city")
        .optional()
        .trim(),
    passwordValidator(),
    confirmPasswordValidator()
];

// Login Validator
const loginValidator = () => [
    body("identifier")
        .trim()
        .notEmpty().withMessage("Email or phone number is required"),
    body("password")
        .notEmpty().withMessage("Password is required")
];



const verifyOtpValidator = () => [
    emailValidator(),
    body("otp")
        .trim()
        .notEmpty().withMessage("OTP is required")
        .isLength({ min: 6, max: 6 }).withMessage("OTP must be 6 digits")
];

const resendOtpValidator = () => [
    emailValidator(),
    body("type")
        .optional()
        .isIn(['email', 'phone'])
];

// Password Reset Validators
const forgotPasswordValidator = () => [
    body("identifier")
        .trim()
        .notEmpty().withMessage("Email or phone number is required")
];

const verifyResetOtpValidator = () => [
    emailValidator(),
    body("otp")
        .trim()
        .notEmpty().withMessage("OTP is required")
        .isLength({ min: 6, max: 6 })
];

const resetPasswordValidator = () => [
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('resetToken').notEmpty().withMessage('Reset token is required'),
    body('newPassword')
        .notEmpty().withMessage("New password is required")
        .isLength({ min: 6 }),
    body("confirmNewPassword")
        .notEmpty().withMessage("Confirm password is required")
        .custom((value, { req }) => {
            if (value !== req.body.newPassword) throw new Error("Passwords do not match");
            return true;
        })
];

// Validation Middleware
function validationMiddleware(req, res, next) {
    const errors = validationResult(req);
    if (errors.isEmpty()) return next();
    const allError = errors.errors.map(({ msg }) => msg).join(', ');
    next(new BAD_REQUEST(allError));
}

export {
    clientRegistrationValidator,
    lawyerRegistrationValidator,
    loginValidator,

    verifyOtpValidator,
    resendOtpValidator,
    forgotPasswordValidator,
    verifyResetOtpValidator,
    resetPasswordValidator,
    validationMiddleware
};
