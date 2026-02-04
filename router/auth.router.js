import express from 'express';
import { singleProfilePicture } from '../middleware/multer.middleware.js';
import activityLogger from '../middleware/activitylogger.middleware.js';
import { LOG_ACTIONS, LOG_MODULES } from '../utils/constants.js';
import {
    clientRegistrationValidator,
    lawyerRegistrationValidator,
    loginValidator,
    verifyOtpValidator,
    resendOtpValidator,
    forgotPasswordValidator,
    verifyResetOtpValidator,
    resetPasswordValidator,
    validationMiddleware
} from '../services/auth.validator.services.js';
import {
    registerClient,
    registerLawyer,
    login,
    verifyOtp,
    resendOtp,
    logout,
    forgotPassword,
    verifyResetOtp,
    resetPassword,
    refreshToken,
    getCurrentUser,
    deleteUser
} from '../controller/auth.controller.js';
import authenticationMiddleware from '../middleware/authentication.middleware.js';

const router = express.Router();

// =================== REGISTRATION (Role-specific - different fields required) ===================
router.route('/register/client').post(
    singleProfilePicture,
    clientRegistrationValidator(),
    validationMiddleware,
    activityLogger(LOG_ACTIONS.REGISTER, "Client registration", LOG_MODULES.AUTH),
    registerClient
);

router.route('/register/lawyer').post(
    singleProfilePicture,
    lawyerRegistrationValidator(),
    validationMiddleware,
    activityLogger(LOG_ACTIONS.REGISTER, "Lawyer registration", LOG_MODULES.AUTH),
    registerLawyer
);

// =================== UNIFIED AUTH (Industry Standard - Single Endpoint) ===================

/**
 * UNIFIED LOGIN - Single endpoint for all user types
 * Role is auto-detected from database
 */
router.route('/login').post(
    loginValidator(),
    validationMiddleware,
    activityLogger(LOG_ACTIONS.LOGIN, "User login", LOG_MODULES.AUTH),
    login
);

/**
 * UNIFIED FORGOT PASSWORD - Single endpoint for all user types
 * Role is auto-detected from database
 */
router.route('/forgot-password').post(
    forgotPasswordValidator(),
    validationMiddleware,
    activityLogger(LOG_ACTIONS.PASSWORD_RESET, "Forgot password", LOG_MODULES.AUTH),
    forgotPassword
);

// =================== COMMON AUTH ===================

router.route('/verify-otp').post(
    verifyOtpValidator(),
    validationMiddleware,
    activityLogger(LOG_ACTIONS.ACCOUNT_VERIFY, "OTP verification", LOG_MODULES.AUTH),
    verifyOtp
);

router.route('/resend-otp').post(
    resendOtpValidator(),
    validationMiddleware,
    activityLogger(LOG_ACTIONS.ACCOUNT_VERIFY, "Resend OTP", LOG_MODULES.AUTH),
    resendOtp
);

router.route('/verify-reset-otp').post(
    verifyResetOtpValidator(),
    validationMiddleware,
    activityLogger(LOG_ACTIONS.PASSWORD_RESET, "Verify reset OTP", LOG_MODULES.AUTH),
    verifyResetOtp
);

router.route('/reset-password').post(
    resetPasswordValidator(),
    validationMiddleware,
    activityLogger(LOG_ACTIONS.PASSWORD_RESET, "Reset password", LOG_MODULES.AUTH),
    resetPassword
);

router.get('/me', authenticationMiddleware, activityLogger("AUTH", "Get current user profile"), getCurrentUser);

router.route('/refresh-token').post(
    activityLogger("REFRESH_TOKEN", "Token refresh"),
    refreshToken
);

router.route('/logout').get(
    activityLogger("LOGOUT", "Logout"),
    logout
);

router.route('/delete-account').delete(
    authenticationMiddleware,
    activityLogger("DELETE_ACCOUNT", "Delete user account"),
    deleteUser
);

export default router;
