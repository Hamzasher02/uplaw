/**
 * Profile Helper Utilities
 * Shared functions for profile operations across services
 */

export const formatProfileResponse = (user, profile, fieldsToRemove = [], extra = {}) => {
    const profileObj =
        profile && typeof profile.toObject === "function"
            ? profile.toObject()
            : { ...(profile || {}) };

    const defaultFieldsToRemove = ["userId", "__v", "_id", "createdAt", "updatedAt"];
    const allFieldsToRemove = [...defaultFieldsToRemove, ...fieldsToRemove];

    for (const field of allFieldsToRemove) {
        delete profileObj[field];
    }

    const userObj =
        user && typeof user.toPublicJSON === "function" ? user.toPublicJSON() : (user || {});

    return { ...userObj, ...profileObj, ...extra };
};


export const getOrCreateProfile = async (Model, userId, defaults = {}) => {
    let profile = await Model.findOne({ userId });
    if (!profile) profile = await Model.create({ userId, ...defaults });
    return profile;
};

/**
 * Safer upload: upload new first, then delete old after success
 */
export const handleFileUpload = async ({
    file,
    existingDoc,
    uploadFn,
    deleteFn,
    uploadArgs = {},
}) => {
    if (!file) return null;

    const uploaded = await uploadFn(file.path, uploadArgs);

    if (existingDoc?.publicId && deleteFn) {
        await deleteFn(existingDoc.publicId);
    }

    return uploaded;
};
