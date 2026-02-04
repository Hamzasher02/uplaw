import mongoose from 'mongoose';
import { GENDER, LANGUAGES } from '../utils/constants.js';

const clientProfileSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },

    // Personal Information
    fatherName: {
        type: String,
        trim: true,
        maxlength: [100, 'Father name cannot exceed 100 characters']
    },
    fatherNameUrdu: {
        type: String,
        trim: true,
        maxlength: [100, 'Urdu father name cannot exceed 100 characters']
    },
    dateOfBirth: {
        type: Date
    },
    gender: {
        type: String,
        enum: Object.values(GENDER)
    },

    // Contact Information
    whatsappNumber: {
        type: String,
        trim: true
    },
    preferredLanguage: {
        type: String,
        enum: Object.values(LANGUAGES),
        default: LANGUAGES.ENGLISH
    },

    // Identification
    cnic: {
        type: String,
        trim: true,
        match: [/^\d{5}-\d{7}-\d{1}$/, 'CNIC must be in format XXXXX-XXXXXXX-X']
    },
    cnicDocument: {
        publicId: String,
        secureUrl: String
    },

    // Address Information
    city: {
        type: String,
        trim: true,
        maxlength: [50, 'City name cannot exceed 50 characters']
    },
    province: {
        type: String,
        trim: true,
        maxlength: [50, 'Province name cannot exceed 50 characters']
    },
    postalAddress: {
        type: String,
        trim: true,
        maxlength: [500, 'Postal address cannot exceed 500 characters']
    },

    // Bio
    bio: {
        type: String,
        trim: true,
        maxlength: [500, 'Bio cannot exceed 500 characters']
    },

    // Profile Completion Tracking
    isProfileComplete: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// userId already indexed via unique:true

// Method to calculate profile completion percentage
clientProfileSchema.methods.calculateCompletion = function () {
    const fields = [
        'fatherName',
        'dateOfBirth',
        'gender',
        'cnic',
        'city',
        'province',
        'postalAddress',
        'whatsappNumber',
        'bio'
    ];

    const requiredFields = ['fatherName', 'cnic', 'city', 'province'];

    const completedFields = fields.filter((field) => {
        const val = this[field];
        return val !== undefined && val !== null && String(val).trim() !== '';
    });

    const percentage = Math.round((completedFields.length / fields.length) * 100);

    const missingFields = fields.filter((field) => {
        const val = this[field];
        return val === undefined || val === null || String(val).trim() === '';
    });

    const isCompleted = requiredFields.every((field) => {
        const val = this[field];
        return val !== undefined && val !== null && String(val).trim() !== '';
    });

    return {
        percentage,
        isCompleted,
        missingFields
    };
};


// Pre-save to update isProfileComplete
clientProfileSchema.pre('save', function(next) {
    const requiredFields = ['fatherName', 'cnic', 'city', 'province'];
    this.isProfileComplete = requiredFields.every(field => this[field]);
    next();
});

const ClientProfile = mongoose.model('ClientProfile', clientProfileSchema);

export default ClientProfile;
