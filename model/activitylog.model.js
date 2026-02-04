import mongoose from 'mongoose';
import { LOG_ACTIONS, LOG_MODULES } from '../utils/constants.js';

const activityLogSchema = new mongoose.Schema({
    // Action Details
    action: {
        type: String,
        enum: Object.values(LOG_ACTIONS),
        required: true
    },
    module: {
        type: String,
        enum: Object.values(LOG_MODULES),
        required: true
    },
    description: {
        type: String,
        required: true,
        trim: true
    },

    // Actor (who performed the action) - optional for unauthenticated actions like registration
    performedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
        // Not required - can be null for registration/login
    },
    performerRole: {
        type: String
        // Not required - can be null for registration/login
    },
    performerEmail: {
        type: String
        // Not required - can be null for registration/login
    },

    // Target (affected entity)
    targetUser: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    targetEntity: {
        type: String  // Model name
    },
    targetEntityId: {
        type: mongoose.Schema.Types.ObjectId
    },

    // Payload snapshot (before/after data)
    payload: {
        before: {
            type: mongoose.Schema.Types.Mixed
        },
        after: {
            type: mongoose.Schema.Types.Mixed
        },
        changes: {
            type: mongoose.Schema.Types.Mixed
        }
    },

    // Request Info
    ipAddress: {
        type: String
    },
    userAgent: {
        type: String
    },
    endpoint: {
        type: String
    },
    method: {
        type: String,
        enum: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE']
    },

    // Status
    status: {
        type: String,
        enum: ['success', 'failure'],
        default: 'success'
    },
    errorMessage: {
        type: String
    }
}, {
    timestamps: true
});

// Indexes for querying logs
activityLogSchema.index({ createdAt: -1 });
activityLogSchema.index({ performedBy: 1, createdAt: -1 });
activityLogSchema.index({ action: 1, module: 1 });
activityLogSchema.index({ targetUser: 1 });

// Static method to create a log entry
activityLogSchema.statics.log = async function({
    action,
    module,
    description,
    performedBy,
    performerRole,
    performerEmail,
    targetUser = null,
    targetEntity = null,
    targetEntityId = null,
    payload = {},
    req = null,
    status = 'success',
    errorMessage = null
}) {
    return await this.create({
        action,
        module,
        description,
        performedBy,
        performerRole,
        performerEmail,
        targetUser,
        targetEntity,
        targetEntityId,
        payload,
        ipAddress: req?.ip || req?.connection?.remoteAddress,
        userAgent: req?.headers?.['user-agent'],
        endpoint: req?.originalUrl,
        method: req?.method,
        status,
        errorMessage
    });
};

const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);

export default ActivityLog;
