import { body, param } from 'express-validator';
import { PHASE_SLUG_MAP, OUTCOME_TYPE } from '../utils/constants.js';

/**
 * Validator for submit phase data
 */
export const submitPhaseValidator = () => {
    return [
        param('caseId')
            .notEmpty().withMessage('Case ID is required')
            .isMongoId().withMessage('Invalid case ID format'),

        param('phaseKey')
            .notEmpty().withMessage('Phase key is required')
            .custom((value) => {
                const validKeys = Object.keys(PHASE_SLUG_MAP);
                if (!validKeys.includes(value)) {
                    throw new Error(`Phase key must be one of: ${validKeys.join(', ')}`);
                }
                // Prevent court-hearing from this endpoint
                if (value === 'court-hearing') {
                    throw new Error('Court hearing phase must be managed via subphases endpoint');
                }
                return true;
            }),

        body('judgeCourtRemarks')
            .optional()
            .isString().withMessage('Judge court remarks must be a string')
            .trim(),

        body('lawyerRemarks')
            .optional()
            .isString().withMessage('Lawyer remarks must be a string')
            .trim(),

        body('opponentRemarks')
            .optional()
            .isString().withMessage('Opponent remarks must be a string')
            .trim(),

        body('outcome')
            .if((value, { req }) => req.params.phaseKey === 'case-outcome')
            .notEmpty().withMessage('Outcome is required for case outcome phase')
            .isIn(Object.values(OUTCOME_TYPE))
            .withMessage(`Outcome must be one of: ${Object.values(OUTCOME_TYPE).join(', ')}`)
    ];
};

/**
 * Validator for add court hearing subphase
 */
export const addSubPhaseValidator = () => {
    return [
        param('caseId')
            .notEmpty().withMessage('Case ID is required')
            .isMongoId().withMessage('Invalid case ID format'),

        body('name')
            .notEmpty().withMessage('Subphase name is required')
            .isString().withMessage('Subphase name must be a string')
            .trim()
            .isLength({ min: 3, max: 200 }).withMessage('Subphase name must be between 3 and 200 characters'),

        body('judgeCourtRemarks')
            .optional()
            .isString().withMessage('Judge court remarks must be a string')
            .trim(),

        body('lawyerRemarks')
            .optional()
            .isString().withMessage('Lawyer remarks must be a string')
            .trim(),

        body('opponentRemarks')
            .optional()
            .isString().withMessage('Opponent remarks must be a string')
            .trim()
    ];
};

/**
 * Validator for complete court hearing
 */
export const completeCourtHearingValidator = () => {
    return [
        param('caseId')
            .notEmpty().withMessage('Case ID is required')
            .isMongoId().withMessage('Invalid case ID format')
    ];
};

/**
 * Validator for get timeline
 */
export const getTimelineValidator = () => {
    return [
        param('caseId')
            .notEmpty().withMessage('Case ID is required')
            .isMongoId().withMessage('Invalid case ID format')
    ];
};
