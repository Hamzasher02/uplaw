import express from "express";
import multer from "multer";
import authenticationMiddleware from "../middleware/authentication.middleware.js";
import { requireRole } from "../middleware/rbac.middleware.js";
import { singleProfilePicture } from "../middleware/multer.middleware.js";
import activityLogger from "../middleware/activitylogger.middleware.js";
import { validationMiddleware } from "../services/auth.validator.services.js";
import {
  lawyerStep1Validator,
  lawyerStep2Validator,
  lawyerStep3Validator,
  lawyerStep4Validator,
  lawyerStep5Validator,
  lawyerUnifiedProfileValidator,
  lawyerEducationUpdateValidator,
  lawyerEducationCreateValidator,
} from "../services/lawyer.validator.services.js";
import {
  getProfile,
  getCompletion,
  updateProfile,
  updateStep1,
  updateStep2,
  updateStep3,
  updateStep4,
  updateStep5,
  updateProfilePicture,
  submitCompleteProfile,
} from "../controller/lawyer.controller.js";
import {
  addEducation,
  listEducation,
  updateEducation,
  deleteEducation,
} from "../controller/lawyerEducation.controller.js";
import { ROLES, LOG_ACTIONS, LOG_MODULES } from "../utils/constants.js";

const router = express.Router();

// Multer configuration for profile documents
const uploadProfileDocs = multer({
  dest: "uploads/",
  limits: { fileSize: 5 * 1024 * 1024 },
}).fields([
  { name: "profilePhoto", maxCount: 1 },
  { name: "cnicDocument", maxCount: 1 },
  { name: "barLicenseDocument", maxCount: 1 },
]);

// Multer configuration ONLY for education certificate upload
const uploadEducationDocs = multer({
  dest: "uploads/",
  limits: { fileSize: 5 * 1024 * 1024 },
}).fields([{ name: "degreeCertificate", maxCount: 1 }]);

// All routes require authentication + lawyer role
router.use(authenticationMiddleware);
router.use(requireRole(ROLES.LAWYER));

// ==================== GET ROUTES ====================
router
  .route("/profile")
  .get(
    activityLogger(LOG_ACTIONS.PROFILE_UPDATE, "Get lawyer profile", LOG_MODULES.LAWYER),
    getProfile
  );

router
  .route("/profile/completion")
  .get(
    activityLogger(LOG_ACTIONS.PROFILE_UPDATE, "Get completion status", LOG_MODULES.LAWYER),
    getCompletion
  );

// ==================== UNIFIED UPDATE ROUTE ====================
router
  .route("/profile")
  .patch(
    uploadProfileDocs,
    lawyerUnifiedProfileValidator(),
    validationMiddleware,
    activityLogger(LOG_ACTIONS.PROFILE_UPDATE, "Update lawyer profile (Unified)", LOG_MODULES.LAWYER),
    updateProfile
  );

// ==================== STEP-SPECIFIC ROUTES ====================
router
  .route("/profile/step/1")
  .patch(
    lawyerStep1Validator(),
    validationMiddleware,
    activityLogger(LOG_ACTIONS.PROFILE_UPDATE, "Update Step 1", LOG_MODULES.LAWYER),
    updateStep1
  );

router
  .route("/profile/step/2")
  .patch(
    uploadProfileDocs,
    lawyerStep2Validator(),
    validationMiddleware,
    activityLogger(LOG_ACTIONS.PROFILE_UPDATE, "Update Step 2", LOG_MODULES.LAWYER),
    updateStep2
  );

router
  .route("/profile/step/3")
  .patch(
    lawyerStep3Validator(),
    validationMiddleware,
    activityLogger(LOG_ACTIONS.PROFILE_UPDATE, "Update Step 3", LOG_MODULES.LAWYER),
    updateStep3
  );

router
  .route("/profile/step/4")
  .patch(
    lawyerStep4Validator(),
    validationMiddleware,
    activityLogger(LOG_ACTIONS.PROFILE_UPDATE, "Update Step 4", LOG_MODULES.LAWYER),
    updateStep4
  );

router
  .route("/profile/step/5")
  .patch(
    uploadProfileDocs,
    lawyerStep5Validator(),
    validationMiddleware,
    activityLogger(LOG_ACTIONS.PROFILE_UPDATE, "Update Step 5", LOG_MODULES.LAWYER),
    updateStep5
  );

// ==================== ADDITIONAL ROUTES ====================
router
  .route("/profile/picture")
  .patch(
    singleProfilePicture,
    activityLogger(LOG_ACTIONS.PROFILE_UPDATE, "Update profile picture", LOG_MODULES.LAWYER),
    updateProfilePicture
  );

// Complete Profile Submit
router
  .route("/profile/complete")
  .post(
    uploadProfileDocs,
    lawyerUnifiedProfileValidator(),
    validationMiddleware,
    activityLogger(LOG_ACTIONS.PROFILE_UPDATE, "Submit complete profile", LOG_MODULES.LAWYER),
    submitCompleteProfile
  );

// ==================== EDUCATION ROUTES ====================
router.post(
  "/profile/step/2/add-education",
  uploadEducationDocs,
  lawyerEducationCreateValidator(),
  validationMiddleware,
  activityLogger(LOG_ACTIONS.PROFILE_UPDATE, "Add lawyer education", LOG_MODULES.LAWYER),
  addEducation
);

router.patch(
  "/profile/step/2/update-education/:educationId",
  uploadEducationDocs,
  lawyerEducationUpdateValidator(),
  validationMiddleware,
  activityLogger(LOG_ACTIONS.PROFILE_UPDATE, "Update lawyer education", LOG_MODULES.LAWYER),
  updateEducation
);

router.get(
  "/profile/step/2/list-education",
  activityLogger(LOG_ACTIONS.PROFILE_UPDATE, "Get lawyer education list", LOG_MODULES.LAWYER),
  listEducation
);

router.delete(
  "/profile/step/2/delete-education/:educationId",
  activityLogger(LOG_ACTIONS.PROFILE_UPDATE, "Delete lawyer education", LOG_MODULES.LAWYER),
  deleteEducation
);

export default router;
