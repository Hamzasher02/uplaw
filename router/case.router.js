import express from 'express';
import authenticationMiddleware from '../middleware/authentication.middleware.js';
import { requireRole } from '../middleware/rbac.middleware.js';
import { uploadCaseFiles, uploadTimelineDocuments } from '../middleware/multer.middleware.js';
import { ROLES } from '../utils/constants.js';
import {
    createCase,
    getMyCases,
    getCaseById,
    getSuggestedLawyers,
    inviteLawyers,
    updateCaseStatus,
    getReceivedCases,
    respondToInvitation
} from '../controller/case.controller.js';
import {
    getTimeline,
    submitPhaseData,
    addCourtHearingSubPhase,
    completeCourtHearing
} from '../controller/timeline.controller.js';
import {
    getTimelineValidator,
    submitPhaseValidator,
    addSubPhaseValidator,
    completeCourtHearingValidator
} from '../services/timeline.validator.services.js';
import { validationResult } from 'express-validator';
import { BAD_REQUEST } from '../error/error.js';

const router = express.Router();

// Validation middleware using existing error pattern
const validateRequest = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorMessage = errors.array().map(err => err.msg).join(', ');
        throw new BAD_REQUEST(errorMessage);
    }
    next();
};

// All routes require authentication
router.use(authenticationMiddleware);

// =============== CLIENT ROUTES ===============

/**
 * @route   POST /cases
 * @desc    Create a new case (with optional voice note)
 * @access  Client only
 */
router.post(
    '/',
    requireRole(ROLES.CLIENT),
    uploadCaseFiles,
    createCase
);

/**
 * @route   GET /cases
 * @desc    Get all cases for the logged-in client
 * @access  Client only
 */
router.get(
    '/',
    requireRole(ROLES.CLIENT),
    getMyCases
);

/**
 * @route   GET /cases/received
 * @desc    Get received case invitations (for lawyers)
 * @access  Lawyer only
 */
router.get(
    '/received',
    requireRole(ROLES.LAWYER),
    getReceivedCases
);

// =============== TIMELINE ROUTES (CASE PHASES) ===============
// IMPORTANT: Timeline routes MUST be placed BEFORE generic /:id routes
// Court-hearing specific routes MUST come BEFORE generic /:phaseKey/submit

/**
 * @route   GET /cases/:caseId/timeline
 * @desc    Get timeline for a case with all phases
 * @access  Client (owner) or Lawyer (assigned)
 */
router.get(
    '/:caseId/timeline',
    requireRole(ROLES.CLIENT, ROLES.LAWYER),
    getTimelineValidator(),
    validateRequest,
    getTimeline
);

/**
 * @route   POST /cases/:caseId/phases/court-hearing/subphases
 * @desc    Add court hearing sub-phase
 * @access  Lawyer (assigned only)
 */
router.post(
    '/:caseId/phases/court-hearing/subphases',
    requireRole(ROLES.LAWYER),
    uploadTimelineDocuments,
    addSubPhaseValidator(),
    validateRequest,
    addCourtHearingSubPhase
);

/**
 * @route   POST /cases/:caseId/phases/court-hearing/complete
 * @desc    Mark court hearing phase as completed
 * @access  Lawyer (assigned only)
 */
router.post(
    '/:caseId/phases/court-hearing/complete',
    requireRole(ROLES.LAWYER),
    completeCourtHearingValidator(),
    validateRequest,
    completeCourtHearing
);

/**
 * @route   POST /cases/:caseId/phases/:phaseKey/submit
 * @desc    Submit phase data (case-intake, case-filed, trial-preparation, case-outcome)
 * @access  Lawyer (assigned only)
 */
router.post(
    '/:caseId/phases/:phaseKey/submit',
    requireRole(ROLES.LAWYER),
    uploadTimelineDocuments,
    submitPhaseValidator(),
    validateRequest,
    submitPhaseData
);

// =============== GENERIC CASE ROUTES ===============
// These routes MUST come AFTER timeline routes

/**
 * @route   GET /cases/:id
 * @desc    Get a single case by ID
 * @access  Client (owner) or Lawyer (invited/assigned)
 */
router.get(
    '/:id',
    requireRole(ROLES.CLIENT, ROLES.LAWYER),
    getCaseById
);

/**
 * @route   GET /cases/:id/lawyers
 * @desc    Get suggested lawyers for a case
 * @access  Client only (owner)
 */
router.get(
    '/:id/lawyers',
    requireRole(ROLES.CLIENT),
    getSuggestedLawyers
);

/**
 * @route   POST /cases/:id/invite
 * @desc    Invite lawyers to a case
 * @access  Client only (owner)
 */
router.post(
    '/:id/invite',
    requireRole(ROLES.CLIENT),
    inviteLawyers
);

/**
 * @route   PATCH /cases/:id/status
 * @desc    Update case status
 * @access  Client only (owner)
 */
router.patch(
    '/:id/status',
    requireRole(ROLES.CLIENT),
    updateCaseStatus
);

/**
 * @route   PATCH /cases/invitations/:id/status
 * @desc    Respond to a case invitation
 * @access  Lawyer only
 */
router.patch(
    '/invitations/:id/status',
    requireRole(ROLES.LAWYER),
    respondToInvitation
);

export default router;
