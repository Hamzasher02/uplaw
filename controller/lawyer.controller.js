import asyncWrapper from '../middleware/asyncWrapper.js';
import { sendSuccess, sendCreated } from '../utils/response.utils.js';
import cleanupUploadedFiles from '../utils/cleanup.helper.utils.js';
import {
    getLawyerProfileService,
    getLawyerCompletionService,
    updateLawyerProfileService,
    updateLawyerStep1Service,
    updateLawyerStep2Service,
    updateLawyerStep3Service,
    updateLawyerStep4Service,
    updateLawyerStep5Service,
    updateLawyerProfilePictureService,
    submitCompleteProfileService
} from '../services/lawyer.services.js';

/**
 * ===============================================
 * LAWYER CONTROLLER - Thin layer (calls services only)
 * ===============================================
 */

// ==================== GET CONTROLLERS ====================

export const getProfile = asyncWrapper(async (req, res) => {
    const result = await getLawyerProfileService(req.user.userId);
    sendSuccess(res, 'Profile fetched successfully', result);
});

export const getCompletion = asyncWrapper(async (req, res) => {
    const result = await getLawyerCompletionService(req.user.userId);
    sendSuccess(res, 'Completion status fetched', result);
});

// ==================== UNIFIED UPDATE CONTROLLER ====================

/**
 * PATCH /api/lawyers/profile
 * Unified profile update - handles all fields + file uploads
 */
export const updateProfile = asyncWrapper(async (req, res) => {
    const result = await updateLawyerProfileService(req.user.userId, req.body, req.files);
    cleanupUploadedFiles(req);
    sendSuccess(res, 'Profile updated successfully', result);
});

// ==================== STEP-SPECIFIC CONTROLLERS (Backward Compatible) ====================

export const updateStep1 = asyncWrapper(async (req, res) => {
    const result = await updateLawyerStep1Service(req.user.userId, req.body);
    sendSuccess(res, 'Basic information updated', result);
});

export const updateStep2 = asyncWrapper(async (req, res) => {
    const result = await updateLawyerStep2Service(req.user.userId, req.body, req.files);
    cleanupUploadedFiles(req);
    sendSuccess(res, 'Professional qualifications updated', result);
});

export const updateStep3 = asyncWrapper(async (req, res) => {
    const result = await updateLawyerStep3Service(req.user.userId, req.body);
    sendSuccess(res, 'Practice areas updated', result);
});

export const updateStep4 = asyncWrapper(async (req, res) => {
    const result = await updateLawyerStep4Service(req.user.userId, req.body);
    sendSuccess(res, 'Performance & availability updated', result);
});

export const updateStep5 = asyncWrapper(async (req, res) => {
    const result = await updateLawyerStep5Service(req.user.userId, req.body, req.files);
    cleanupUploadedFiles(req);
    sendSuccess(res, 'Documents uploaded successfully', result);
});

// ==================== ADDITIONAL CONTROLLERS ====================

export const updateProfilePicture = asyncWrapper(async (req, res) => {
    const result = await updateLawyerProfilePictureService(req.user.userId, req.file);
    cleanupUploadedFiles(req);
    sendSuccess(res, 'Profile picture updated successfully', result);
});

/**
 * POST /api/lawyers/profile/complete
 * Submit Complete Profile (All 5 Steps at Once)
 */
export const submitCompleteProfile = asyncWrapper(async (req, res) => {
    const result = await submitCompleteProfileService(req.user.userId, req.body, req.files);
    cleanupUploadedFiles(req);
    sendSuccess(res, 'Profile completed successfully', result);
});
