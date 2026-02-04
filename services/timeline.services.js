import CaseTimeline from '../model/caseTimeline.model.js';
import Case, { CASE_STATUS } from '../model/case.model.js';
import { BAD_REQUEST, NOT_FOUND, UNAUTHORIZED, FORBIDDEN } from '../error/error.js';
import { ROLES, PHASE_KEYS, PHASE_STATUS, OUTCOME_TYPE, PHASE_SLUG_MAP, NEXT_PHASE_MAP } from '../utils/constants.js';
import { uploadToCloud, deleteFromCloud } from './cloudinary.uploader.services.js';
import cleanupUploadedFiles from '../utils/cleanup.helper.utils.js';

/**
 * Create timeline for a case (called automatically on proposal acceptance)
 * Idempotent - does not fail if timeline already exists
 * @param {String} caseId - Case ID
 * @returns {Object} Created or existing timeline
 */
export async function createTimelineService(caseId) {
    // Check if timeline already exists (idempotent)
    const existing = await CaseTimeline.findOne({ caseId });
    if (existing) {
        return existing; // Already exists, return it
    }

    // Verify case exists
    const caseExists = await Case.findById(caseId);
    if (!caseExists) {
        throw new NOT_FOUND('Case not found');
    }

    // Create new timeline with phase1 = ongoing, rest = pending
    const timeline = await CaseTimeline.create({
        caseId,
        phases: {
            phase1CaseIntake: {
                status: PHASE_STATUS.ONGOING,
                data: {}
            },
            phase2CaseFiled: {
                status: PHASE_STATUS.PENDING,
                data: {}
            },
            phase3TrialPreparation: {
                status: PHASE_STATUS.PENDING,
                data: {}
            },
            phase4CourtHearing: {
                status: PHASE_STATUS.PENDING,
                subPhases: []
            },
            phase5Outcome: {
                status: PHASE_STATUS.PENDING,
                data: {}
            }
        }
    });

    return timeline;
}

/**
 * Get timeline for a case with ownership/assignment check
 * @param {String} caseId - Case ID
 * @param {String} userId - User ID
 * @param {String} userRole - User role
 * @returns {Object} Timeline with case info and progress
 */
export async function getTimelineService(caseId, userId, userRole) {
    // Get case with ownership check
    const caseDoc = await Case.findById(caseId);
    if (!caseDoc) {
        throw new NOT_FOUND('Case not found');
    }

    // Authorization: client must own case OR lawyer must be assigned
    if (userRole === ROLES.CLIENT) {
        if (caseDoc.clientId.toString() !== userId.toString()) {
            throw new FORBIDDEN('You can only view timeline for your own cases');
        }
    } else if (userRole === ROLES.LAWYER) {
        if (!caseDoc.assignedLawyerId || caseDoc.assignedLawyerId.toString() !== userId.toString()) {
            throw new FORBIDDEN('You can only view timeline for cases assigned to you');
        }
    } else {
        throw new FORBIDDEN('Invalid role for this operation');
    }

    // Get timeline
    const timeline = await CaseTimeline.findOne({ caseId });
    if (!timeline) {
        throw new NOT_FOUND('Timeline not found for this case');
    }

    // Calculate progress
    const progress = timeline.calculateProgress();

    // Build response
    return {
        case: {
            caseId: caseDoc._id,
            title: caseDoc.title,
            category: caseDoc.category,
            status: caseDoc.status
        },
        progress,
        phases: {
            phase1CaseIntake: {
                key: 'case-intake',
                name: 'Case Intake',
                status: timeline.phases.phase1CaseIntake.status,
                data: timeline.phases.phase1CaseIntake.data
            },
            phase2CaseFiled: {
                key: 'case-filed',
                name: 'Case Filed',
                status: timeline.phases.phase2CaseFiled.status,
                data: timeline.phases.phase2CaseFiled.data
            },
            phase3TrialPreparation: {
                key: 'trial-preparation',
                name: 'Trial Preparation',
                status: timeline.phases.phase3TrialPreparation.status,
                data: timeline.phases.phase3TrialPreparation.data
            },
            phase4CourtHearing: {
                key: 'court-hearing',
                name: 'Court Hearing',
                status: timeline.phases.phase4CourtHearing.status,
                subPhases: timeline.phases.phase4CourtHearing.subPhases
            },
            phase5Outcome: {
                key: 'case-outcome',
                name: 'Case Outcome/Closure',
                status: timeline.phases.phase5Outcome.status,
                data: timeline.phases.phase5Outcome.data
            }
        }
    };
}

