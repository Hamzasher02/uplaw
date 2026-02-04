import mongoose from 'mongoose';

// Case Status Enum
export const CASE_STATUS = Object.freeze({
    ACTIVE: 'active',
    PENDING: 'pending',
    ASSIGNED: 'assigned',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled'
});

// Urgency Levels
export const URGENCY_LEVEL = Object.freeze({
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    URGENT: 'urgent'
});

// Budget Ranges
export const BUDGET_RANGE = Object.freeze({
    RANGE_25K_50K: '25000-50000',
    RANGE_50K_100K: '50000-100000',
    RANGE_100K_200K: '100000-200000',
    RANGE_200K_500K: '200000-500000',
    RANGE_500K_PLUS: '500000+'
});

const caseSchema = new mongoose.Schema({
    // Case Owner
    clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Client ID is required'],
        index: true
    },

    // Basic Case Information
    title: {
        type: String,
        required: [true, 'Case title is required'],
        trim: true,
        maxlength: [200, 'Title cannot exceed 200 characters']
    },
    description: {
        type: String,
        required: [true, 'Case description is required'],
        trim: true,
        maxlength: [2000, 'Description cannot exceed 2000 characters']
    },
    voiceNote: {
        publicId: String,
        secureUrl: String,
        duration: Number // Duration in seconds
    },

    // Categorization
    category: {
        type: String,
        required: [true, 'Legal category is required'],
        trim: true
    },

    // Budget
    budgetRange: {
        type: String,
        enum: Object.values(BUDGET_RANGE),
        required: [true, 'Budget range is required']
    },

    // Location
    province: {
        type: String,
        required: [true, 'Province is required'],
        trim: true
    },
    district: {
        type: String,
        required: [true, 'District is required'],
        trim: true
    },
    court: {
        type: String,
        trim: true
    },

    // Case Preferences
    urgency: {
        type: String,
        enum: Object.values(URGENCY_LEVEL),
        default: URGENCY_LEVEL.MEDIUM
    },
    preferredLanguages: [{
        type: String,
        trim: true
    }],

    // Status and Tracking
    status: {
        type: String,
        enum: Object.values(CASE_STATUS),
        default: CASE_STATUS.PENDING
    },

    // Assignment (when a proposal is accepted)
    assignedLawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    assignedAt: {
        type: Date,
        default: null
    },

    // Counts (denormalized for performance)
    proposalCount: {
        type: Number,
        default: 0
    },
    invitationCount: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes for efficient queries
caseSchema.index({ clientId: 1, status: 1 });
caseSchema.index({ category: 1, province: 1, district: 1 });
caseSchema.index({ status: 1, createdAt: -1 });

// Virtual for client details
caseSchema.virtual('client', {
    ref: 'User',
    localField: 'clientId',
    foreignField: '_id',
    justOne: true
});

// Virtual for assigned lawyer details
caseSchema.virtual('assignedLawyer', {
    ref: 'User',
    localField: 'assignedLawyerId',
    foreignField: '_id',
    justOne: true
});

// Method to get public case data
caseSchema.methods.toPublicJSON = function() {
    const obj = this.toObject();
    delete obj.__v;
    return obj;
};

// Static method to find cases by client
caseSchema.statics.findByClient = function(clientId, status = null) {
    const query = { clientId };
    if (status) {
        query.status = status;
    }
    return this.find(query).sort({ createdAt: -1 });
};

const Case = mongoose.model('Case', caseSchema);

export default Case;
