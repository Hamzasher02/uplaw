// crypto: Native Node.js module used here for generating cryptographically strong random values (e.g., for refresh tokens).
import crypto from 'crypto';
import User from '../model/user.model.js';
import ClientProfile from '../model/clientprofile.model.js';
import LawyerProfile from '../model/lawyerprofile.model.js';
import OTP from '../model/otp.model.js';
import RefreshToken from '../model/refreshtoken.model.js';
import { uploadToCloud, deleteFromCloud } from './cloudinary.uploader.services.js';
import { handleFileUpload } from '../utils/profile.helper.utils.js';
import { generateAndSendOtpService, verifyOtpService } from './otp.services.js';
import { BAD_REQUEST, NOT_FOUND, UNAUTHENTICATED } from '../error/error.js';
import { ROLES } from '../utils/constants.js';
import { createJWT } from '../utils/cookies.utils.js';

/**
 * Auth Service - All authentication business logic
 */

/**
 * PRIVATE HELPER: Build Access Token (eliminates duplication)
 * Used by: generateTokensAndProfile, refreshTokenService
 */
function buildAccessToken(user) {
    return createJWT({
        payload: {
            userId: user._id,
            email: user.email,
            phoneNumber: user.phoneNumber,
            role: user.role
        },
        expiresIn: '15m'
    });
}

/**
 * PRIVATE HELPER: Find user by email or phone (eliminates duplication)
 * Used by: loginService, forgotPasswordService
 * @param {string} identifier - Email or phone number
 * @param {boolean} selectPassword - Whether to include password field (default: false)
 */
async function findUserByIdentifier(identifier, selectPassword = false) {
    const query = User.findOne({
        $or: [
            { email: identifier.toLowerCase() },
            { phoneNumber: identifier }
        ]
    });

    if (selectPassword) {
        query.select('+password');
    }

    return await query;
}

/**
 * PRIVATE HELPER: Assert email and phone are unique (eliminates duplication)
 * Used by: registerClientService, registerLawyerService
 */
async function assertUniqueEmailPhone(email, phoneNumber) {
    const isEmailExist = await User.findOne({ email });
    if (isEmailExist) {
        throw new BAD_REQUEST('User already exists with this email');
    }

    const isPhoneExist = await User.findOne({ phoneNumber });
    if (isPhoneExist) {
        throw new BAD_REQUEST('User already exists with this phone number');
    }
}

/**
 * Helper: Generate tokens and get profile (Batch 2 original)
 * 
 * General Overview:
 * Generates authentication tokens and fetches the user profile.
 * 
 * Term Clarification:
 * - JWT (JSON Web Token): Used for the Access Token to statelessly prove identity.
 * - Refresh Token: A long-lived opaque string used to get new Access Tokens.
 */
async function generateTokensAndProfile(user, reqInfo) {
    // 1. Generate Access Token (Short-lived 15 mins)
    // Code Block Explanation: Creates a signed JWT carrying user identity claims.
    const accessToken = buildAccessToken(user);

    // 2. Generate Refresh Token (Long-lived 7 days)
    // Code Block Explanation: Generates a random 40-byte hex string for the refresh token.
    const refreshToken = crypto.randomBytes(40).toString('hex');

    // Create refresh token entry
    await RefreshToken.create({
        userId: user._id,
        userType: user.role,
        token: refreshToken,
        userAgent: reqInfo.userAgent,
        ipAddress: reqInfo.ip
    });

    let profile = null;
    if (user.role === ROLES.LAWYER) {
        const lawyerProfile = await LawyerProfile.findOne({ userId: user._id });
        profile = lawyerProfile?.updateCompletion();
    }

    return {
        accessToken,
        refreshToken,
        user: user.toPublicJSON(),
        profile
    };
}

/**
 * Register Client (Batch 2 original logic)
 * 
 * General Overview:
 * Registers a new client user, creating their account and profile, and sending a verification OTP.
 */
