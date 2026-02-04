import {
    createCaseService,
    getClientCasesService,
    getCaseByIdService,
    getSuggestedLawyersService,
    inviteLawyersService,
    updateCaseStatusService,
    getLawyerReceivedCasesService,
    updateInvitationStatusService,
} from '../services/case.services.js';
import asyncWrapper from '../middleware/asyncWrapper.js';
import { CASE_STATUS } from '../model/case.model.js';

/**
 * Case Controller - HTTP handlers for case-related endpoints
 */

/**
 * Create a new case
 * POST /cases
 */
export const createCase = asyncWrapper(async (req, res) => {
    const clientId = req.user.userId;
    const caseData = req.body;

    // Handle voice note file if uploaded
    const voiceNoteFile = req.file || null;

    const newCase = await createCaseService(caseData, clientId, voiceNoteFile);

    res.status(201).json([{
        success: true,
        message: 'Case created successfully',
        data: {
            case: newCase
        }
    }]);
});

/**
 * Get all cases for the logged-in client
 * GET /cases
 */
export const getMyCases = asyncWrapper(async (req, res) => {
    const clientId = req.user.userId;
    const { status } = req.query;

    const cases = await getClientCasesService(clientId, status);

    // Calculate counts by status
    res.status(200).json([{
        success: true,
        message: 'Cases retrieved successfully',
        data: {
            cases,
            counts: {
                total: cases.length,
                ...statusCounts,
                invitations: totalInvitations,
                proposals: totalProposals
            }
        }
    }]);
});
/**
 * Get a single case by ID
 * GET /cases/:id
 */
export const getCaseById = asyncWrapper(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.role;

    const caseDoc = await getCaseByIdService(id, userId, userRole);

    res.status(200).json([{
        success: true,
        message: 'Case retrieved successfully',
        data: {
            case: caseDoc
        }
    }]);
});

/**
 * Get suggested lawyers for a case
 * GET /cases/:id/lawyers
 */
export const getSuggestedLawyers = asyncWrapper(async (req, res) => {
    const { id } = req.params;
    const clientId = req.user.userId;

    const lawyers = await getSuggestedLawyersService(id, clientId);

    res.status(200).json([{
        success: true,
        message: 'Suggested lawyers retrieved successfully',
        data: {
            lawyers,
            count: lawyers.length
        }
    }]);
});

/**
 * Invite lawyers to a case
 * POST /cases/:id/invite
 */
export const inviteLawyers = asyncWrapper(async (req, res) => {
    const { id } = req.params;
    const { lawyerIds } = req.body;
    const clientId = req.user.userId;

    if (!lawyerIds || !Array.isArray(lawyerIds) || lawyerIds.length === 0) {
        return res.status(400).json([{
            success: false,
            message: 'Please provide an array of lawyer IDs',
            data: null
        }]);
    }

    const result = await inviteLawyersService(id, lawyerIds, clientId);

    res.status(200).json([{
        success: true,
        message: result.message,
        data: {
            invited: result.invited,
            skipped: result.skipped
        }
    }]);
});

/**
 * Update case status
 * PATCH /cases/:id/status
 */
export const updateCaseStatus = asyncWrapper(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const clientId = req.user.userId;

    const updatedCase = await updateCaseStatusService(id, clientId, status);

    res.status(200).json([{
        success: true,
        message: 'Case status updated successfully',
        data: {
            case: updatedCase
        }
    }]);
});

/**
 * Get received cases for a lawyer (invitations)
 * GET /cases/received
 */
export const getReceivedCases = asyncWrapper(async (req, res) => {
    const lawyerId = req.user.userId;
    const { status } = req.query;

    const invitations = await getLawyerReceivedCasesService(lawyerId, status);

    res.status(200).json([{
        success: true,
        message: 'Received cases retrieved successfully',
        data: {
            invitations,
            count: invitations.length
        }
    }]);
});

/**
 * Respond to a case invitation
 * PATCH /cases/invitations/:id/status
 */
export const respondToInvitation = asyncWrapper(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const lawyerId = req.user.userId;

    const invitation = await updateInvitationStatusService(id, lawyerId, status);

    res.status(200).json([{
        success: true,
        message: 'Invitation status updated successfully',
        data: {
            invitation
        }
    }]);
});
