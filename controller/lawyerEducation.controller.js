import asyncWrapper from "../middleware/asyncWrapper.js";
import { sendSuccess, sendCreated } from "../utils/response.utils.js";
import cleanupUploadedFiles from "../utils/cleanup.helper.utils.js";
import {
  addEducationService,
  listEducationService,
  updateEducationService,
  deleteEducationService
} from "../services/lawyerEducation.service.js";

export const addEducation = asyncWrapper(async (req, res) => {
  const result = await addEducationService(req.user.userId, req.body, req.files);
  cleanupUploadedFiles(req);
  sendCreated(res, "Education added", result);
});

export const listEducation = asyncWrapper(async (req, res) => {
  const result = await listEducationService(req.user.userId);
  sendSuccess(res, "Education list fetched", result);
});

export const updateEducation = asyncWrapper(async (req, res) => {
  const result = await updateEducationService(req.user.userId, req.params.educationId, req.body, req.files);
  cleanupUploadedFiles(req);
  sendSuccess(res, "Education updated", result);
});

export const deleteEducation = asyncWrapper(async (req, res) => {
  const result = await deleteEducationService(req.user.userId, req.params.educationId);
  sendSuccess(res, "Education deleted", result);
});