export async function registerClientService(data, file) {
    let publicId = null;

    try {
        const { fullName, fullNameUrdu, fatherName, fatherNameUrdu, email, phoneNumber, dateOfBirth, password } = data;

        // Check existing user
        await assertUniqueEmailPhone(email, phoneNumber);

        // Upload profile picture
        let profilePicture = null;
        if (file) {
            const uploadResult = await handleFileUpload({
                file,
                existingDoc: null,
                uploadFn: uploadToCloud,
                deleteFn: deleteFromCloud
            });
            publicId = uploadResult.publicId;
            profilePicture = { ...uploadResult };
        }

        // Create user
        const user = await User.create({
            fullName,
            fullNameUrdu,
            fatherName,
            fatherNameUrdu,
            email,
            phoneNumber,
            dateOfBirth,
            password,
            role: ROLES.CLIENT,
            profilePicture
        });

        // Create client profile
        await ClientProfile.create({
            userId: user._id,
            fatherName,
            fatherNameUrdu,
            dateOfBirth
        });

        // Send OTP
        // Term Clarification: OTP (One-Time Password) used for email verification.
        await generateAndSendOtpService(user._id, email, 'email', 'registration', user.role);

        return {
            userId: user._id,
            email: user.email
        };
    } catch (error) {
        if (publicId) await deleteFromCloud(publicId);
        throw error;
    }
}

/**
 * Register Lawyer (Batch 2 original logic)
 * 
 * General Overview:
 * Registers a new lawyer user, including their bar council license details.
 */
export async function registerLawyerService(data, file) {
    let publicId = null;

    try {
        const { fullName, fullNameUrdu, email, phoneNumber, barCouncil, licenseNo, city, dateOfBirth, password } = data;

        // Check existing user
        await assertUniqueEmailPhone(email, phoneNumber);

        // Upload profile picture
        let profilePicture = null;
        if (file) {
            const uploadResult = await handleFileUpload({
                file,
                existingDoc: null,
                uploadFn: uploadToCloud,
                deleteFn: deleteFromCloud
            });
            publicId = uploadResult.publicId;
            profilePicture = { ...uploadResult };
        }

        // Create user
        const user = await User.create({
            fullName,
            fullNameUrdu,
            email,
            phoneNumber,
            dateOfBirth,
            password,
            role: ROLES.LAWYER,
            profilePicture
        });

        // Create lawyer profile
        await LawyerProfile.create({
            userId: user._id,
            dateOfBirth,
            barLicense: {
                licenseNo,
                barCouncil,
                city
            }
        });

        // Send OTP
        await generateAndSendOtpService(user._id, email, 'email', 'registration', user.role);

        return {
            userId: user._id,
            email: user.email
        };
    } catch (error) {
        if (publicId) await deleteFromCloud(publicId);
        throw error;
    }
}

/**
 * Verify Account (Batch 2 original logic)
 * 
 * General Overview:
 * Verifies the user's email address using the provided OTP.
 */
export async function verifyAccountService(email, otp, reqInfo) {
    // Find user by email (lowercase)
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) throw new NOT_FOUND('User not found');

    if (user.isEmailVerified) {
        throw new BAD_REQUEST('Account already verified. Please login.');
    }

    // Find OTP record
    const otpRecord = await OTP.findOne({
        target: email.toLowerCase(),
        purpose: 'registration',
        isUsed: false
    });

    if (!otpRecord) {
        throw new BAD_REQUEST('OTP expired or not found. Please request a new one.');
    }

    if (otpRecord.isExpired()) {
        throw new BAD_REQUEST('OTP expired. Please request a new one.');
    }

    // Verify OTP
    const isValid = otpRecord.verifyOTP(otp);
    if (!isValid) {
        otpRecord.attempts += 1;
        await otpRecord.save();
        throw new BAD_REQUEST('Invalid OTP');
    }

    // Mark OTP as used
    otpRecord.isUsed = true;
    otpRecord.usedAt = new Date();
    await otpRecord.save();

    // Verify user account
    user.isEmailVerified = true;
    user.emailVerificationDate = new Date();
    user.accountStatus = 'verified';
    await user.save();

    // Generate tokens and profile
    const result = await generateTokensAndProfile(user, reqInfo);

    return {
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        profile: result.profile
    };
}

/**
 * Login Service (Batch 2 original logic)
 * 
 * General Overview:
 * Authenticates the user via email/phone and password, returning tokens.
 */