/**
 * Submit phase data (phases 1, 2, 3, or 5)
 * @param {String} caseId - Case ID
 * @param {String} phaseSlug - Phase slug (case-intake, case-filed, trial-preparation, case-outcome)
 * @param {Object} data - Phase data (remarks, outcome for phase5)
 * @param {Array} files - Uploaded files
 * @param {String} lawyerId - Lawyer user ID
 * @returns {Object} Updated timeline
 */
export async function submitPhaseDataService(caseId, phaseSlug, data, files, lawyerId) {
    // Map slug to internal key
    const phaseKey = PHASE_SLUG_MAP[phaseSlug];
    if (!phaseKey) {
        throw new BAD_REQUEST('Invalid phase key');
    }

    // Validate: only phases 1, 2, 3, 5 can be submitted via this endpoint
    if (phaseKey === PHASE_KEYS.COURT_HEARING) {
        throw new BAD_REQUEST('Court hearing phase must be managed via subphases endpoint');
    }

    // Get case and verify lawyer is assigned
    const caseDoc = await Case.findById(caseId);
    if (!caseDoc) {
        throw new NOT_FOUND('Case not found');
    }

    if (!caseDoc.assignedLawyerId || caseDoc.assignedLawyerId.toString() !== lawyerId.toString()) {
        throw new FORBIDDEN('Only the assigned lawyer can submit phase data');
    }

    // For phase 5, outcome is required
    if (phaseKey === PHASE_KEYS.CASE_OUTCOME) {
        if (!data.outcome || !Object.values(OUTCOME_TYPE).includes(data.outcome)) {
            throw new BAD_REQUEST('Valid outcome (won, settled, dismissed) is required for case outcome phase');
        }
    }

    // Upload documents to Cloudinary with rollback support
    const uploadedDocs = [];
    const uploadedPublicIds = [];

    if (files && files.length > 0) {
        try {
            for (const file of files) {
                const result = await uploadToCloud(file.path);
                uploadedDocs.push({
                    publicId: result.publicId,
                    secureUrl: result.secureUrl,
                    originalName: file.originalname,
                    fileSize: file.size,
                    mimetype: file.mimetype
                });
                uploadedPublicIds.push(result.publicId);
            }

            // Cleanup temp files after successful upload
            const mockReq = { files };
            cleanupUploadedFiles(mockReq);
        } catch (uploadError) {
            // Rollback: delete already uploaded files from Cloudinary
            for (const publicId of uploadedPublicIds) {
                try {
                    await deleteFromCloud(publicId);
                } catch (deleteError) {
                    console.error(`Failed to delete ${publicId} from Cloudinary:`, deleteError);
                }
            }

            // Cleanup temp files
            const mockReq = { files };
            cleanupUploadedFiles(mockReq);

            throw uploadError;
        }
    }

    // Prepare phase data
    let phaseData;
    if (phaseKey === PHASE_KEYS.CASE_OUTCOME) {
        // Phase 5 has outcome field
        phaseData = {
            outcome: data.outcome,
            documents: uploadedDocs,
            judgeCourtRemarks: data.judgeCourtRemarks || '',
            lawyerRemarks: data.lawyerRemarks || '',
            opponentRemarks: data.opponentRemarks || '',
            submittedAt: new Date(),
            submittedBy: lawyerId
        };
    } else {
        // Phases 1, 2, 3
        phaseData = {
            documents: uploadedDocs,
            judgeCourtRemarks: data.judgeCourtRemarks || '',
            lawyerRemarks: data.lawyerRemarks || '',
            opponentRemarks: data.opponentRemarks || '',
            submittedAt: new Date(),
            submittedBy: lawyerId
        };
    }

    // ATOMIC UPDATE: Use aggregation pipeline to update current and next phase in single operation
    const updateQuery = {
        caseId,
        [`phases.${phaseKey}.status`]: PHASE_STATUS.ONGOING
    };

    const nextPhaseKey = NEXT_PHASE_MAP[phaseKey];
    const updateOperation = [
        {
            $set: {
                [`phases.${phaseKey}.data`]: phaseData,
                [`phases.${phaseKey}.status`]: PHASE_STATUS.COMPLETED,
                // Conditionally update next phase to ongoing if it's pending (atomic)
                ...(nextPhaseKey && {
                    [`phases.${nextPhaseKey}.status`]: {
                        $cond: {
                            if: { $eq: [`$phases.${nextPhaseKey}.status`, PHASE_STATUS.PENDING] },
                            then: PHASE_STATUS.ONGOING,
                            else: `$phases.${nextPhaseKey}.status`
                        }
                    }
                })
            }
        }
    ];

    let timeline;
    try {
        timeline = await CaseTimeline.findOneAndUpdate(
            updateQuery,
            updateOperation,
            { new: true, runValidators: true }
        );

        if (!timeline) {
            // Phase was not in ONGOING state - rollback Cloudinary uploads
            const rollbackError = new BAD_REQUEST('Phase is not in ongoing state or already completed');

            for (const publicId of uploadedPublicIds) {
                try {
                    await deleteFromCloud(publicId);
                } catch (deleteError) {
                    console.error(`Rollback failed to delete ${publicId} from Cloudinary:`, deleteError);
                }
            }

            throw rollbackError;
        }

        // On phase 5 completion, set case status to completed
        if (phaseKey === PHASE_KEYS.CASE_OUTCOME) {
            await Case.findByIdAndUpdate(caseId, {
                status: CASE_STATUS.COMPLETED
            });
        }

        // Return updated timeline summary (exact same response structure as before)
        const progress = timeline.calculateProgress();
        return {
            message: 'Phase submitted successfully',
            progress,
            phases: timeline.phases
        };
    } catch (error) {
        // If DB operation fails, rollback Cloudinary uploads without masking the original error
        if (uploadedPublicIds.length > 0) {
            for (const publicId of uploadedPublicIds) {
                try {
                    await deleteFromCloud(publicId);
                } catch (deleteError) {
                    console.error(`Rollback failed to delete ${publicId} from Cloudinary:`, deleteError);
                }
            }
        }
        throw error;
    }
}

