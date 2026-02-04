import express from 'express';
import multer from 'multer';
import authenticationMiddleware from '../middleware/authentication.middleware.js';
import { requireRole } from '../middleware/rbac.middleware.js';
import { singleProfilePicture } from '../middleware/multer.middleware.js';
import activityLogger from '../middleware/activitylogger.middleware.js';
import { validationMiddleware } from '../services/auth.validator.services.js';
import {
    lawyerStep1Validator,
    lawyerStep2Validator,
    lawyerStep3Validator,
    lawyerStep4Validator,
    lawyerStep5Validator,
    lawyerUnifiedProfileValidator
} from '../services/lawyer.validator.services.js';
import {
    getProfile,
    getCompletion,
    updateProfile,
    updateStep1,
    updateStep2,
    updateStep3,
    updateStep4,
    updateStep5,
    updateProfilePicture,
    submitCompleteProfile
} from '../controller/lawyer.controller.js';
import { ROLES } from '../utils/constants.js';

const router = express.Router();

// Multer configuration for profile documents
const uploadProfileDocs = multer({ 
    dest: 'uploads/',
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB max per file
    }
}).fields([
    { name: 'profilePhoto', maxCount: 1 },
    { name: 'cnicDocument', maxCount: 1 },
    { name: 'barLicenseDocument', maxCount: 1 },
    { name: 'degreeCertificate', maxCount: 1 }
]);

// All routes require authentication + lawyer role
router.use(authenticationMiddleware);
router.use(requireRole(ROLES.LAWYER));

// ==================== GET ROUTES ====================

router.route('/profile').get(
    activityLogger("PROFILE", "Get lawyer profile"),
    getProfile
);

router.route('/profile/completion').get(
    activityLogger("PROFILE", "Get completion status"),
    getCompletion
);

// ==================== UNIFIED UPDATE ROUTE (RECOMMENDED) ====================

/**
 * PATCH /api/lawyers/profile
 * Unified profile update - handles all fields + file uploads
 * Content-Type: multipart/form-data
 */
router.route('/profile').patch(
    uploadProfileDocs,
    lawyerUnifiedProfileValidator(),
    validationMiddleware,
    activityLogger("PROFILE", "Update lawyer profile (Unified)"),
    updateProfile
);

// ==================== STEP-SPECIFIC ROUTES (Backward Compatible) ====================

router.route('/profile/step/1').patch(
    lawyerStep1Validator(),
    validationMiddleware,
    activityLogger("PROFILE", "Update Step 1"),
    updateStep1
);

router.route('/profile/step/2').patch(
    uploadProfileDocs,
    lawyerStep2Validator(),
    validationMiddleware,
    activityLogger("PROFILE", "Update Step 2"),
    updateStep2
);

router.route('/profile/step/3').patch(
    lawyerStep3Validator(),
    validationMiddleware,
    activityLogger("PROFILE", "Update Step 3"),
    updateStep3
);

router.route('/profile/step/4').patch(
    lawyerStep4Validator(),
    validationMiddleware,
    activityLogger("PROFILE", "Update Step 4"),
    updateStep4
);

router.route('/profile/step/5').patch(
    uploadProfileDocs,
    lawyerStep5Validator(),
    validationMiddleware,
    activityLogger("DOCUMENT", "Update Step 5"),
    updateStep5
);

// ==================== ADDITIONAL ROUTES ====================

router.route('/profile/picture').patch(
    singleProfilePicture,
    activityLogger("PROFILE", "Update profile picture"),
    updateProfilePicture
);

// Complete Profile Submit (All 5 Steps at Once)
router.route('/profile/complete').post(
    uploadProfileDocs,
    lawyerUnifiedProfileValidator(),
    validationMiddleware,
    activityLogger("PROFILE", "Submit complete profile"),
    submitCompleteProfile
);

export default router;
