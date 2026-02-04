import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { OTP_CONFIG, OTP_PURPOSE, OTP_TYPE, ROLES } from '../utils/constants.js';

const otpSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    userType: {
        type: String,
        enum: [ROLES.CLIENT, ROLES.LAWYER,ROLES.ADMIN,],
        required: true
    },
    
    // OTP Details
    otp: {
        type: String,
        required: true
    },
    purpose: {
        type: String,
        enum: Object.values(OTP_PURPOSE),
        required: true
    },
    type: {
        type: String,
        enum: Object.values(OTP_TYPE),
        required: true
    },

    // Target (email or phone where OTP was sent)
    target: {
        type: String,
        required: true
    },

    // Expiration & Attempts
    expiresAt: {
        type: Date,
        required: true,
        default: () => new Date(Date.now() + OTP_CONFIG.EXPIRY_MINUTES * 60 * 1000)
    },
    attempts: {
        type: Number,
        default: 0,
        max: OTP_CONFIG.MAX_ATTEMPTS
    },
    
    // Status
    isUsed: {
        type: Boolean,
        default: false
    },
    usedAt: {
        type: Date
    },

    // Resend tracking
    lastResentAt: {
        type: Date
    },
    resendCount: {
        type: Number,
        default: 0
    },
    resetToken: {
        type: String
    }
}, {
    timestamps: true
});

// TTL index - auto-delete expired OTPs after 1 hour
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 3600 });

// Compound index for lookups
otpSchema.index({ userId: 1, purpose: 1, type: 1 });
otpSchema.index({ target: 1, purpose: 1 });

// Pre-save middleware to hash OTP
otpSchema.pre('save', async function(next) {
    if (!this.isModified('otp')) return next();
    
    const salt = await bcrypt.genSalt(10);
    this.otp = await bcrypt.hash(this.otp, salt);
    next();
});

// Method to verify OTP
otpSchema.methods.verifyOTP = async function(candidateOtp) {
    return await bcrypt.compare(candidateOtp, this.otp);
};

// Method to check if OTP is expired
otpSchema.methods.isExpired = function() {
    return new Date() > this.expiresAt;
};

// Method to check if max attempts reached
otpSchema.methods.isMaxAttemptsReached = function() {
    return this.attempts >= OTP_CONFIG.MAX_ATTEMPTS;
};

// Method to check if can resend (cooldown check)
otpSchema.methods.canResend = function() {
    if (!this.lastResentAt) return true;
    
    const cooldownMs = OTP_CONFIG.RESEND_COOLDOWN_SECONDS * 1000;
    const timeSinceLastResend = Date.now() - this.lastResentAt.getTime();
    
    return timeSinceLastResend >= cooldownMs;
};

// Method to get remaining cooldown seconds
otpSchema.methods.getRemainingCooldown = function() {
    if (!this.lastResentAt) return 0;
    
    const cooldownMs = OTP_CONFIG.RESEND_COOLDOWN_SECONDS * 1000;
    const timeSinceLastResend = Date.now() - this.lastResentAt.getTime();
    const remaining = cooldownMs - timeSinceLastResend;
    
    return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
};

// Static method to generate OTP code
otpSchema.statics.generateCode = function() {
    const min = Math.pow(10, OTP_CONFIG.CODE_LENGTH - 1);
    const max = Math.pow(10, OTP_CONFIG.CODE_LENGTH) - 1;
    return String(Math.floor(min + Math.random() * (max - min + 1)));
};

// Static method to invalidate all previous OTPs for a user/purpose
otpSchema.statics.invalidatePrevious = async function(userId, purpose, type) {
    await this.updateMany(
        { userId, purpose, type, isUsed: false },
        { isUsed: true, usedAt: new Date() }
    );
};

const OTP = mongoose.model('OTP', otpSchema);

export default OTP;
