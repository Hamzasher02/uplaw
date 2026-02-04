import asyncWrapper from '../middleware/asyncWrapper.js';
import { sendSuccess } from '../utils/response.utils.js';
import cleanupUploadedFiles from '../utils/cleanup.helper.utils.js';
import {
    getClientProfileService,
    updateClientProfileService
} from '../services/client.services.js';

/**
 * ===============================================
 * CLIENT CONTROLLER - THIN (calls services only)
 * ===============================================
 */

export const getProfile = asyncWrapper(async (req, res) => {
    const result = await getClientProfileService(req.user.userId);
    sendSuccess(res, 'Profile fetched successfully', result);
});

export const updateProfile = asyncWrapper(async (req, res) => {
    const result = await updateClientProfileService(req.user.userId, req.body, req.files);
    cleanupUploadedFiles(req);
    sendSuccess(res, 'Profile updated successfully', result);
});
