import fs from "fs/promises";
import { Staff } from "../model/staff.model.js";
import { BAD_REQUEST, NOT_FOUND,UNAUTHENTICATED } from "../error/error.js";
import { uploadToCloud } from "../services/cloudinary.uploader.services.js";
import { generateAndSendOtpService, verifyOtpService } from "../services/otp.services.js";
import { ROLES, OTP_PURPOSE, OTP_TYPE, ACCOUNT_STATUS } from "../utils/constants.js";
import crypto from "crypto";
import { Staff as Admin } from "../model/staff.model.js"; // staff model hi admin hai
import RefreshToken from "../model/refreshtoken.model.js";
import { createJWT } from "../utils/cookies.utils.js";
const unlinkSafe = async (p) => {
  if (!p) return;
  try { await fs.unlink(p); } catch (_) {}
};
const getReqInfo = (req) => {
  const xff = req.headers["x-forwarded-for"];
  const ip =
    (typeof xff === "string" && xff.split(",")[0].trim()) ||
    req.ip ||
    req.connection?.remoteAddress;

  return {
    ip,
    userAgent: req.headers["user-agent"] || "unknown",
    deviceInfo: req.headers["user-agent"] || "unknown",
  };
};
// ✅ ISSUE TOKENS (your structure + RefreshToken model)
const issueAdminTokens = async (admin, reqInfo) => {

  // --- ACCESS TOKEN (15 min) ---
  const accessToken = createJWT({
    payload: {
      userId: admin._id,
      email: admin.email,
      role: ROLES.ADMIN,
      userType: ROLES.ADMIN,
    },
    expiresIn: "15m",
  });

  // --- RAW REFRESH TOKEN ---
  const refreshToken = crypto.randomBytes(40).toString("hex");

  // Save in DB
  await RefreshToken.create({
    userId: admin._id,
    userType: ROLES.ADMIN,
    token: refreshToken,
    deviceInfo: reqInfo.deviceInfo,
    ipAddress: reqInfo.ip,
    userAgent: reqInfo.userAgent,
  });

  return { accessToken, refreshToken };
};
// ==========================
// STEP-1 → LOGIN (password → OTP)
// ==========================
export const loginAdminService = async ({ email, password }) => {

  const normalizedEmail = String(email).trim().toLowerCase();

  const admin = await Admin.findOne({ email: normalizedEmail }).select("+password");
  if (!admin) throw new NOT_FOUND("Admin not found");

  if (!admin.isEmailVerified || admin.accountStatus !== ACCOUNT_STATUS.VERIFIED) {
    await generateAndSendOtpService(
      admin._id,
      admin.email,
      OTP_TYPE.EMAIL,
      OTP_PURPOSE.REGISTRATION,
      ROLES.ADMIN
    );

    throw new BAD_REQUEST("Please verify your email first. A new OTP has been sent.");
  }

  if (!admin.isActive) throw new UNAUTHENTICATED("Account is inactive");

  const ok = await admin.comparePassword(password);
  if (!ok) throw new UNAUTHENTICATED("Invalid password");

  // SEND LOGIN OTP
  await generateAndSendOtpService(
    admin._id,
    admin.email,
    OTP_TYPE.EMAIL,
    OTP_PURPOSE.LOGIN,
    ROLES.ADMIN
  );

  return {
    message: "Login OTP sent to email",
    email: admin.email,
  };
};

// ==========================
// STEP-2 → VERIFY OTP → TOKENS
// ==========================
export const verifyAdminLoginOtpService = async ({ email, otp, req }) => {

  const normalizedEmail = String(email).trim().toLowerCase();

  const admin = await Admin.findOne({ email: normalizedEmail });
  if (!admin) throw new NOT_FOUND("Admin not found");

  if (!admin.isEmailVerified || admin.accountStatus !== ACCOUNT_STATUS.VERIFIED) {
    throw new BAD_REQUEST("Email not verified");
  }

  if (!admin.isActive) throw new UNAUTHENTICATED("Account is inactive");

  // VERIFY OTP
  await verifyOtpService(admin._id, otp, normalizedEmail, OTP_PURPOSE.LOGIN);

  const reqInfo = getReqInfo(req);

  // GENERATE TOKENS
  const { accessToken, refreshToken } = await issueAdminTokens(admin, reqInfo);

  return {
    accessToken,
    refreshToken, // will go into cookie in controller
    admin: {
      _id: admin._id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      profilePicture: admin.profilePicture,
    },
  };
};

export const registerStaffService = async ({ name, email, password, role, file }) => {
  const normalizedEmail = String(email).trim().toLowerCase();

  const exists = await Staff.findOne({ email: normalizedEmail });
  if (exists) {
    // Agar user pehle se hai par verified nahi, to use update/resend logic pe bhejein
    if (exists.isEmailVerified) throw new BAD_REQUEST("Email already registered");
    throw new BAD_REQUEST("Email already registered but not verified. Please verify or resend OTP.");
  }

  let profilePicture;
  if (file?.path) {
    profilePicture = await uploadToCloud(file.path);
    await unlinkSafe(file.path);
  }

  // Record save ho raha hai par accountStatus PENDING hai aur isActive FALSE hai
  const staff = await Staff.create({
    name,
    email: normalizedEmail,
    password,
    role: ROLES.ADMIN, 
    isActive: false, 
    profilePicture,
    isEmailVerified: false,
    accountStatus: ACCOUNT_STATUS.PENDING,
  });

  await generateAndSendOtpService(
    staff._id,
    staff.email,
    OTP_TYPE.EMAIL,
    OTP_PURPOSE.REGISTRATION,
    ROLES.ADMIN
  );

  return { staffId: staff._id, email: staff.email, status: staff.accountStatus ,role : staff.role };
};

export const verifyStaffEmailService = async ({ email, otp }) => {
  const staff = await Staff.findOne({ email: email.toLowerCase() });
  if (!staff) throw new NOT_FOUND("Staff not found");
  if (staff.isEmailVerified) throw new BAD_REQUEST("Email already verified");

  // Fix: verifyOtpService ko staff._id chahiye kyunki OTP model mein userId save hai
  await verifyOtpService(staff._id, otp, email, OTP_PURPOSE.REGISTRATION);

  staff.isEmailVerified = true;
  staff.emailVerifiedAt = new Date();
  staff.accountStatus = ACCOUNT_STATUS.VERIFIED;
  staff.isActive = true; // Ab user login kar sakta hai

  await staff.save();

  return { email: staff.email, status: staff.accountStatus };
};

export const resendStaffOtpService = async ({ email }) => {
  const staff = await Staff.findOne({ email: email.toLowerCase() });
  if (!staff) throw new NOT_FOUND("Staff not found");
  if (staff.isEmailVerified) throw new BAD_REQUEST("Email already verified");

  await generateAndSendOtpService(
    staff._id,
    staff.email,
    OTP_TYPE.EMAIL,
    OTP_PURPOSE.REGISTRATION,
    ROLES.ADMIN
  );

  return { message: "OTP resent successfully to " + email };
};