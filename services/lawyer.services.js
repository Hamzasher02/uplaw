import User from '../model/user.model.js';
import LawyerProfile from '../model/lawyerprofile.model.js';
import { uploadToCloud, deleteFromCloud } from './cloudinary.uploader.services.js';
import { handleFileUpload, formatProfileResponse, getOrCreateProfile } from '../utils/profile.helper.utils.js';
import { parseJsonField } from '../utils/query.helper.utils.js';
import { NOT_FOUND, BAD_REQUEST } from '../error/error.js';
import LawyerEducation from "../model/lawyerEducation.model.js";

/**
 * ===============================================
 * LAWYER PROFILE SERVICE - Unified Profile Management
 * ===============================================
 */

// ==================== HELPER FUNCTIONS ====================

/**
 * Format profile response with completion data
 * @param {User} user - User document
 * @param {LawyerProfile} profile - Lawyer profile document
 * @returns {Object} - Formatted response
 */
const formatLawyerProfileResponse = async (user, profile) => {
  const education = await LawyerEducation.find({ lawyerId: profile._id })
    .sort({ createdAt: -1 })
    .lean();

  // ✅ Real-time truth
  const realEducationCount = education.length;
  const realHasEducation = realEducationCount > 0;

  // ✅ Inject into profile BEFORE computing completion (important)
  profile.educationCount = realEducationCount;
  profile.hasEducation = realHasEducation;

  // ✅ Now completion will be correct
  const completion = profile.updateCompletion();

  // (Optional but recommended) persist fix so stale values never show again
  if (
    profile.isModified("educationCount") ||
    profile.isModified("hasEducation")
  ) {
    await profile.save();
  }

  return {
    ...formatProfileResponse(user, profile),

    education,

    // ✅ force response to match computed completion
    stepsCompleted: completion.stepsCompleted,
    profileCompletionStep: completion.currentStep,
    profileCompletionPercentage: completion.percentage,
    isProfileComplete: completion.isComplete,

    completion
  };
};


// ==================== GET SERVICES ====================

/**
 * Get Lawyer Profile
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - Complete lawyer profile with user data
 */
export async function getLawyerProfileService(userId) {
    const user = await User.findById(userId);
    if (!user) throw new NOT_FOUND('User not found');

    const profile = await getOrCreateProfile(LawyerProfile, userId);
   return await formatLawyerProfileResponse(user, profile);
}

/**
 * Get Completion Status
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - Completion status object
 */
export async function getLawyerCompletionService(userId) {
    const profile = await getOrCreateProfile(LawyerProfile, userId);
    return profile.updateCompletion();
}

// ==================== UNIFIED UPDATE SERVICE ====================

/**
 * Update Lawyer Profile (Unified - Handles All Steps)
 * Accepts all fields and files in a single request
 * 
 * @param {string} userId - User ID
 * @param {Object} data - Profile data (all fields)
 * @param {Object} files - Uploaded files (profilePhoto, cnicDocument, barLicenseDocument, degreeCertificate)
 * @returns {Promise<Object>} - Updated profile with completion status
 */