export async function loginService(identifier, password, reqInfo) {
    // Find user by email (lowercase) or phone
    const user = await findUserByIdentifier(identifier, true);

    if (!user) {
        throw new NOT_FOUND('No account found with these credentials');
    }

    // Check if email is verified
    if (!user.isEmailVerified) {
        await generateAndSendOtpService(user._id, user.email, 'email', 'registration', user.role);
        throw new BAD_REQUEST('Please verify your email first. A new OTP has been sent.');
    }

    // Verify password
    const isPasswordCorrect = await user.comparePassword(password);
    if (!isPasswordCorrect) {
        throw new UNAUTHENTICATED('Invalid password');
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate tokens and profile
    return await generateTokensAndProfile(user, reqInfo);
}

/**
 * Logout Service (Batch 2 original logic)
 * 
 * General Overview:
 * Logs the user out by invalidating their refresh tokens.
 */
export async function logoutService(userId) {
    // Invalidate all refresh tokens for this user
    await RefreshToken.updateMany({ userId }, { isValid: false });
    return true;
}

/**
 * Forgot Password Service (Batch 2 original logic)
 * 
 * General Overview:
 * Initiates password recovery by sending an OTP to the user.
 */
export async function forgotPasswordService(identifier) {
    // Find user by email (lowercase) or phone
    const user = await findUserByIdentifier(identifier);

    if (!user) {
        throw new NOT_FOUND('No account found');
    }

    // Send OTP
    await generateAndSendOtpService(user._id, user.email, 'email', 'password_reset', user.role);

    return { userId: user._id };
}

/**
 * Verify Reset OTP Service (Batch 2 original logic)
 * 
 * General Overview:
 * Verifies the password reset OTP and issues a temporary reset token.
 */
export async function verifyResetOtpService(email, otp) {
    // Find user by email (lowercase)
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) throw new NOT_FOUND('User not found');

    // Verify OTP
    const otpRecord = await verifyOtpService(user._id, otp, 'password_reset');

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');

    // Store reset token in OTP record
    otpRecord.resetToken = resetToken;
    await otpRecord.save();

    return { resetToken };
}

/**
 * Reset Password Service (Batch 2 original logic)
 * 
 * General Overview:
 * Sets a new password for the user, verifying the reset token.
 */
export async function resetPasswordService(email, resetToken, newPassword) {
    // Find user by email (lowercase)
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) throw new NOT_FOUND('User not found');

    // Find OTP record with reset token
    const otpRecord = await OTP.findOne({
        userId: user._id,
        resetToken,
        purpose: 'password_reset',
        isUsed: true
    });

    if (!otpRecord) {
        throw new BAD_REQUEST('Invalid or expired reset token');
    }

    // Update password
    user.password = newPassword;
    await user.save();

    // Invalidate all refresh tokens
    await RefreshToken.updateMany({ userId: user._id }, { isValid: false });

    // Delete OTP record
    await OTP.deleteOne({ _id: otpRecord._id });

    return true;
}

/**
 * Refresh Token Service (Batch 2 original logic)
 * 
 * General Overview:
 * Rotates the refresh token and issues a new access token to maintain the session.
 */
export async function refreshTokenService(token, reqInfo) {
    // Find refresh token
    const tokenRecord = await RefreshToken.findOne({ token, isValid: true });

    if (!tokenRecord || !tokenRecord.isUsable()) {
        if (tokenRecord) {
            await tokenRecord.revoke(null, 'Expired refresh attempt');
        }
        throw new UNAUTHENTICATED('Session expired. Please login again.');
    }

    // Get user
    const user = await User.findById(tokenRecord.userId);
    if (!user) throw new NOT_FOUND('User not found');

    // Generate new refresh token
    const newRefreshToken = crypto.randomBytes(40).toString('hex');

    // Update token record
    tokenRecord.token = newRefreshToken;
    tokenRecord.userAgent = reqInfo.userAgent;
    tokenRecord.ipAddress = reqInfo.ip;
    await tokenRecord.save();

    // Generate new access token
    const accessToken = buildAccessToken(user);

    return {
        accessToken,
        refreshToken: newRefreshToken,
        user: user.toPublicJSON()
    };
}
