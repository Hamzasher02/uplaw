import express from 'express';
import authenticationMiddleware from '../middleware/authentication.middleware.js';
import { requireRole } from '../middleware/rbac.middleware.js';
import { uploadCaseFiles } from '../middleware/multer.middleware.js';
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

const router = express.Router();

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
