import asyncWrapper from '../middleware/asyncWrapper.js';
import { sendSuccess, sendCreated } from '../utils/response.utils.js';
import { attachCookie, removeCookie, verifyJWT } from '../utils/cookies.utils.js';
import cleanupUploadedFiles from '../utils/cleanup.helper.utils.js';
import {
    registerClientService,
    registerLawyerService,
    verifyAccountService,
    loginService,
    logoutService,
    forgotPasswordService,
    verifyResetOtpService,
    resetPasswordService,
    refreshTokenService
} from '../services/auth.services.js';
import { getLawyerProfileService } from '../services/lawyer.services.js';
import { getClientProfileService } from '../services/client.services.js';
import User from '../model/user.model.js';
import { generateAndSendOtpService } from '../services/otp.services.js';
import { ROLES } from '../utils/constants.js';

/**
 * ===============================================
 * AUTH CONTROLLER - THIN (calls services only)
 * ===============================================
 */

// =================== CLIENT AUTH ===================

export const registerClient = asyncWrapper(async (req, res) => {
    const result = await registerClientService(req.body, req.file);
    cleanupUploadedFiles(req);
    sendCreated(res, 'Registration successful. OTP sent to your email.', result);
});

/**
 * UNIFIED LOGIN - Industry Standard Single Endpoint
 * Works for both Client and Lawyer - role auto-detected from database
 */
export const login = asyncWrapper(async (req, res) => {
    const { identifier, password } = req.body;
    const reqInfo = { userAgent: req.headers['user-agent'], ip: req.ip };
    const result = await loginService(identifier, password, reqInfo);

    const isAppClient = req.headers['x-client-type'] === 'app';
    const { user, accessToken, refreshToken, profile } = result;

    // Return only required user fields for login response
    const loginUser = {
        _id: user._id,
        email: user.email,
        role: user.role,
        accountStatus: user.accountStatus,
        isEmailVerified: user.isEmailVerified,
        isPhoneVerified: user.isPhoneVerified
    };

    if (isAppClient) {
        // App: Tokens ONLY in response headers (not in body)
        res.set('Authorization', `Bearer ${accessToken}`);
        res.set('x-refresh-token', refreshToken);
        sendSuccess(res, 'Login successful', { user: loginUser });
    } else {
        // Web: Return Access Token in body, Refresh Token in Cookie
        attachCookie({ refreshToken, res });
        sendSuccess(res, 'Login successful', { user: loginUser, accessToken });
    }
});

// =================== LAWYER AUTH ===================

export const registerLawyer = asyncWrapper(async (req, res) => {
    const result = await registerLawyerService(req.body, req.file);
    cleanupUploadedFiles(req);
    sendCreated(res, 'Registration successful. OTP sent to your email.', result);
});

// =================== COMMON AUTH ===================



export const verifyOtp = asyncWrapper(async (req, res) => {
    const { email, otp } = req.body;
    const reqInfo = { userAgent: req.headers['user-agent'], ip: req.ip };
    const result = await verifyAccountService(email, otp, reqInfo);

    const isAppClient = req.headers['x-client-type'] === 'app';
    const { user, accessToken, refreshToken } = result;

    if (isAppClient) {
        // App: Tokens ONLY in response headers (not in body)
        res.set('Authorization', `Bearer ${accessToken}`);
        res.set('x-refresh-token', refreshToken);
        sendSuccess(res, 'Account verified successfully', { user });
    } else {
        attachCookie({ refreshToken, res });
        sendSuccess(res, 'Account verified successfully', { user, accessToken });
    }
});

/**
 * Refresh Token Controller - INDUSTRY STANDARD EXPLICIT REFRESH
 */
export const refreshToken = asyncWrapper(async (req, res) => {
    // 1. Get token from Body (App) or Header (App fallback) or Cookie (Web)
    let token = req.body.refreshToken || req.headers['x-refresh-token'];
    
    // 2. Web fallback: Extract from Signed Cookies
    if (!token && req.signedCookies.refreshToken) {
        try {
            const decoded = verifyJWT({ token: req.signedCookies.refreshToken });
            token = decoded.refreshToken;
        } catch (err) {
            token = null; 
        }
    }

    if (!token) throw new UNAUTHENTICATED('Refresh token is required');

    const reqInfo = { userAgent: req.headers['user-agent'], ip: req.ip };
    const result = await refreshTokenService(token, reqInfo);

    const isAppClient = req.headers['x-client-type'] === 'app';
    const { accessToken, refreshToken: newRefreshToken } = result;

    if (isAppClient) {
        // App: Tokens ONLY in response headers (not in body)
        res.set('Authorization', `Bearer ${accessToken}`);
        res.set('x-refresh-token', newRefreshToken);
        sendSuccess(res, 'Token refreshed successfully', {});
    } else {
        // Web: Rotate cookie and return new Access Token in body
        attachCookie({ refreshToken: newRefreshToken, res });
        sendSuccess(res, 'Token refreshed successfully', { accessToken });
    }
});

export const getCurrentUser = asyncWrapper(async (req, res) => {
    const { userId, role } = req.user;
    let result;
    
    if (role === ROLES.LAWYER) {
        result = await getLawyerProfileService(userId);
    } else {
        result = await getClientProfileService(userId);
    }
    
    sendSuccess(res, 'Current user data fetched', result);
});

export const resendOtp = asyncWrapper(async (req, res) => {
    const { email, type } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
        console.error(`[RESEND OTP] User not found for email: ${email.toLowerCase()}`);
        throw new Error(`No account found with email: ${email}. Please check the email address.`);
    }
    
    await generateAndSendOtpService(user._id, user.email, 'email', 'registration', user.role);
    sendSuccess(res, `OTP resent to your ${type || 'email'}`, []);
});

export const logout = asyncWrapper(async (req, res) => {
    await logoutService(req.user?.userId);
    removeCookie({ res });
    sendSuccess(res, 'Logged out successfully', []);
});

export const deleteUser = asyncWrapper(async (req, res) => {
    const userId = req.user.userId;
    
    const user = await User.findById(userId);
    if (!user) {
        throw new Error('User not found');
    }

    user.isDeleted = true;
    user.deletedAt = new Date();
    user.deletedBy = userId;
    await user.save();

    // Logout the user after deletion
    await logoutService(userId);
    removeCookie({ res });

    sendSuccess(res, 'Account deleted successfully', []);
});

/**
 * UNIFIED FORGOT PASSWORD - Works for both Client and Lawyer
 */
export const forgotPassword = asyncWrapper(async (req, res) => {
    const result = await forgotPasswordService(req.body.identifier);
    sendSuccess(res, 'Password reset OTP sent to your email', result);
});

export const verifyResetOtp = asyncWrapper(async (req, res) => {
    const { email, otp } = req.body;
    const result = await verifyResetOtpService(email, otp);
    sendSuccess(res, 'OTP verified. You can now reset your password.', result);
});

export const resetPassword = asyncWrapper(async (req, res) => {
    const { email, resetToken, newPassword } = req.body;
    await resetPasswordService(email, resetToken, newPassword);
    sendSuccess(res, 'Password reset successful. Please login with your new password.', []);
});


