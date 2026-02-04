import Case, { CASE_STATUS } from '../model/case.model.js';
import CaseInvitation, { INVITATION_STATUS } from '../model/caseinvitation.model.js';
import LawyerProfile from '../model/lawyerprofile.model.js';
import User from '../model/user.model.js';
import { BAD_REQUEST, NOT_FOUND, UNAUTHORIZED } from '../error/error.js';
import { ROLES } from '../utils/constants.js';
import { uploadToCloud } from './cloudinary.uploader.services.js';
import { parseJsonField } from '../utils/query.helper.utils.js';
import fs from 'fs';

/**
 * Case Service - Handles all case-related business logic
 */
/**
 * Map Profile to Lawyer (Batch 2 original logic)
 *
 * General Overview:
 * Transforms a raw database lawyer profile into a clean, client-facing lawyer object.
 * 
 * @param {Object} profile - LawyerProfile with populated userId
 * @param {Array<string>} includeFields - Additional profile fields to include
 * @returns {Object} - Formatted lawyer object
 */
function mapProfileToLawyer(profile, includeFields = []) {
    const lawyer = {
        lawyerId: profile.userId._id,
        fullName: profile.userId.fullName,
        profilePicture: profile.userId.profilePicture,
        areasOfPractice: profile.areasOfPractice,
        yearsOfExperience: profile.yearsOfExperience,
        city: profile.city,
        professionalBio: profile.professionalBio
    };

    // Add optional fields if requested
    if (includeFields.includes('courtJurisdiction')) {
        lawyer.courtJurisdiction = profile.courtJurisdiction;
    }
    if (includeFields.includes('languagesSpoken')) {
        lawyer.languagesSpoken = profile.languagesSpoken;
    }

    return lawyer;
}

async function _handleVoiceNoteUpload(voiceNoteFile) {
    if (!voiceNoteFile) return undefined;

    console.log('[Case Service] Voice note file received:', voiceNoteFile.originalname, voiceNoteFile.path);
    try {
        const uploadResult = await uploadToCloud(voiceNoteFile.path);
        console.log('[Case Service] Cloudinary upload result:', uploadResult);

        // Clean up temp file
        fs.unlink(voiceNoteFile.path, () => { });

        return {
            publicId: uploadResult.publicId,
            secureUrl: uploadResult.secureUrl,
            duration: null
        };
    } catch (error) {
        console.error('[Case Service] Voice note upload failed:', error);
        // Clean up temp file on error too
        if (fs.existsSync(voiceNoteFile.path)) {
            fs.unlink(voiceNoteFile.path, () => { });
        }
        return undefined;
    }
}

/**
 * Create Case (Batch 2 original logic)
 *
 * General Overview:
 * Creates a new legal case for a client, handling optional voice note uploads and initial status setting.
 * 
 * @param {Object} caseData - Case data from request
 * @param {String} clientId - Client's user ID
 * @param {Object} voiceNoteFile - Voice note file from multer (optional)
 * @returns {Object} Created case
 */
export async function createCaseService(caseData, clientId, voiceNoteFile = null) {
    // Parse preferredLanguages if it's a JSON string (from formdata)
    if (caseData.preferredLanguages !== undefined) {
        caseData.preferredLanguages = parseJsonField(caseData.preferredLanguages, []);
    }

    // Handle voice note upload
    const voiceNote = await _handleVoiceNoteUpload(voiceNoteFile);

    // Build case data, only include voiceNote if it exists
    const casePayload = {
        ...caseData,
        clientId,
        status: CASE_STATUS.PENDING
    };

    if (voiceNote) {
        casePayload.voiceNote = voiceNote;
    }

    const newCase = new Case(casePayload);

    await newCase.save();
    return newCase;
}

/**
 * Get Client Cases (Batch 2 original logic)
 *
 * General Overview:
 * Retrieves all cases owned by a specific client, optionally filtered by status, 
 * and automatically suggests relevant lawyers for each case.
 * 
 * @param {String} clientId - Client's user ID
 * @param {String} status - Optional status filter
 * @returns {Array} List of cases with suggested lawyers
 */
