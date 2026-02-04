import {
    createProposalService,
    getReceivedProposalsService,
    getSentProposalsService,
    getProposalByIdService,
    respondToProposalService,
    withdrawProposalService,
} from '../services/proposal.services.js';
import asyncWrapper from '../middleware/asyncWrapper.js';

/**
 * Proposal Controller - HTTP handlers for proposal-related endpoints
 */

/**
 * Create a new proposal (lawyer submits to a case)
 * POST /proposals
 */
export const createProposal = asyncWrapper(async (req, res) => {
    const lawyerId = req.user.userId;
    const proposalData = req.body;

    const proposal = await createProposalService(proposalData, lawyerId);

    res.status(201).json([{
        success: true,
        message: 'Proposal submitted successfully',
        data: {
            proposal
        }
    }]);
});

/**
 * Get proposals received by the logged-in client
 * GET /proposals/received
 */
export const getReceivedProposals = asyncWrapper(async (req, res) => {
    const clientId = req.user.userId;
    const { caseId, status } = req.query;

    const proposals = await getReceivedProposalsService(clientId, caseId, status);

    res.status(200).json([{
        success: true,
        message: 'Proposals retrieved successfully',
        data: {
            proposals,
            count: proposals.length
        }
    }]);
});

/**
 * Get proposals sent by the logged-in lawyer
 * GET /proposals/sent
 */
export const getSentProposals = asyncWrapper(async (req, res) => {
    const lawyerId = req.user.userId;
    const { status } = req.query;

    const proposals = await getSentProposalsService(lawyerId, status);

    res.status(200).json([{
        success: true,
        message: 'Proposals retrieved successfully',
        data: {
            proposals,
            count: proposals.length
        }
    }]);
});

/**
 * Get a single proposal by ID
 * GET /proposals/:id
 */
export const getProposalById = asyncWrapper(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.role;

    const proposal = await getProposalByIdService(id, userId, userRole);

    res.status(200).json([{
        success: true,
        message: 'Proposal retrieved successfully',
        data: {
            proposal
        }
    }]);
});

/**
 * Respond to a proposal (accept/reject)
 * PATCH /proposals/:id/respond
 */
export const respondToProposal = asyncWrapper(async (req, res) => {
    const { id } = req.params;
    const { action, responseNote } = req.body;
    const clientId = req.user.userId;

    if (!action || !['accept', 'reject'].includes(action)) {
        return res.status(400).json([{
            success: false,
            message: 'Please provide a valid action (accept or reject)',
            data: null
        }]);
    }

    const proposal = await respondToProposalService(id, clientId, action, responseNote);

    const message = action === 'accept'
        ? 'Proposal accepted successfully'
        : 'Proposal rejected successfully';

    res.status(200).json([{
        success: true,
        message,
        data: {
            proposal
        }
    }]);
});

/**
 * Withdraw a proposal (lawyer action)
 * PATCH /proposals/:id/withdraw
 */
export const withdrawProposal = asyncWrapper(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.user.userId;

    const proposal = await withdrawProposalService(id, lawyerId);

    res.status(200).json([{
        success: true,
        message: 'Proposal withdrawn successfully',
        data: {
            proposal
        }
    }]);
});
