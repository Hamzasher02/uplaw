import mongoose from "mongoose";
import LawyerProfile from "./lawyerprofile.model.js";

const lawyerEducationSchema = new mongoose.Schema(
  {
    lawyerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LawyerProfile",
      required: true,
      index: true
    },
    degree: { type: String, required: true, trim: true },
    university: { type: String, required: true, trim: true },
    passingYear: {
      type: Number,
      required: true,
      min: 1950,
      max: new Date().getFullYear()
    },
    degreeCertificate: {
      publicId: String,
      secureUrl: String
    }
  },
  { timestamps: true }
);

lawyerEducationSchema.index(
  { lawyerId: 1, degree: 1, university: 1, passingYear: 1 },
  { unique: false }
);

/**
 * ✅ Single source of truth:
 * Recalculate educationCount & hasEducation from DB
 */
lawyerEducationSchema.statics.syncEducationStats = async function (lawyerProfileId) {
  const count = await this.countDocuments({ lawyerId: lawyerProfileId });

  const profile = await LawyerProfile.findById(lawyerProfileId);
  if (!profile) return;

  profile.educationCount = count;
  profile.hasEducation = count > 0;

  // ensure completion recalculates too
  profile.updateCompletion();
  await profile.save();
};

const LawyerEducation = mongoose.model("LawyerEducation", lawyerEducationSchema);
export default LawyerEducation;
