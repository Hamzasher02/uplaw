import mongoose from 'mongoose';

// Proposal Status Enum
export const PROPOSAL_STATUS = Object.freeze({
    PENDING: 'pending',
    VIEWED: 'viewed',
    ACCEPTED: 'accepted',
    REJECTED: 'rejected',
    WITHDRAWN: 'withdrawn'
});

// Fee Structure Sub-schema
const feeStructureSchema = new mongoose.Schema({
    totalProposedFee: {
        type: Number,
        required: true
    },
    initialConsultation: {
        type: Number,
        default: 0
    },
    documentationFee: {
        type: Number,
        default: 0
    },
    courtFees: {
        type: Number,
        default: 0
    },
    additionalCosts: {
        type: Number,
        default: 0
    },
    expectedDate: {
        type: String,
        required: [true, 'Expected date is required']
    }
}, { _id: false });



const proposalSchema = new mongoose.Schema({
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
        required: [true, 'Client ID is required'],
        index: true
    },

    // Proposal Core Details



    // Detailed Sections
    caseAssessment: {
        type: String,
        required: [true, 'Case assessment is required'],
        trim: true,
        maxlength: [2000, 'Case assessment cannot exceed 2000 characters']
    },
    servicesIncluded: {
        type: String,
        trim: true,
        maxlength: [2000, 'Services description cannot exceed 2000 characters']
    },
    experienceAndQualifications: {
        type: String,
        trim: true,
        maxlength: [2000, 'Experience description cannot exceed 2000 characters']
    },

    // Fee Structure
    feeStructure: feeStructureSchema,

    // Milestones and Deliverables
    milestones: {
        type: String,
        trim: true,
        maxlength: [500, 'Milestones cannot exceed 500 characters']
    },

    // Terms and Conditions
    termsAndConditions: {
        type: String,
        trim: true,
        maxlength: [3000, 'Terms cannot exceed 3000 characters']
    },

    // Availability
    availability: {
        type: String,
        trim: true,
        maxlength: [500, 'Availability info cannot exceed 500 characters']
    },

    // Status
    status: {
        type: String,
        enum: Object.values(PROPOSAL_STATUS),
        default: PROPOSAL_STATUS.PENDING
    },

    // Tracking
    viewedAt: {
        type: Date,
        default: null
    },
    respondedAt: {
        type: Date,
        default: null
    },
    responseNote: {
        type: String,
        trim: true,
        maxlength: [500, 'Response note cannot exceed 500 characters']
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Compound index to prevent duplicate proposals
proposalSchema.index({ caseId: 1, lawyerId: 1 }, { unique: true });

// Index for client queries
proposalSchema.index({ clientId: 1, status: 1, createdAt: -1 });

// Index for lawyer queries
proposalSchema.index({ lawyerId: 1, status: 1, createdAt: -1 });

// Virtual for case details
proposalSchema.virtual('case', {
    ref: 'Case',
    localField: 'caseId',
    foreignField: '_id',
    justOne: true
});

// Virtual for lawyer details
proposalSchema.virtual('lawyer', {
    ref: 'User',
    localField: 'lawyerId',
    foreignField: '_id',
    justOne: true
});

// Virtual for client details
proposalSchema.virtual('client', {
    ref: 'User',
    localField: 'clientId',
    foreignField: '_id',
    justOne: true
});

// Method to mark as viewed
proposalSchema.methods.markAsViewed = function () {
    if (this.status === PROPOSAL_STATUS.PENDING) {
        this.status = PROPOSAL_STATUS.VIEWED;
        this.viewedAt = new Date();
    }
    return this.save();
};

// Static method to find proposals by client
proposalSchema.statics.findByClient = function (clientId, status = null) {
    const query = { clientId };
    if (status) {
        query.status = status;
    }
    return this.find(query)
        .populate({
            path: 'lawyerId',
            select: 'fullName profilePicture'
        })
        .populate({
            path: 'lawyerId',
            populate: {
                path: 'lawyerProfile',
                select: 'areasOfPractice yearsOfExperience city'
            }
        })
        .sort({ createdAt: -1 });
};

// Static method to find proposals by lawyer
proposalSchema.statics.findByLawyer = function (lawyerId, status = null) {
    const query = { lawyerId };
    if (status) {
        query.status = status;
    }
    return this.find(query)
        .populate({
            path: 'caseId',
            select: 'title category budgetRange province district status'
        })
        .populate({
            path: 'clientId',
            select: 'fullName profilePicture'
        })
        .sort({ createdAt: -1 });
};

const Proposal = mongoose.model('Proposal', proposalSchema);

export default Proposal;
