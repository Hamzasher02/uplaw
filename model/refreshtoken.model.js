import mongoose from 'mongoose';
import { ROLES, TOKEN_EXPIRY } from '../utils/constants.js';

const refreshTokenSchema = new mongoose.Schema({
    token: {
        type: String,
        required: true,
        unique: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    userType: {
        type: String,
        enum: [ROLES.ADMIN, ROLES.CLIENT, ROLES.LAWYER],
        required: true
    },
    
    // Token Status
    isValid: {
        type: Boolean,
        default: true
    },
    
    // Expiration
    expiresAt: {
        type: Date,
        required: true,
        default: () => new Date(Date.now() + TOKEN_EXPIRY.REFRESH_TOKEN_HOURS * 60 * 60 * 1000)
    },

    // Device/Session Info
    deviceInfo: {
        type: String,
        default: 'unknown'
    },
    ipAddress: {
        type: String
    },
    userAgent: {
        type: String
    },

    // Revocation tracking
    revokedAt: {
        type: Date
    },
    revokedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    revokeReason: {
        type: String
    }
}, {
    timestamps: true
});

// TTL index - auto-delete expired tokens
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Indexes for lookups (token already indexed via unique:true)
refreshTokenSchema.index({ userId: 1, isValid: 1 });

// Method to revoke token
refreshTokenSchema.methods.revoke = async function(revokedBy = null, reason = 'User logout') {
    this.isValid = false;
    this.revokedAt = new Date();
    this.revokedBy = revokedBy;
    this.revokeReason = reason;
    return await this.save();
};

// Method to check if token is usable
refreshTokenSchema.methods.isUsable = function() {
    return this.isValid && new Date() < this.expiresAt;
};

// Static method to revoke all tokens for a user
refreshTokenSchema.statics.revokeAllForUser = async function(userId, reason = 'Security reset') {
    return await this.updateMany(
        { userId, isValid: true },
        { 
            isValid: false, 
            revokedAt: new Date(),
            revokeReason: reason
        }
    );
};

// Static method to clean up expired tokens (manual cleanup if needed)
refreshTokenSchema.statics.cleanupExpired = async function() {
    return await this.deleteMany({
        expiresAt: { $lt: new Date() }
    });
};

// Static method to get active sessions count for a user
refreshTokenSchema.statics.getActiveSessionsCount = async function(userId) {
    return await this.countDocuments({
        userId,
        isValid: true,
        expiresAt: { $gt: new Date() }
    });
};

const RefreshToken = mongoose.model('RefreshToken', refreshTokenSchema);

export default RefreshToken;
