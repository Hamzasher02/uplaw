import crypto from 'crypto';
import OTP from '../model/otp.model.js';
import sendEmail from './mailer.services.js';
import { BAD_REQUEST, NOT_FOUND } from '../error/error.js';
import { OTP_CONFIG } from '../utils/constants.js';

/**
 * OTP Service - All OTP business logic
 */

/**
 * Generate and send OTP
 */
export const generateAndSendOtpService = async (userId, email, type = 'email', purpose = 'verification', userType) => {
    // Check cooldown
    const recentOtp = await OTP.findOne({
        userId,
        type,
        purpose,
        createdAt: { $gt: new Date(Date.now() - OTP_CONFIG.RESEND_COOLDOWN_SECONDS * 1000) }
    });

    if (recentOtp) {
        const waitTime = Math.ceil((OTP_CONFIG.RESEND_COOLDOWN_SECONDS * 1000 - (Date.now() - recentOtp.createdAt)) / 1000);
        throw new BAD_REQUEST(`Please wait ${waitTime} seconds before requesting a new OTP`);
    }

    // Invalidate old OTPs
    await OTP.updateMany({ userId, type, purpose }, { isUsed: true });

    // Generate new OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const otpRecord = await OTP.create({
        userId,
        userType,
        otp,
        type,
        purpose,
        target: email
    });

    // Send OTP
    if (type === 'email') {
        await sendEmail({
            to: email,
            subject: `UPLAW - ${purpose === 'verification' ? 'Verify Your Account' : 'Password Reset Code'}`,
            text: `Your verification code is: ${otp}`
        });
    } else {
        // SMS placeholder
        console.log(`[SMS] OTP ${otp} sent to user ${userId}`);
    }

    return {
        expiresAt: otpRecord.expiresAt,
        type
    };
};

/**
 * Verify OTP
 */
export const verifyOtpService = async (userId, otp, purpose = 'verification') => {
    const otpRecord = await OTP.findOne({
        userId,
        purpose,
        isUsed: false,
        expiresAt: { $gt: new Date() }
    });

    if (!otpRecord) {
        throw new BAD_REQUEST('OTP expired or invalid. Please request a new one.');
    }

    // Verify OTP
    const isMatch = await otpRecord.verifyOTP(otp);
    if (!isMatch) {
        otpRecord.attempts += 1;
        await otpRecord.save();

        if (otpRecord.attempts >= OTP_CONFIG.MAX_ATTEMPTS) {
            otpRecord.isUsed = true;
            await otpRecord.save();
            throw new BAD_REQUEST('Maximum attempts exceeded. Please request a new OTP.');
        }
        throw new BAD_REQUEST('Invalid OTP');
    }

    // Mark as used
    otpRecord.isUsed = true;
    await otpRecord.save();

    return otpRecord;
};

