import asyncWrapper from '../middleware/asyncWrapper.js';
import successResponse from '../utils/response.utils.js';
import {
    getTimelineService,
    submitPhaseDataService,
    addCourtHearingSubPhaseService,
    completeCourtHearingService
} from '../services/timeline.services.js';

/**
 * Get timeline for a case
 * @route GET /api/v1/cases/:caseId/timeline
 * @access CLIENT (owner) or LAWYER (assigned)
 */
export const getTimeline = asyncWrapper(async (req, res) => {
    const { caseId } = req.params;
    const { userId, role } = req.user;

    const timeline = await getTimelineService(caseId, userId, role);

    return res.status(200).json(successResponse(timeline, 'Timeline retrieved successfully'));
});

/**
 * Submit phase data (phases 1, 2, 3, 5)
 * @route POST /api/v1/cases/:caseId/phases/:phaseKey/submit
 * @access LAWYER (assigned only)
 */
export const submitPhaseData = asyncWrapper(async (req, res) => {
    const { caseId, phaseKey } = req.params;
    const { userId } = req.user;
    const files = req.files || [];
    const data = req.body;

    const result = await submitPhaseDataService(caseId, phaseKey, data, files, userId);

    return res.status(200).json(successResponse(result, result.message));
});

/**
 * Add court hearing subphase
 * @route POST /api/v1/cases/:caseId/phases/court-hearing/subphases
 * @access LAWYER (assigned only)
 */
export const addCourtHearingSubPhase = asyncWrapper(async (req, res) => {
    const { caseId } = req.params;
    const { userId } = req.user;
    const files = req.files || [];
    const data = req.body;

    const result = await addCourtHearingSubPhaseService(caseId, data, files, userId);

    return res.status(200).json(successResponse(result, result.message));
});

/**
 * Complete court hearing phase
 * @route POST /api/v1/cases/:caseId/phases/court-hearing/complete
 * @access LAWYER (assigned only)
 */
export const completeCourtHearing = asyncWrapper(async (req, res) => {
    const { caseId } = req.params;
    const { userId } = req.user;

    const result = await completeCourtHearingService(caseId, userId);

    return res.status(200).json(successResponse(result, result.message));
});
