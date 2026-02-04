import { BAD_REQUEST } from "../error/error.js";
import { sendSuccess, sendCreated } from "../utils/response.utils.js";
import { OTP_PURPOSE } from "../utils/constants.js";
import asyncWrapper from "../middleware/asyncWrapper.js";
import {
  registerStaffService,
  verifyStaffEmailService,
  resendStaffOtpService,
  loginAdminService,
  verifyAdminLoginOtpService,
} from "../services/staff.auth.service.js";

import { attachCookie, removeCookie } from "../utils/cookies.utils.js";
// POST /staff/login
export const loginStaffController = asyncWrapper(async (req, res) => {
  const { email, password } = req.body;
  const data = await loginAdminService({ email, password });
  return sendSuccess(res, "Login OTP sent to email.", data);
});
// POST /staff/verify-login-otp
// ===========================
// 2) CONTROLLER FIX (MISSING req IN VERIFY CALL)
// controller/staff.auth.controller.js
// ===========================

export const verifyStaffLoginOtpController = asyncWrapper(async (req, res) => {
  const { email, otp } = req.body;

  const isAppClient = req.headers["x-client-type"] === "app";

  const data = await verifyAdminLoginOtpService({ email, otp, req });

  if (isAppClient) {
    // App: Tokens ONLY in headers (not in body)
    res.set("Authorization", `Bearer ${data.accessToken}`);
    res.set("x-refresh-token", data.refreshToken);
    return sendSuccess(res, "Login successful", { admin: data.admin });
  }

  // Web: refreshToken cookie, accessToken body
  attachCookie({
    refreshToken: data.refreshToken,
    res,
  });

  return sendSuccess(res, "Login successful", {
    accessToken: data.accessToken,
    admin: data.admin,
  });
});

// POST /staff/logout

export const logoutStaffController = asyncWrapper(async (req, res) => {
  removeCookie({ res }); 
  return sendSuccess(res, "Logged out successfully", true);
});
/**
 * POST /staff/register
 * multipart/form-data:
 *  - name, email, password, role(optional), isActive(optional)
 *  - profilePicture(optional file) => req.file
 */
export const registerStaffController = asyncWrapper(async (req, res, next) => {
  const { name, email, password, role } = req.body;
  const data = await registerStaffService({
    name,
    email,
    password,
    role: role ? String(role).trim() : undefined,
    file: req.file,
  });
  return sendCreated(res, "Registered. OTP sent to email.", data);
});
/**
 * POST /staff/verify-email
 */
export const verifyStaffEmailController = asyncWrapper(async (req, res) => {
  const { email, otp } = req.body;
  const data = await verifyStaffEmailService({ email, otp });
  return sendSuccess(res, "Email verified successfully.", data);
});
/**
 * POST /staff/resend-otp
 */
export const resendStaffOtpController = asyncWrapper(async (req, res) => {
  const { email } = req.body;

  const data = await resendStaffOtpService({ email });

  return sendSuccess(res, data.message, data);
});
