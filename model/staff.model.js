import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { ROLES, ACCOUNT_STATUS } from "../utils/constants.js";
const staffSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters long"],
      maxlength: [100, "Name cannot exceed 100 characters"],
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/\S+@\S+\.\S+/, "Email is invalid"],
      index: true,
    },

    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters long"],
      select: false,
    },

    role: {
      type: String,
      enum: [ROLES.ADMIN], // ✅ only admin allowed
      default: ROLES.ADMIN,
    },
    profilePicture: {
      publicId: { type: String },
      secureUrl: { type: String },
    },

    isEmailVerified: {
      type: Boolean,
      default: false,
    },

    emailVerifiedAt: {
      type: Date,
      default: null,
    },
    accountStatus: {
      type: String,
      enum: [ACCOUNT_STATUS.PENDING, ACCOUNT_STATUS.VERIFIED], // ✅ constants
      default: ACCOUNT_STATUS.PENDING,
    },
    isActive: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

staffSchema.index({ email: 1 }, { unique: true });

staffSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  try {
    this.password = await bcrypt.hash(this.password, 10);
    next();
  } catch (error) {
    next(error);
  }
});

staffSchema.methods.comparePassword = async function (staffPassword) {
  return bcrypt.compare(staffPassword, this.password);
};

export const Staff = mongoose.model("Staff", staffSchema);
