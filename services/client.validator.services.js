import { body } from 'express-validator';
import { cnicValidator, phoneValidator } from '../utils/validation.helper.utils.js';

/**
 * ===============================================
 * CLIENT PROFILE VALIDATORS
 * ===============================================
 */

const clientProfileUpdateValidator = () => [
    body("fullName")
        .optional()
        .trim()
        .isLength({ min: 2, max: 100 }),
    body("fullNameUrdu")
        .optional()
        .trim()
        .isLength({ max: 100 }),
    body("fatherName")
        .optional()
        .trim()
        .isLength({ min: 2, max: 100 }),
    body("dateOfBirth")
        .optional()
        .isISO8601(),
    body("gender")
        .optional()
        .isIn(['male', 'female', 'other']),
    cnicValidator(),
    body("city")
        .optional()
        .trim()
        .isLength({ max: 50 }),
    body("province")
        .optional()
        .trim()
        .isLength({ max: 50 }),
    body("postalAddress")
        .optional()
        .trim()
        .isLength({ max: 500 }),
    phoneValidator("whatsappNumber").optional(),
    body("preferredLanguage")
        .optional()
        .isIn(['en', 'ur', 'pa', 'sd', 'ps']),
    body("bio")
        .optional()
        .trim()
        .isLength({ max: 500 })
];

export {
    clientProfileUpdateValidator
};
