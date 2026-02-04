import Proposal, { PROPOSAL_STATUS } from '../model/proposal.model.js';
import Case, { CASE_STATUS } from '../model/case.model.js';
import CaseInvitation, { INVITATION_STATUS } from '../model/caseinvitation.model.js';
import User from '../model/user.model.js';
import { BAD_REQUEST, NOT_FOUND, UNAUTHORIZED } from '../error/error.js';
import { ROLES } from '../utils/constants.js';
import { enrichWithLawyerProfile } from '../utils/query.helper.utils.js';

/**
 * Proposal Service - Handles all proposal-related business logic
 */
/**
 * Create a new proposal (lawyer submits to a case)
 * @param {Object} proposalData - Proposal data from request
 * @param {String} lawyerId - Lawyer's user ID
 * @returns {Object} Created proposal
 */
export async function createProposalService(proposalData, lawyerId) {
    const { caseId } = proposalData;

    // Verify case exists and is active
    const caseDoc = await Case.findById(caseId);
    if (!caseDoc) {
        throw new NOT_FOUND('Case not found');
    }

    if (caseDoc.status !== CASE_STATUS.PENDING && caseDoc.status !== CASE_STATUS.ACTIVE) {
        throw new BAD_REQUEST('Cannot submit proposal to this case');
    }

    // Verify lawyer is invited to this case
    const invitation = await CaseInvitation.findOne({
        caseId,
        lawyerId,
        status: { $in: [INVITATION_STATUS.PENDING, INVITATION_STATUS.VIEWED, INVITATION_STATUS.ACCEPTED] }
    });

    if (!invitation) {
        throw new UNAUTHORIZED('You must be invited to this case to submit a proposal');
    }

    // Check if lawyer already submitted a proposal
    const existingProposal = await Proposal.findOne({ caseId, lawyerId });
    if (existingProposal) {
        throw new BAD_REQUEST('You have already submitted a proposal for this case');
    }

    // Create proposal
    const proposal = new Proposal({
        ...proposalData,
        lawyerId,
        clientId: caseDoc.clientId,
        status: PROPOSAL_STATUS.PENDING
    });

    await proposal.save();

    // Update case proposal count
    await Case.findByIdAndUpdate(caseId, {
        $inc: { proposalCount: 1 }
    });

    // Update invitation status to accepted (lawyer engaged with case)
    if (invitation.status !== INVITATION_STATUS.ACCEPTED) {
        invitation.status = INVITATION_STATUS.ACCEPTED;
        await invitation.save();
    }

    return proposal;
}

/**
 * Get proposals received by a client
 * @param {String} clientId - Client's user ID
 * @param {String} caseId - Optional case ID filter
 * @param {String} status - Optional status filter
 * @returns {Array} List of proposals
 */
export async function getReceivedProposalsService(clientId, caseId = null, status = null) {
    const query = { clientId };

    if (caseId) {
        query.caseId = caseId;
    }

    if (status && Object.values(PROPOSAL_STATUS).includes(status)) {
        query.status = status;
    }

    const proposals = await Proposal.find(query)
        .populate({
            path: 'lawyerId',
            select: 'fullName profilePicture' // Minimized
        })
        .populate({
            path: 'caseId',
            select: 'title category status' // Minimized
        })
        .sort({ createdAt: -1 })
        .lean();

    // Enrich with lawyer profile data (flatter implementation)
    const enrichedProposals = await Promise.all(
        proposals.map(async (proposal) => {
            const proposalObj = { ...proposal };

            // Post-process lawyer data to flatten
            if (proposalObj.lawyerId) {
                const lawyerProfile = await enrichWithLawyerProfile(
                    proposalObj.lawyerId._id,
                    'areasOfPractice yearsOfExperience city'
                );

                if (lawyerProfile) {
                    const { _id: profileId, userId, ...profileFields } = lawyerProfile;

                    // Create flat lawyer object
                    proposalObj.lawyer = {
                        ...proposalObj.lawyerId, // User fields (fullName, profilePicture)
                        ...profileFields        // Profile fields flattened
                    };
                } else {
                    proposalObj.lawyer = proposalObj.lawyerId;
                }

                delete proposalObj.lawyerId; // Remove original to avoid duplication
            }

            // Remove redundant clientId if it's just the ID and we queried by it
            // (Optional, but user asked to remove duplicates. Keeping logic minimal)

            return proposalObj;
        })
    );

    return enrichedProposals;
}

/**
 * Get proposals sent by a lawyer
 * @param {String} lawyerId - Lawyer's user ID
 * @param {String} status - Optional status filter
 * @returns {Array} List of proposals
 */
export async function getSentProposalsService(lawyerId, status = null) {
    const query = { lawyerId };

    if (status && Object.values(PROPOSAL_STATUS).includes(status)) {
        query.status = status;
    }

    const proposals = await Proposal.find(query)
        .populate({
            path: 'caseId',
            select: 'title category budgetRange province district status createdAt'
        })
        .populate({
            path: 'clientId',
            select: 'fullName profilePicture'
        })
        .sort({ createdAt: -1 })
        .lean();

    return proposals;
}

/**
 * Get a single proposal by ID with access check
 * @param {String} proposalId - Proposal ID
 * @param {String} userId - Requesting user's ID
 * @param {String} userRole - User's role
 * @returns {Object} Proposal details
 */
