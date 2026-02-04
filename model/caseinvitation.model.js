import mongoose from 'mongoose';

// Invitation Status Enum
export const INVITATION_STATUS = Object.freeze({
    PENDING: 'pending',
    VIEWED: 'viewed',
    ACCEPTED: 'accepted',
    DECLINED: 'declined'
});

const caseInvitationSchema = new mongoose.Schema({
    // References
    caseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Case',
        required: [true, 'Case ID is required'],
        index: true
    },
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Lawyer ID is required'],
        index: true
    },
    clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Client ID is required']
    },

    // Status
    status: {
        type: String,
        enum: Object.values(INVITATION_STATUS),
        default: INVITATION_STATUS.PENDING
    },

    // Tracking
    viewedAt: {
        type: Date,
        default: null
    },
    respondedAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

// Compound index to prevent duplicate invitations
caseInvitationSchema.index({ caseId: 1, lawyerId: 1 }, { unique: true });

// Index for lawyer queries
caseInvitationSchema.index({ lawyerId: 1, status: 1, createdAt: -1 });

// Virtual for case details
caseInvitationSchema.virtual('case', {
    ref: 'Case',
    localField: 'caseId',
    foreignField: '_id',
    justOne: true
});

// Virtual for lawyer details
caseInvitationSchema.virtual('lawyer', {
    ref: 'User',
    localField: 'lawyerId',
    foreignField: '_id',
    justOne: true
});

// Virtual for client details
caseInvitationSchema.virtual('client', {
    ref: 'User',
    localField: 'clientId',
    foreignField: '_id',
    justOne: true
});

// Method to mark as viewed
caseInvitationSchema.methods.markAsViewed = function() {
    if (this.status === INVITATION_STATUS.PENDING) {
        this.status = INVITATION_STATUS.VIEWED;
        this.viewedAt = new Date();
    }
    return this.save();
};

// Static method to find invitations for a lawyer
caseInvitationSchema.statics.findByLawyer = function(lawyerId, status = null) {
    const query = { lawyerId };
    if (status) {
        query.status = status;
    }
    return this.find(query)
        .populate({
            path: 'caseId',
            select: 'title description category budgetRange province district court urgency status createdAt'
        })
        .populate({
            path: 'clientId',
            select: 'fullName profilePicture'
        })
        .sort({ createdAt: -1 });
};

const CaseInvitation = mongoose.model('CaseInvitation', caseInvitationSchema);

export default CaseInvitation;