export async function updateLawyerProfileService(userId, data, files = {}) {
    const user = await User.findById(userId);
    if (!user) throw new NOT_FOUND('User not found');

    const profile = await getOrCreateProfile(LawyerProfile, userId);

    // ========== STEP 1: Basic Information ==========
    if (data.fullName !== undefined) user.fullName = data.fullName;
    if (data.fullNameUrdu !== undefined) user.fullNameUrdu = data.fullNameUrdu;
    if (data.dateOfBirth !== undefined) profile.dateOfBirth = data.dateOfBirth;
    if (data.city !== undefined) profile.city = data.city;
    if (data.postalAddress !== undefined) profile.postalAddress = data.postalAddress;

    // ========== STEP 2: Professional Qualifications (Multiple) ==========

    if (data.licenseNo !== undefined) profile.licenseNo = data.licenseNo;
    if (data.associationBar !== undefined) profile.associationBar = data.associationBar;
    if (data.barCity !== undefined) profile.barCity = data.barCity;
    if (data.yearsOfExperience !== undefined) profile.yearsOfExperience = parseInt(data.yearsOfExperience, 10);

    // ========== STEP 3: Practice Areas & Jurisdiction ==========
    if (data.areasOfPractice !== undefined) {
        profile.areasOfPractice = parseJsonField(data.areasOfPractice, []);
    }
    if (data.courtJurisdiction !== undefined) {
        profile.courtJurisdiction = parseJsonField(data.courtJurisdiction, []);
    }
    if (data.languagesSpoken !== undefined) {
        profile.languagesSpoken = parseJsonField(data.languagesSpoken, []);
    }
    if (data.servicesOffered !== undefined) {
        const services = parseJsonField(data.servicesOffered, []);

        // Validate max 7 services
        if (services.length > 7) {
            throw new BAD_REQUEST('Services offered cannot exceed 7 items');
        }
        profile.servicesOffered = services;
    }

    // ========== STEP 4: Performance & Availability ==========
    if (data.availabilityStatus !== undefined) profile.availabilityStatus = data.availabilityStatus;
    if (data.practiceLocations !== undefined) {
        profile.practiceLocations = parseJsonField(data.practiceLocations, []);
    }
    if (data.professionalBio !== undefined) profile.professionalBio = data.professionalBio;

    // ========== STEP 5: Documents ==========

    // ========== FILE UPLOADS ==========
    if (files.profilePhoto?.[0]) {
        const result = await handleFileUpload({
            file: files.profilePhoto[0],
            existingDoc: user.profilePicture,
            uploadFn: uploadToCloud,
            deleteFn: deleteFromCloud
        });
        if (result) user.profilePicture = result;
    }

    if (files.cnicDocuments) {
        // Handle multiple CNIC documents (front, back, etc.)
        const cnicFiles = Array.isArray(files.cnicDocuments) ? files.cnicDocuments : [files.cnicDocuments];
        profile.cnicDocuments = [];
        
        for (let i = 0; i < cnicFiles.length; i++) {
            if (cnicFiles[i]) {
                const result = await handleFileUpload({
                    file: cnicFiles[i],
                    existingDoc: profile.cnicDocuments?.[i],
                    uploadFn: uploadToCloud,
                    deleteFn: deleteFromCloud
                });
                if (result) {
                    profile.cnicDocuments.push(result);
                }
            }
        }
    }

    if (files.barLicenseDocument?.[0]) {
        const result = await handleFileUpload({
            file: files.barLicenseDocument[0],
            existingDoc: profile.barLicenseDocument,
            uploadFn: uploadToCloud,
            deleteFn: deleteFromCloud
        });
        if (result) profile.barLicenseDocument = result;
    }


    // Save both documents
    await user.save();
    await profile.save();

    return formatLawyerProfileResponse(user, profile);
}

// ==================== STEP-SPECIFIC SERVICES (Independent) ====================

/**
 * Step 1: Basic Information
 */
export async function updateLawyerStep1Service(userId, data) {
    const user = await User.findById(userId);
    if (!user) throw new NOT_FOUND('User not found');

    const profile = await getOrCreateProfile(LawyerProfile, userId);

    // Update Step 1 Fields
    if (data.fullName !== undefined) user.fullName = data.fullName;
    if (data.fullNameUrdu !== undefined) user.fullNameUrdu = data.fullNameUrdu;
    if (data.email !== undefined) user.email = data.email;
    if (data.phoneNumber !== undefined) user.phoneNumber = data.phoneNumber;
    if (data.dateOfBirth !== undefined) profile.dateOfBirth = data.dateOfBirth;
    if (data.city !== undefined) profile.city = data.city;
    if (data.postalAddress !== undefined) profile.postalAddress = data.postalAddress;

    await user.save();
    await profile.save();

    return formatLawyerProfileResponse(user, profile);
}

/**
 * Step 2: Professional Qualifications
 */
export async function updateLawyerStep2Service(userId, data, files) {
  const user = await User.findById(userId);
  if (!user) throw new NOT_FOUND("User not found");

  const profile = await getOrCreateProfile(LawyerProfile, userId);

  if (data.licenseNo !== undefined) profile.licenseNo = data.licenseNo;
  if (data.associationBar !== undefined) profile.associationBar = data.associationBar;
  if (data.barCity !== undefined) profile.barCity = data.barCity;
  if (data.yearsOfExperience !== undefined) profile.yearsOfExperience = parseInt(data.yearsOfExperience, 10);

  if (files?.barLicenseDocument?.[0]) {
    const result = await handleFileUpload({
      file: files.barLicenseDocument[0],
      existingDoc: profile.barLicenseDocument,
      uploadFn: uploadToCloud,
      deleteFn: deleteFromCloud
    });
    if (result) profile.barLicenseDocument = result;
  }

  await profile.save();
  return formatLawyerProfileResponse(user, profile);
}


