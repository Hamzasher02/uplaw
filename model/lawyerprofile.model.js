import mongoose from 'mongoose';
import { AVAILABILITY_STATUS, LANGUAGES, LAWYER_PROFILE_STEPS, LAWYER_STEP_PERCENTAGE } from '../utils/constants.js';

// Sub-schema for practice location schedule
const scheduleSchema = new mongoose.Schema({
    days: {
        type: String,  // e.g., "Mon-Thu", "Saturday-Sun"
        required: true
    },
    from: {
        type: String,  // e.g., "09:00 AM"
        required: true
    },
    to: {
        type: String,  // e.g., "05:00 PM"
        required: true
    }
}, { _id: false });

// Sub-schema for practice locations
const practiceLocationSchema = new mongoose.Schema({
    status: {
        type: String,
        enum: Object.values(AVAILABILITY_STATUS),
        default: AVAILABILITY_STATUS.AVAILABLE
    },
    location: {
        type: String,
        required: true,
        trim: true
    },
    schedule: [scheduleSchema]
}, { _id: true });

// Main Lawyer Profile Schema
const lawyerProfileSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },

    // ========== User Type / Subscription ==========
    userType: {
        type: String,
        enum: ['normal', 'premium'],
        default: 'normal'
    },

    // ========== STEP 1: Basic Information ==========
    dateOfBirth: {
        type: Date
    },
    city: {
        type: String,
        trim: true
    },
    postalAddress: {
        type: String,
        trim: true,
        maxlength: [500, 'Postal address cannot exceed 500 characters']
    },

    // ========== STEP 2: Professional Qualifications (Multiple) ==========
    // Educational Qualifications (Array)
    educationalQualifications: [{
        _id: mongoose.Schema.Types.ObjectId,
        degree: {
            type: String,
            trim: true
        },
        university: {
            type: String,
            trim: true
        },
        passingYear: {
            type: Number,
            min: 1950,
            max: new Date().getFullYear()
        },
        degreeCertificate: {
            publicId: String,
            secureUrl: String
        }
    }],

    // Bar License
    licenseNo: {
        type: String,
        trim: true
    },
    associationBar: {
        type: String,
        trim: true
    },
    barCity: {
        type: String,
        trim: true
    },
    barLicenseDocument: {
        publicId: String,
        secureUrl: String
    },
    yearsOfExperience: {
        type: Number,
        min: 0,
        max: 60
    },

    // ========== STEP 3: Practice Areas & Jurisdiction ==========
    areasOfPractice: [{
        type: String,
        trim: true
    }],
    courtJurisdiction: [{
        type: String,
        trim: true
    }],
    languagesSpoken: [{
        type: String,
        enum: Object.values(LANGUAGES)
    }],
    servicesOffered: {
        type: [{
            type: String,
            trim: true
        }],
        validate: {
            validator: function (arr) {
                return arr.length <= 7;
            },
            message: 'Services offered cannot exceed 7 items'
        }
    },

    // ========== STEP 4: Performance & Availability ==========
    availabilityStatus: {
        type: String,
        enum: Object.values(AVAILABILITY_STATUS),
        default: AVAILABILITY_STATUS.AVAILABLE
    },
    practiceLocations: [practiceLocationSchema],
    professionalBio: {
        type: String,
        trim: true,
        maxlength: [500, 'Professional bio cannot exceed 500 characters']
    },

    // ========== STEP 5: Documents ==========
    cnicDocuments: [{
        type: String,
        enum: ['front', 'back', 'other'],
        documentType: String
    }, {
        publicId: String,
        secureUrl: String
    }],
    // profilePhoto is stored in User model
    // barLicenseDocument is already defined above

    // ========== Profile Completion Tracking ==========
    profileCompletionStep: {
        type: Number,
        default: 1,
        min: 1,
        max: LAWYER_PROFILE_STEPS.TOTAL
    },
    profileCompletionPercentage: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    isProfileComplete: {
        type: Boolean,
        default: false
    },

    // Step completion flags
    stepsCompleted: {
        step1: { type: Boolean, default: false },
        step2: { type: Boolean, default: false },
        step3: { type: Boolean, default: false },
        step4: { type: Boolean, default: false },
        step5: { type: Boolean, default: false }
    }
}, {
    timestamps: true
});

// Indexes for performance
lawyerProfileSchema.index({ areasOfPractice: 1 });
lawyerProfileSchema.index({ city: 1 });
lawyerProfileSchema.index({ licenseNo: 1 });
lawyerProfileSchema.index({ servicesOffered: 1 });

// Method to validate and update step completion
lawyerProfileSchema.methods.validateStep = function (stepNumber) {
    const validations = {
        1: () => !!(this.dateOfBirth && this.city),
        2: () => !!(this.educationalQualifications?.length > 0 && this.licenseNo),
        3: () => !!(this.areasOfPractice?.length > 0 && this.courtJurisdiction?.length > 0),
        4: () => !!(this.practiceLocations?.length > 0 && this.professionalBio),
        5: () => !!(this.cnicDocuments?.length >= 2)
    };

    return validations[stepNumber] ? validations[stepNumber]() : false;
};

// Method to update profile completion
lawyerProfileSchema.methods.updateCompletion = function () {
    let completedSteps = 0;

    for (let i = 1; i <= LAWYER_PROFILE_STEPS.TOTAL; i++) {
        const isComplete = this.validateStep(i);
        this.stepsCompleted[`step${i}`] = isComplete;
        if (isComplete) completedSteps++;
    }

    // Find highest completed step for current step tracking
    let highestComplete = 0;
    for (let i = LAWYER_PROFILE_STEPS.TOTAL; i >= 1; i--) {
        if (this.stepsCompleted[`step${i}`]) {
            highestComplete = i;
            break;
        }
    }

    this.profileCompletionStep = Math.min(highestComplete + 1, LAWYER_PROFILE_STEPS.TOTAL);
    this.profileCompletionPercentage = LAWYER_STEP_PERCENTAGE[highestComplete] || 0;
    this.isProfileComplete = completedSteps === LAWYER_PROFILE_STEPS.TOTAL;

    return {
        currentStep: this.profileCompletionStep,
        percentage: this.profileCompletionPercentage,
        isComplete: this.isProfileComplete,
        stepsCompleted: this.stepsCompleted
    };
};

// Pre-save to update completion tracking
lawyerProfileSchema.pre('save', function (next) {
    this.updateCompletion();
    next();
});

const LawyerProfile = mongoose.model('LawyerProfile', lawyerProfileSchema);

export default LawyerProfile;
