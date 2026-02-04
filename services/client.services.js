import User from '../model/user.model.js';
import ClientProfile from '../model/clientprofile.model.js';
import { uploadToCloud, deleteFromCloud } from './cloudinary.uploader.services.js';
import { handleFileUpload, formatProfileResponse, getOrCreateProfile } from '../utils/profile.helper.utils.js';
import { NOT_FOUND } from '../error/error.js';

/**
 * ===============================================
 * CLIENT PROFILE SERVICE
 * ===============================================
 */

/**
 * Get Client Profile
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - Complete client profile with user data
 */
export async function getClientProfileService(userId) {
    const user = await User.findById(userId);
    if (!user) throw new NOT_FOUND('User not found');

    const profile = await getOrCreateProfile(ClientProfile, userId);

    const completion = typeof profile.calculateCompletion === "function"
        ? profile.calculateCompletion()
        : { percentage: 0, isCompleted: false, missingFields: [] };

    return formatProfileResponse(user, profile, [], { completion });
}
/**
 * Update Client Profile
 * @param {string} userId - User ID
 * @param {Object} data - Profile data
 * @param {Object} files - Uploaded files (profilePicture, cnicDocument)
 * @returns {Promise<Object>} - Updated profile
 */
export async function updateClientProfileService(userId, data, files) {
    const user = await User.findById(userId);
    if (!user) throw new NOT_FOUND('User not found');

    const profile = await getOrCreateProfile(ClientProfile, userId);

    // ONE-TIME FIELDS (only set if currently empty)
    if (data.fullName !== undefined && !user.fullName) user.fullName = data.fullName;
    if (data.fullNameUrdu !== undefined && !user.fullNameUrdu) user.fullNameUrdu = data.fullNameUrdu;
    if (data.fatherName !== undefined && !profile.fatherName) profile.fatherName = data.fatherName;
    if (data.fatherNameUrdu !== undefined && !profile.fatherNameUrdu) profile.fatherNameUrdu = data.fatherNameUrdu;
    if (data.cnic !== undefined && !profile.cnic) profile.cnic = data.cnic;

    // EDITABLE FIELDS (can be updated anytime)
    if (data.dateOfBirth !== undefined) profile.dateOfBirth = data.dateOfBirth;
    if (data.gender !== undefined) profile.gender = data.gender;
    if (data.city !== undefined) profile.city = data.city;
    if (data.province !== undefined) profile.province = data.province;
    if (data.postalAddress !== undefined) profile.postalAddress = data.postalAddress;
    if (data.whatsappNumber !== undefined) profile.whatsappNumber = data.whatsappNumber;
    if (data.preferredLanguage !== undefined) profile.preferredLanguage = data.preferredLanguage;
    if (data.bio !== undefined) profile.bio = data.bio;

    // Handle File Uploads
    if (files) {
        const profilePictureFile = files.profilePicture?.[0];
        if (profilePictureFile) {
            const result = await handleFileUpload({
                file: profilePictureFile,
                existingDoc: user.profilePicture,
                uploadFn: uploadToCloud,
                deleteFn: deleteFromCloud
            });
            if (result) user.profilePicture = result;
        }

        const cnicDocumentFile = files.cnicDocument?.[0];
        if (cnicDocumentFile && !profile.cnicDocument?.secureUrl) {
            const result = await handleFileUpload({
                file: cnicDocumentFile,
                existingDoc: null,
                uploadFn: uploadToCloud,
                deleteFn: deleteFromCloud
            });
            if (result) profile.cnicDocument = result;
        }
    }

    await user.save();
    await profile.save();

    const completion = typeof profile.calculateCompletion === "function"
        ? profile.calculateCompletion()
        : { percentage: 0, isCompleted: false, missingFields: [] };

    return formatProfileResponse(user, profile, [], { completion });
}
