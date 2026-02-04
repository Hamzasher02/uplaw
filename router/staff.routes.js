// ✅ FIX: tum /login-verify route pe galat validator use kar rahe ho
// tumne staffVerifyEmailValidator() lagaya hua hai (jo REGISTRATION verify wali flow ke liye hai)
// isliye "Email already verified" aa raha hai (kyunki wo verify-email service/controller pe ja raha ya purpose mismatch ho raha).

// ===========================
// 1) ROUTES FIX
// routes/staff.routes.js
// ===========================

import express from "express";

import {
  validateProfilePicture,
  staffRegisterValidator,
  staffVerifyEmailValidator,
  staffResendOtpValidator,
  staffLoginValidator,
  staffVerifyLoginOtpValidator, // ✅ use this for login OTP verify
} from "../services/staff.validators.service.js";

import {
  registerStaffController,
  verifyStaffEmailController,
  resendStaffOtpController,
  loginStaffController,
  verifyStaffLoginOtpController,
  logoutStaffController,
} from "../controller/staff.auth.controller.js";

import { singleProfilePicture } from "../middleware/multer.middleware.js";
import activityLogger from "../middleware/activityLogger.middleware.js";
import { LOG_ACTIONS, LOG_MODULES } from "../utils/constants.js";

const router = express.Router();

/**
 * Base: /api/v1/staff
 */

// Login (Step-1) -> sends LOGIN OTP
router.post(
  "/login",
  staffLoginValidator(),
  activityLogger(
    LOG_ACTIONS.LOGIN,
    "Admin login request (OTP sent)",
    LOG_MODULES.ADMIN,
  ),
  loginStaffController,
);

// Login OTP Verify (Step-2) -> should SUCCESSFULLY LOGIN + TOKENS
router.post(
  "/login-verify",
  staffVerifyLoginOtpValidator(),
  activityLogger(
    LOG_ACTIONS.LOGIN,
    "Admin login OTP verification",
    LOG_MODULES.ADMIN,
  ),
  verifyStaffLoginOtpController,
);

// Register staff (multipart/form-data)
router.post(
  "/register",
  singleProfilePicture,
  validateProfilePicture,
  staffRegisterValidator(),
  activityLogger(
    LOG_ACTIONS.REGISTER,
    "Admin registration request",
    LOG_MODULES.ADMIN,
  ),
  registerStaffController,
);

// Verify staff email (REGISTRATION verify)
router.post(
  "/verify-email",
  staffVerifyEmailValidator(),
  activityLogger(
    LOG_ACTIONS.ACCOUNT_VERIFY,
    "Admin email verification request",
    LOG_MODULES.ADMIN,
  ),
  verifyStaffEmailController,
);

// Resend OTP (REGISTRATION resend)
router.post(
  "/resend-otp",
  staffResendOtpValidator(),
  activityLogger(
    LOG_ACTIONS.ACCOUNT_VERIFY,
    "Admin resend OTP request",
    LOG_MODULES.ADMIN,
  ),
  resendStaffOtpController,
);
router.post(
  "/logout",
  activityLogger(
    LOG_ACTIONS.LOGOUT,
    "Admin logout request",
    LOG_MODULES.ADMIN,
  ),
  logoutStaffController,
);

export default router;
