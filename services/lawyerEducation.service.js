import LawyerProfile from "../model/lawyerprofile.model.js";
import LawyerEducation from "../model/lawyerEducation.model.js";
import { NOT_FOUND, BAD_REQUEST } from "../error/error.js";
import { handleFileUpload, getOrCreateProfile } from "../utils/profile.helper.utils.js";
import { uploadToCloud, deleteFromCloud } from "./cloudinary.uploader.services.js";

async function getProfileOrThrow(userId) {
  const profile = await getOrCreateProfile(LawyerProfile, userId);
  if (!profile) throw new NOT_FOUND("Lawyer profile not found");
  return profile;
}

export async function addEducationService(userId, data, files = {}) {
  const profile = await getProfileOrThrow(userId);

  const degree = data.degree?.trim();
  const university = data.university?.trim();
  const passingYear = data.passingYear ? parseInt(data.passingYear, 10) : null;

  if (!degree || !university || !passingYear) {
    throw new BAD_REQUEST("degree, university, passingYear are required");
  }

  const payload = { lawyerId: profile._id, degree, university, passingYear };

  if (files?.degreeCertificate?.[0]) {
    const uploaded = await handleFileUpload({
      file: files.degreeCertificate[0],
      existingDoc: null,
      uploadFn: uploadToCloud,
      deleteFn: deleteFromCloud
    });
    if (uploaded) payload.degreeCertificate = uploaded;
  }

  const created = await LawyerEducation.create(payload);

  // ✅ ALWAYS sync after create
  await LawyerEducation.syncEducationStats(profile._id);

  return created;
}

export async function listEducationService(userId) {
  const profile = await getProfileOrThrow(userId);
  return LawyerEducation.find({ lawyerId: profile._id }).sort({ createdAt: -1 }).lean();
}

export async function updateEducationService(userId, educationId, data, files = {}) {
  const profile = await getProfileOrThrow(userId);

  const edu = await LawyerEducation.findOne({ _id: educationId, lawyerId: profile._id });
  if (!edu) throw new NOT_FOUND("Education not found");

  if (data.degree !== undefined) edu.degree = data.degree.trim();
  if (data.university !== undefined) edu.university = data.university.trim();
  if (data.passingYear !== undefined) edu.passingYear = parseInt(data.passingYear, 10);

  if (files?.degreeCertificate?.[0]) {
    const uploaded = await handleFileUpload({
      file: files.degreeCertificate[0],
      existingDoc: edu.degreeCertificate,
      uploadFn: uploadToCloud,
      deleteFn: deleteFromCloud
    });
    if (uploaded) edu.degreeCertificate = uploaded;
  }

  await edu.save();

  // ✅ OPTIONAL: still sync (safe)
  await LawyerEducation.syncEducationStats(profile._id);

  return edu;
}

export async function deleteEducationService(userId, educationId) {
  const profile = await getProfileOrThrow(userId);

  const deleted = await LawyerEducation.findOneAndDelete({ _id: educationId, lawyerId: profile._id });
  if (!deleted) throw new NOT_FOUND("Education not found");

  // delete cloud cert if exists
  if (deleted.degreeCertificate?.publicId) {
    await deleteFromCloud(deleted.degreeCertificate.publicId);
  }

  // ✅ ALWAYS sync after delete
  await LawyerEducation.syncEducationStats(profile._id);

  return deleted;
}