/**
 * Add court hearing sub-phase (phase 4)
 * @param {String} caseId - Case ID
 * @param {Object} data - Subphase data (name, remarks)
 * @param {Array} files - Uploaded files
 * @param {String} lawyerId - Lawyer user ID
 * @returns {Object} Updated timeline
 */
export async function addCourtHearingSubPhaseService(caseId, data, files, lawyerId) {
    // Get case and verify lawyer is assigned
    const caseDoc = await Case.findById(caseId);
    if (!caseDoc) {
        throw new NOT_FOUND('Case not found');
    }

    if (!caseDoc.assignedLawyerId || caseDoc.assignedLawyerId.toString() !== lawyerId.toString()) {
        throw new FORBIDDEN('Only the assigned lawyer can add court hearing subphases');
    }

    // Validate name is provided
    if (!data.name || data.name.trim() === '') {
        throw new BAD_REQUEST('Subphase name is required');
    }

    // Upload documents to Cloudinary with rollback support
    const uploadedDocs = [];
    const uploadedPublicIds = [];

    if (files && files.length > 0) {
        try {
            for (const file of files) {
                const result = await uploadToCloud(file.path);
                uploadedDocs.push({
                    publicId: result.publicId,
                    secureUrl: result.secureUrl,
                    originalName: file.originalname,
                    fileSize: file.size,
                    mimetype: file.mimetype
                });
                uploadedPublicIds.push(result.publicId);
            }

            // Cleanup temp files after successful upload
            const mockReq = { files };
            cleanupUploadedFiles(mockReq);
        } catch (uploadError) {
            // Rollback: delete already uploaded files from Cloudinary
            for (const publicId of uploadedPublicIds) {
                try {
                    await deleteFromCloud(publicId);
                } catch (deleteError) {
                    console.error(`Failed to delete ${publicId} from Cloudinary:`, deleteError);
                }
            }

            // Cleanup temp files
            const mockReq = { files };
            cleanupUploadedFiles(mockReq);

            throw uploadError;
        }
    }

    // Create subphase entry
    const subPhase = {
        name: data.name.trim(),
        documents: uploadedDocs,
        judgeCourtRemarks: data.judgeCourtRemarks || '',
        lawyerRemarks: data.lawyerRemarks || '',
        opponentRemarks: data.opponentRemarks || '',
        submittedAt: new Date(),
        submittedBy: lawyerId
    };

    // ATOMIC UPDATE: findOneAndUpdate with $push to prevent race conditions
    const updateQuery = {
        caseId,
        'phases.phase4CourtHearing.status': PHASE_STATUS.ONGOING
    };

    const updateOperation = {
        $push: {
            'phases.phase4CourtHearing.subPhases': subPhase
        }
    };

    try {
        const timeline = await CaseTimeline.findOneAndUpdate(
            updateQuery,
            updateOperation,
            { new: true, runValidators: true }
        );

        if (!timeline) {
            // Phase was not in ONGOING state - rollback Cloudinary uploads
            const rollbackError = new BAD_REQUEST('Court hearing phase is not ongoing. Can only add subphases when phase is ongoing.');

            for (const publicId of uploadedPublicIds) {
                try {
                    await deleteFromCloud(publicId);
                } catch (deleteError) {
                    console.error(`Rollback failed to delete ${publicId} from Cloudinary:`, deleteError);
                }
            }

            throw rollbackError;
        }

        // Return updated timeline
        const progress = timeline.calculateProgress();
        return {
            message: 'Court hearing subphase added successfully',
            progress,
            subPhase,
            totalSubPhases: timeline.phases.phase4CourtHearing.subPhases.length
        };
    } catch (error) {
        // If DB operation fails, rollback Cloudinary uploads without masking the original error
        if (uploadedPublicIds.length > 0) {
            for (const publicId of uploadedPublicIds) {
                try {
                    await deleteFromCloud(publicId);
                } catch (deleteError) {
                    console.error(`Rollback failed to delete ${publicId} from Cloudinary:`, deleteError);
                }
            }
        }
        throw error;
    }
}

