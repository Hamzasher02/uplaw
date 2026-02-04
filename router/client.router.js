import express from 'express';
import multer from 'multer';
import authenticationMiddleware from '../middleware/authentication.middleware.js';
import { requireRole } from '../middleware/rbac.middleware.js';
import activityLogger from '../middleware/activitylogger.middleware.js';
import { clientProfileUpdateValidator } from '../services/client.validator.services.js';
import { validationMiddleware } from '../services/auth.validator.services.js';
import { getProfile, updateProfile } from '../controller/client.controller.js';
import { ROLES } from '../utils/constants.js';

const router = express.Router();

// All routes require authentication + client role
router.use(authenticationMiddleware);
router.use(requireRole(ROLES.CLIENT));

router.route('/profile').get(
    activityLogger("PROFILE", "Get client profile"),
    getProfile
);

const uploadClientFiles = multer({ dest: 'uploads/' }).fields([
    { name: 'profilePicture', maxCount: 1 },
    { name: 'cnicDocument', maxCount: 1 }
]);

router.route('/profile').patch(
    uploadClientFiles,
    clientProfileUpdateValidator(),
    validationMiddleware,
    activityLogger("PROFILE", "Update client profile"),
    updateProfile
);

export default router;