export async function getProposalByIdService(proposalId, userId, userRole) {
    // 1. Fetch proposal basic data first to check permissions
    const proposalRaw = await Proposal.findById(proposalId);

    if (!proposalRaw) {
        throw new NOT_FOUND('Proposal not found');
    }

    // 2. Validate Access
    const isClient = userRole === ROLES.CLIENT && proposalRaw.clientId.toString() === userId;
    const isLawyer = userRole === ROLES.LAWYER && proposalRaw.lawyerId.toString() === userId;

    if (!isClient && !isLawyer) {
        throw new UNAUTHORIZED('You do not have permission to view this proposal');
    }

    // 3. Conditional Population
    const populates = [
        {
            path: 'caseId',
            select: 'title description category budgetRange province district court status'
        }
    ];

    // If Client is viewing -> Show Lawyer Details
    if (isClient) {
        populates.push({
            path: 'lawyerId',
            select: 'fullName profilePicture' // Minimal user fields
        });
        // Don't populate clientId (user knows who they are)
    }

    // If Lawyer is viewing -> Show Client Details
    if (isLawyer) {
        populates.push({
            path: 'clientId',
            select: 'fullName profilePicture' // Minimal user fields
        });
        // Don't populate lawyerId (user knows who they are)
    }

    // Execute population
    await proposalRaw.populate(populates);

    // 4. Transform Response (Enrichment)
    const proposalObj = proposalRaw.toObject();

    // Handle Client Logic: Mark as viewed + Enrich Lawyer Profile
    if (isClient) {
        // Mark as viewed
        if (proposalRaw.status === PROPOSAL_STATUS.PENDING) {
            proposalRaw.status = PROPOSAL_STATUS.VIEWED;
            proposalRaw.viewedAt = new Date();
            await proposalRaw.save();
            proposalObj.status = PROPOSAL_STATUS.VIEWED; // Update returned obj
        }

        // Enrich Lawyer Profile
        if (proposalObj.lawyerId) {
            const lawyerProfile = await enrichWithLawyerProfile(
                proposalObj.lawyerId._id,
                'areasOfPractice yearsOfExperience city courtJurisdiction languagesSpoken professionalBio'
            );

            if (lawyerProfile) {
                const { _id, userId, ...profileFields } = lawyerProfile;
                proposalObj.lawyer = {
                    ...proposalObj.lawyerId, // user fields
                    ...profileFields         // profile fields
                };
            } else {
                proposalObj.lawyer = proposalObj.lawyerId;
            }
            delete proposalObj.lawyerId; // Clean up
        }
    }

    // Handle Lawyer Logic: Just restructure if needed
    if (isLawyer) {
        // If we populated clientId, rename or structure it nicely?
        // The request says "Client's details (name, profile picture)".
        // Default `clientId` field has this text. We can leave it or alias it to `client`.

        // Just ensure no lawyerId (user's own) is waiting to be enriched if we didn't populate it.
        // (We didn't populate it, so it's just an ID string, which is fine/minimal).
    }

    return proposalObj;
}

/**
 * Respond to a proposal (accept/reject)
 * @param {String} proposalId - Proposal ID
 * @param {String} clientId - Client's user ID
 * @param {String} action - 'accept' or 'reject'
 * @param {String} responseNote - Optional note
 * @returns {Object} Updated proposal
 */
export async function respondToProposalService(proposalId, clientId, action, responseNote = null) {
    const proposal = await Proposal.findOne({
        _id: proposalId,
        clientId
    });

    if (!proposal) {
        throw new NOT_FOUND('Proposal not found');
    }

    if (proposal.status === PROPOSAL_STATUS.ACCEPTED ||
        proposal.status === PROPOSAL_STATUS.REJECTED) {
        throw new BAD_REQUEST('Proposal has already been responded to');
    }

    const newStatus = action === 'accept' ? PROPOSAL_STATUS.ACCEPTED : PROPOSAL_STATUS.REJECTED;

    proposal.status = newStatus;
    proposal.respondedAt = new Date();
    if (responseNote) {
        proposal.responseNote = responseNote;
    }

    await proposal.save();

    // If accepted, update case status and assign lawyer
    if (newStatus === PROPOSAL_STATUS.ACCEPTED) {
        await Case.findByIdAndUpdate(proposal.caseId, {
            status: CASE_STATUS.ACTIVE,
            assignedLawyerId: proposal.lawyerId,
            assignedAt: new Date()
        });

        // Auto-create timeline for the case (idempotent - will not fail if exists)
        const { createTimelineService } = await import('./timeline.services.js');
        await createTimelineService(proposal.caseId);

        // Reject all other pending proposals for this case
        await Proposal.updateMany(
            {
                caseId: proposal.caseId,
                _id: { $ne: proposalId },
                status: { $in: [PROPOSAL_STATUS.PENDING, PROPOSAL_STATUS.VIEWED] }
            },
            {
                status: PROPOSAL_STATUS.REJECTED,
                respondedAt: new Date(),
                responseNote: 'Another proposal was accepted'
            }
        );
    }

    return proposal;
}

/**
 * Withdraw a proposal (lawyer action)
 * @param {String} proposalId - Proposal ID
 * @param {String} lawyerId - Lawyer's user ID
 * @returns {Object} Updated proposal
 */
export async function withdrawProposalService(proposalId, lawyerId) {
    const proposal = await Proposal.findOne({
        _id: proposalId,
        lawyerId
    });

    if (!proposal) {
        throw new NOT_FOUND('Proposal not found');
    }

    if (proposal.status === PROPOSAL_STATUS.ACCEPTED) {
        throw new BAD_REQUEST('Cannot withdraw an accepted proposal');
    }

    if (proposal.status === PROPOSAL_STATUS.WITHDRAWN) {
        throw new BAD_REQUEST('Proposal has already been withdrawn');
    }

    proposal.status = PROPOSAL_STATUS.WITHDRAWN;
    await proposal.save();

    // Decrement case proposal count
    await Case.findByIdAndUpdate(proposal.caseId, {
        $inc: { proposalCount: -1 }
    });

    return proposal;
}