/**
 * Step 3: Practice Areas
 */
export async function updateLawyerStep3Service(userId, data) {
    const user = await User.findById(userId);
    if (!user) throw new NOT_FOUND('User not found');

    const profile = await getOrCreateProfile(LawyerProfile, userId);

    // Update Step 3 Fields
    if (data.areasOfPractice !== undefined) {
        profile.areasOfPractice = parseJsonField(data.areasOfPractice, []);
    }
    if (data.courtJurisdiction !== undefined) {
        profile.courtJurisdiction = parseJsonField(data.courtJurisdiction, []);
    }
    if (data.languagesSpoken !== undefined) {
        profile.languagesSpoken = parseJsonField(data.languagesSpoken, []);
    }
    if (data.servicesOffered !== undefined) {
        const services = parseJsonField(data.servicesOffered, []);

        if (services.length > 7) {
            throw new BAD_REQUEST('Services offered cannot exceed 7 items');
        }
        profile.servicesOffered = services;
    }

    await profile.save();
    return formatLawyerProfileResponse(user, profile);
}

/**
 * Step 4: Availability
 */
export async function updateLawyerStep4Service(userId, data) {
    const user = await User.findById(userId);
    if (!user) throw new NOT_FOUND('User not found');

    const profile = await getOrCreateProfile(LawyerProfile, userId);

    // Update Step 4 Fields
    if (data.availabilityStatus !== undefined) profile.availabilityStatus = data.availabilityStatus;
    if (data.practiceLocations !== undefined) {
        profile.practiceLocations = parseJsonField(data.practiceLocations, []);
    }
    if (data.professionalBio !== undefined) profile.professionalBio = data.professionalBio;

    await profile.save();
    return formatLawyerProfileResponse(user, profile);
}

/**
 * Step 5: Documents (Photos & CNIC)
 */
export async function updateLawyerStep5Service(userId, data, files) {
    const user = await User.findById(userId);
    if (!user) throw new NOT_FOUND('User not found');

    const profile = await getOrCreateProfile(LawyerProfile, userId);

    // Update Step 5 Fields

    // Handle Step 5 Files
    let userModified = false;

    if (files?.profilePhoto?.[0]) {
        const result = await handleFileUpload({
            file: files.profilePhoto[0],
            existingDoc: user.profilePicture,
            uploadFn: uploadToCloud,
            deleteFn: deleteFromCloud
        });
        if (result) {
            user.profilePicture = result;
            userModified = true;
        }
    }

    if (files?.cnicDocuments) {
        // Handle multiple CNIC documents (front, back, etc.)
        const cnicFiles = Array.isArray(files.cnicDocuments) ? files.cnicDocuments : [files.cnicDocuments];
        profile.cnicDocuments = [];
        
        for (let i = 0; i < cnicFiles.length; i++) {
            if (cnicFiles[i]) {
                const result = await handleFileUpload({
                    file: cnicFiles[i],
                    existingDoc: profile.cnicDocuments?.[i],
                    uploadFn: uploadToCloud,
                    deleteFn: deleteFromCloud
                });
                if (result) {
                    profile.cnicDocuments.push(result);
                }
            }
        }
    }

    if (userModified) await user.save();
    await profile.save();

    return formatLawyerProfileResponse(user, profile);
}

// ==================== ADDITIONAL SERVICES ====================

/**
 * Update Profile Picture
 */
export async function updateLawyerProfilePictureService(userId, file) {
    if (!file) throw new BAD_REQUEST('Please provide a profile picture');

    const user = await User.findById(userId);
    if (!user) throw new NOT_FOUND('User not found');

    const result = await handleFileUpload({
        file,
        existingDoc: user.profilePicture,
        uploadFn: uploadToCloud,
        deleteFn: deleteFromCloud
    });
    user.profilePicture = result;
    await user.save();

    return { profilePicture: user.profilePicture.secureUrl };
}

/**
 * Submit Complete Profile (Alias for updateLawyerProfileService)
 * Kept for backward compatibility
 */
export async function submitCompleteProfileService(userId, data, files) {
    return updateLawyerProfileService(userId, data, files);
}

// Legacy exports for backward compatibility (now deprecated)
export async function addLawyerQualificationService() {
    throw new BAD_REQUEST('This endpoint is deprecated. Use PATCH /api/lawyers/profile instead.');
}

export async function removeLawyerQualificationService() {
    throw new BAD_REQUEST('This endpoint is deprecated. Use PATCH /api/lawyers/profile instead.');
}
