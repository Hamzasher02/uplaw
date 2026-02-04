import express from 'express';
import authenticationMiddleware from '../middleware/authentication.middleware.js';
import { requireRole } from '../middleware/rbac.middleware.js';
import { ROLES } from '../utils/constants.js';
import {
    createProposal,
    getReceivedProposals,
    getSentProposals,
    getProposalById,
    respondToProposal,
    withdrawProposal
} from '../controller/proposal.controller.js';

const router = express.Router();

// All routes require authentication
router.use(authenticationMiddleware);

// =============== CLIENT ROUTES ===============

/**
 * @route   GET /proposals/received
 * @desc    Get all proposals received by the client
 * @access  Client only
 */
router.get(
    '/received',
    requireRole(ROLES.CLIENT),
    getReceivedProposals
);

/**
 * @route   PATCH /proposals/:id/respond
 * @desc    Accept or reject a proposal
 * @access  Client only
 */
router.patch(
    '/:id/respond',
    requireRole(ROLES.CLIENT),
    respondToProposal
);

// =============== LAWYER ROUTES ===============

/**
 * @route   POST /proposals
 * @desc    Create a new proposal
 * @access  Lawyer only
 */
router.post(
    '/',
    requireRole(ROLES.LAWYER),
    createProposal
);

/**
 * @route   GET /proposals/sent
 * @desc    Get all proposals sent by the lawyer
 * @access  Lawyer only
 */
router.get(
    '/sent',
    requireRole(ROLES.LAWYER),
    getSentProposals
);

/**
 * @route   PATCH /proposals/:id/withdraw
 * @desc    Withdraw a proposal
 * @access  Lawyer only
 */
router.patch(
    '/:id/withdraw',
    requireRole(ROLES.LAWYER),
    withdrawProposal
);

// =============== SHARED ROUTES ===============

/**
 * @route   GET /proposals/:id
 * @desc    Get a single proposal by ID
 * @access  Client (owner) or Lawyer (owner)
 */
router.get(
    '/:id',
    requireRole(ROLES.CLIENT, ROLES.LAWYER),
    getProposalById
);

export default router;
