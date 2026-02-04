import mongoose from 'mongoose';

// Document sub-schema
const documentSchema = new mongoose.Schema({
    publicId: {
        type: String,
        required: true
    },
    secureUrl: {
        type: String,
        required: true
    },
    originalName: {
        type: String
    },
    fileSize: {
        type: Number
    },
    mimetype: {
        type: String
    }
}, { _id: false });

// Phase data sub-schema (for phases 1, 2, 3, 5)
const phaseDataSchema = new mongoose.Schema({
    documents: [documentSchema],
    judgeCourtRemarks: {
        type: String,
        trim: true
    },
    lawyerRemarks: {
        type: String,
        trim: true
    },
    opponentRemarks: {
        type: String,
        trim: true
    },
    submittedAt: {
        type: Date
    },
    submittedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, { _id: false });

// Court hearing sub-phase schema
const subPhaseSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Sub-phase name is required'],
        trim: true
    },
    documents: [documentSchema],
    judgeCourtRemarks: {
        type: String,
        trim: true
    },
    lawyerRemarks: {
        type: String,
        trim: true
    },
    opponentRemarks: {
        type: String,
        trim: true
    },
    submittedAt: {
        type: Date,
        required: true,
        default: Date.now
    },
    submittedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, { timestamps: false });

// Main Timeline Schema
const caseTimelineSchema = new mongoose.Schema({
    caseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Case',
        required: [true, 'Case ID is required'],
        unique: true,
        index: true
    },

    phases: {
        // Phase 1: Case Intake
        phase1CaseIntake: {
            status: {
                type: String,
                enum: ['pending', 'ongoing', 'completed'],
                default: 'ongoing'
            },
            data: phaseDataSchema
        },

        // Phase 2: Case Filed
        phase2CaseFiled: {
            status: {
                type: String,
                enum: ['pending', 'ongoing', 'completed'],
                default: 'pending'
            },
            data: phaseDataSchema
        },

        // Phase 3: Trial Preparation
        phase3TrialPreparation: {
            status: {
                type: String,
                enum: ['pending', 'ongoing', 'completed'],
                default: 'pending'
            },
            data: phaseDataSchema
        },

        // Phase 4: Court Hearing (special - has sub-phases)
        phase4CourtHearing: {
            status: {
                type: String,
                enum: ['pending', 'ongoing', 'completed'],
                default: 'pending'
            },
            subPhases: [subPhaseSchema]
        },

        // Phase 5: Case Outcome/Closure (special - has outcome field)
        phase5Outcome: {
            status: {
                type: String,
                enum: ['pending', 'ongoing', 'completed'],
                default: 'pending'
            },
            data: {
                outcome: {
                    type: String,
                    enum: ['won', 'settled', 'dismissed']
                },
                documents: [documentSchema],
                judgeCourtRemarks: {
                    type: String,
                    trim: true
                },
                lawyerRemarks: {
                    type: String,
                    trim: true
                },
                opponentRemarks: {
                    type: String,
                    trim: true
                },
                submittedAt: {
                    type: Date
                },
                submittedBy: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'User'
                }
            }
        }
    }
}, {
    timestamps: true
});

// Index for efficient queries
caseTimelineSchema.index({ caseId: 1 });

// Method to calculate progress percentage
caseTimelineSchema.methods.calculateProgress = function () {
    let completedCount = 0;

    if (this.phases.phase1CaseIntake.status === 'completed') completedCount++;
    if (this.phases.phase2CaseFiled.status === 'completed') completedCount++;
    if (this.phases.phase3TrialPreparation.status === 'completed') completedCount++;
    if (this.phases.phase4CourtHearing.status === 'completed') completedCount++;
    if (this.phases.phase5Outcome.status === 'completed') completedCount++;

    return Math.round((completedCount / 5) * 100);
};

const CaseTimeline = mongoose.model('CaseTimeline', caseTimelineSchema);

export default CaseTimeline;
