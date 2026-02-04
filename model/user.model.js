import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { ROLES, ACCOUNT_STATUS } from '../utils/constants.js';

const userSchema = new mongoose.Schema({
    // Core Authentication Fields
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
    },
    phoneNumber: {
        type: String,
        required: [true, 'Phone number is required'],
        unique: true,
        trim: true
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [6, 'Password must be at least 6 characters'],
        select: false // Don't return password in queries by default
    },

    // Profile Information
    fullName: {
        type: String,
        required: [true, 'Full name is required'],
        trim: true,
        maxlength: [100, 'Full name cannot exceed 100 characters']
    },
    fullNameUrdu: {
        type: String,
        trim: true,
        maxlength: [100, 'Urdu name cannot exceed 100 characters']
    },
    fatherName: {
        type: String,
        trim: true,
        maxlength: [100, 'Father name cannot exceed 100 characters']
    },
    fatherNameUrdu: {
        type: String,
        trim: true
    },
    dateOfBirth: {
        type: Date
    },
    profilePicture: {
        publicId: String,
        secureUrl: String
    },

    // Role & Status
    role: {
        type: String,
        enum: Object.values(ROLES),
        required: true
    },
    accountStatus: {
        type: String,
        enum: Object.values(ACCOUNT_STATUS),
        default: ACCOUNT_STATUS.PENDING
    },

    // Verification Status
    isEmailVerified: {
        type: Boolean,
        default: false
    },
    isPhoneVerified: {
        type: Boolean,
        default: false
    },

    // Soft Delete
    isDeleted: {
        type: Boolean,
        default: false
    },
    deletedAt: {
        type: Date
    },
    deletedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

    // Timestamps for last activity
    lastLoginAt: {
        type: Date
    },
    lastLoginIp: {
        type: String
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes for performance (email & phoneNumber already indexed via unique:true)
userSchema.index({ role: 1, accountStatus: 1 });
userSchema.index({ isDeleted: 1 });

// Virtual for client profile
userSchema.virtual('clientProfile', {
    ref: 'ClientProfile',
    localField: '_id',
    foreignField: 'userId',
    justOne: true
});

// Virtual for lawyer profile
userSchema.virtual('lawyerProfile', {
    ref: 'LawyerProfile',
    localField: '_id',
    foreignField: 'userId',
    justOne: true
});

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Method to get public profile (without sensitive data)
userSchema.methods.toPublicJSON = function() {
    const obj = this.toObject();
    delete obj.password;
    delete obj.__v;
    return obj;
};

// Static method to find by email or phone
userSchema.statics.findByIdentifier = function(identifier) {
    const isEmail = identifier.includes('@');
    return this.findOne(
        isEmail ? { email: identifier.toLowerCase() } : { phoneNumber: identifier }
    ).select('+password');
};

const User = mongoose.model('User', userSchema);

export default User;