export async function getClientCasesService(clientId, status = null) {
    const query = { clientId };
    if (status && Object.values(CASE_STATUS).includes(status)) {
        query.status = status;
    }

    const cases = await Case.find(query)
        .sort({ createdAt: -1 })
        .lean();

    if (!cases.length) return [];

    // Collect all distinct categories from cases to optimize lawyer fetching
    const categories = [...new Set(cases.map(c => c.category).filter(Boolean))];

    // Fetch all potentially matching lawyers in one query
    const matchingProfiles = await LawyerProfile.find({
        areasOfPractice: { $in: categories },
        isProfileComplete: true
    })
        .populate({
            path: 'userId',
            select: 'fullName profilePicture accountStatus',
            match: { accountStatus: 'verified', isDeleted: false }
        })
        .select('userId areasOfPractice yearsOfExperience city courtJurisdiction languagesSpoken professionalBio')
        .lean();

    // Filter valid profiles
    const validProfiles = matchingProfiles.filter(p => p.userId !== null);

    // Map lawyers to cases in memory
    const casesWithLawyers = cases.map(caseDoc => {
        // Find lawyers that match this case's category
        const suggestedLawyersRaw = validProfiles.filter(profile =>
            profile.areasOfPractice && profile.areasOfPractice.includes(caseDoc.category)
        ).slice(0, 5); // Limit to 5

        const suggestedLawyers = suggestedLawyersRaw.map(profile =>
            mapProfileToLawyer(profile)
        );

        return {
            ...caseDoc,
            suggestedLawyers,
            suggestedLawyersCount: suggestedLawyers.length
        };
    });

    return casesWithLawyers;
}

/**
 * Get Case By ID (Batch 2 original logic)
 *
 * General Overview:
 * Fetches a specific case by its ID, enforcing strict ownership and permission checks 
 * based on the user's role (Client vs Lawyer).
 * 
 * @param {String} caseId - Case ID
 * @param {String} userId - Requesting user's ID
 * @param {String} userRole - User's role
 * @returns {Object} Case details
 */
export async function getCaseByIdService(caseId, userId, userRole) {
    const caseDoc = await Case.findById(caseId)
        .populate({
            path: 'clientId',
            select: 'fullName profilePicture'
        })
        .lean();

    if (!caseDoc) {
        throw new NOT_FOUND('Case not found');
    }

    // Client can only see their own cases
    if (userRole === ROLES.CLIENT) {
        if (caseDoc.clientId._id.toString() !== userId) {
            throw new UNAUTHORIZED('You do not have permission to view this case');
        }
    }

    // Lawyer can only see cases they are invited to or assigned to
    if (userRole === ROLES.LAWYER) {
        const isInvited = await CaseInvitation.exists({
            caseId,
            lawyerId: userId
        });
        const isAssigned = caseDoc.assignedLawyerId?.toString() === userId;

        if (!isInvited && !isAssigned) {
            throw new UNAUTHORIZED('You do not have permission to view this case');
        }
    }

    return caseDoc;
}

/**
 * Get Suggested Lawyers (Batch 2 original logic)
 *
 * General Overview:
 * Finds and suggests verified lawyers whose areas of practice match the category of the specified case.
 * 
 * @param {String} caseId - Case ID
 * @param {String} clientId - Client's user ID (for ownership check)
 * @returns {Array} List of suggested lawyers
 */
export async function getSuggestedLawyersService(caseId, clientId) {
    const caseDoc = await Case.findById(caseId).lean();

    if (!caseDoc) {
        throw new NOT_FOUND('Case not found');
    }

    if (caseDoc.clientId.toString() !== clientId) {
        throw new UNAUTHORIZED('You do not have permission to access this case');
    }

    // Find lawyers matching the case criteria
    const matchingProfiles = await LawyerProfile.find({
        areasOfPractice: { $in: [caseDoc.category] },
        isProfileComplete: true
    })
        .populate({
            path: 'userId',
            select: 'fullName profilePicture accountStatus',
            match: { accountStatus: 'verified', isDeleted: false }
        })
        .select('userId areasOfPractice yearsOfExperience city courtJurisdiction languagesSpoken professionalBio')
        .lean();

    // Filter out null users (from populate match)
    const lawyers = matchingProfiles
        .filter(profile => profile.userId !== null)
        .map(profile => mapProfileToLawyer(profile, ['courtJurisdiction', 'languagesSpoken']));

    return lawyers;
}

/**
 * Invite Lawyers (Batch 2 original logic)
 *
 * General Overview:
 * Sends invitations to selected lawyers to work on a specific case, handling duplication checks.
 * 
 * @param {String} caseId - Case ID
 * @param {Array} lawyerIds - Array of lawyer user IDs
 * @param {String} clientId - Client's user ID
 * @returns {Object} Invitation result
 */
