import User from "../model/user.model.js";
import ClientProfile from "../model/clientprofile.model.js";
import LawyerProfile from "../model/lawyerprofile.model.js";
import { ROLES } from "./constants.js";
import { NOT_FOUND } from "../error/error.js";

/**
 * Query Helper Utilities
 * Shared database query functions to eliminate duplication
 */

export const getUserWithProfile = async (userId, role) => {
    const user = await User.findById(userId);
    if (!user) {
        throw new NOT_FOUND("User not found");
    }

    let profile = null;

    if (role === ROLES.LAWYER) {
        profile = await LawyerProfile.findOne({ userId });
        if (!profile) profile = await LawyerProfile.create({ userId });
    } else if (role === ROLES.CLIENT) {
        profile = await ClientProfile.findOne({ userId });
        if (!profile) profile = await ClientProfile.create({ userId });
    }

    return { user, profile };
};

export const enrichWithLawyerProfile = async (
    lawyerId,
    fields = "areasOfPractice yearsOfExperience city courtJurisdiction languagesSpoken professionalBio"
) => {
    if (!lawyerId) return null;
    return LawyerProfile.findOne({ userId: lawyerId }).select(fields).lean();
};

export const parseJsonField = (value, fallback = null) => {
    if (value === undefined || value === null || value === "") return fallback;
    if (typeof value !== "string") return value;

    try {
        return JSON.parse(value);
    } catch {
        return fallback;
    }
};