/**
 * Complete court hearing phase (phase 4)
 * @param {String} caseId - Case ID
 * @param {String} lawyerId - Lawyer user ID
 * @returns {Object} Updated timeline
 */
export async function completeCourtHearingService(caseId, lawyerId) {
    // Get case and verify lawyer is assigned
    const caseDoc = await Case.findById(caseId);
    if (!caseDoc) {
        throw new NOT_FOUND('Case not found');
    }

    if (!caseDoc.assignedLawyerId || caseDoc.assignedLawyerId.toString() !== lawyerId.toString()) {
        throw new FORBIDDEN('Only the assigned lawyer can complete court hearing phase');
    }

    // First, get timeline to check subphases count
    const timelineCheck = await CaseTimeline.findOne({ caseId });
    if (!timelineCheck) {
        throw new NOT_FOUND('Timeline not found for this case');
    }

    // Require at least 1 subphase
    const phase4 = timelineCheck.phases.phase4CourtHearing;
    if (!phase4.subPhases || phase4.subPhases.length === 0) {
        throw new BAD_REQUEST('At least one court hearing subphase is required before completing this phase');
    }

    // ATOMIC UPDATE: Use aggregation pipeline to complete phase4 and activate phase5 in single operation
    const updateQuery = {
        caseId,
        'phases.phase4CourtHearing.status': PHASE_STATUS.ONGOING,
        'phases.phase4CourtHearing.subPhases.0': { $exists: true } // Ensure at least 1 subphase exists
    };

    const updateOperation = [
        {
            $set: {
                'phases.phase4CourtHearing.status': PHASE_STATUS.COMPLETED,
                // Conditionally update phase5 to ongoing if it's pending (atomic)
                'phases.phase5Outcome.status': {
                    $cond: {
                        if: { $eq: ['$phases.phase5Outcome.status', PHASE_STATUS.PENDING] },
                        then: PHASE_STATUS.ONGOING,
                        else: '$phases.phase5Outcome.status'
                    }
                }
            }
        }
    ];

    const timeline = await CaseTimeline.findOneAndUpdate(
        updateQuery,
        updateOperation,
        { new: true, runValidators: true }
    );

    if (!timeline) {
        throw new BAD_REQUEST('Court hearing phase is not ongoing or already completed');
    }

    // Return updated timeline
    const progress = timeline.calculateProgress();
    return {
        message: 'Court hearing phase completed successfully',
        progress,
        phases: timeline.phases
    };
}