export async function inviteLawyersService(caseId, lawyerIds, clientId) {
    const caseDoc = await Case.findById(caseId);

    if (!caseDoc) {
        throw new NOT_FOUND('Case not found');
    }

    if (caseDoc.clientId.toString() !== clientId) {
        throw new UNAUTHORIZED('You do not have permission to invite lawyers to this case');
    }

    if (caseDoc.status !== CASE_STATUS.PENDING && caseDoc.status !== CASE_STATUS.ACTIVE) {
        throw new BAD_REQUEST('Cannot invite lawyers to this case');
    }

    // Validate lawyer IDs
    const validLawyers = await User.find({
        _id: { $in: lawyerIds },
        role: ROLES.LAWYER,
        accountStatus: 'verified',
        isDeleted: false
    }).select('_id');

    const validLawyerIds = validLawyers.map(l => l._id.toString());

    if (validLawyerIds.length === 0) {
        throw new BAD_REQUEST('No valid lawyers found to invite');
    }

    // Create invitations (skip duplicates)
    const invitations = [];
    const skipped = [];

    for (const lawyerId of validLawyerIds) {
        try {
            const invitation = await CaseInvitation.create({
                caseId,
                lawyerId,
                clientId,
                status: INVITATION_STATUS.PENDING
            });
            invitations.push(invitation);
        } catch (error) {
            // Duplicate key error (already invited)
            if (error.code === 11000) {
                skipped.push(lawyerId);
            } else {
                throw error;
            }
        }
    }

    // Update invitation count
    await Case.findByIdAndUpdate(caseId, {
        $inc: { invitationCount: invitations.length }
    });

    return {
        invited: invitations.length,
        skipped: skipped.length,
        message: `Successfully invited ${invitations.length} lawyer(s)`
    };
}

/**
 * Get Lawyer Received Cases (Batch 2 original logic)
 *
 * General Overview:
 * Retrieves all case invitations received by a specific lawyer, populating case details.
 * 
 * @param {String} lawyerId - Lawyer's user ID
 * @param {String} status - Optional invitation status filter
 * @returns {Array} List of case invitations
 */
export async function getLawyerReceivedCasesService(lawyerId, status = null) {
    const query = { lawyerId };
    if (status && Object.values(INVITATION_STATUS).includes(status)) {
        query.status = status;
    }

    const invitations = await CaseInvitation.find(query)
        .populate({
            path: 'caseId',
            select: 'title description category budgetRange province district court urgency preferredLanguages status proposalCount voiceNote createdAt',
            populate: {
                path: 'clientId',
                select: 'fullName profilePicture'
            }
        })
        .sort({ createdAt: -1 })
        .lean();

    // Filter out invitations where case was deleted
    return invitations.filter(inv => inv.caseId !== null);
}

/**
 * Update Invitation Status (Batch 2 original logic)
 *
 * General Overview:
 * Updates the status of a case invitation (e.g., Accept/Decline) for a lawyer.
 * 
 * @param {String} invitationId - Invitation ID
 * @param {String} lawyerId - Lawyer's user ID
 * @param {String} newStatus - New status
 * @returns {Object} Updated invitation
 */
export async function updateInvitationStatusService(invitationId, lawyerId, newStatus) {
    if (!Object.values(INVITATION_STATUS).includes(newStatus)) {
        throw new BAD_REQUEST('Invalid invitation status');
    }

    const invitation = await CaseInvitation.findOne({
        _id: invitationId,
        lawyerId
    });

    if (!invitation) {
        throw new NOT_FOUND('Invitation not found');
    }

    if (invitation.status === INVITATION_STATUS.ACCEPTED ||
        invitation.status === INVITATION_STATUS.DECLINED) {
        throw new BAD_REQUEST('Invitation has already been responded to');
    }

    invitation.status = newStatus;
    invitation.respondedAt = new Date();
    await invitation.save();

    return invitation;
}

/**
 * Update Case Status (Batch 2 original logic)
 *
 * General Overview:
 * Updates the overall status of a case (e.g., Active, Completed) by the client owner.
 * 
 * @param {String} caseId - Case ID
 * @param {String} clientId - Client's user ID
 * @param {String} newStatus - New status
 * @returns {Object} Updated case
 */
export async function updateCaseStatusService(caseId, clientId, newStatus) {
    if (!Object.values(CASE_STATUS).includes(newStatus)) {
        throw new BAD_REQUEST('Invalid case status');
    }

    const caseDoc = await Case.findOne({ _id: caseId, clientId });

    if (!caseDoc) {
        throw new NOT_FOUND('Case not found');
    }

    caseDoc.status = newStatus;
    await caseDoc.save();

    return caseDoc;
}
