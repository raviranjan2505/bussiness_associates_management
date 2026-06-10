import express from "express";
import upload from "../utils/multer.js";
import { adminOnly, verifyToken } from "../utils/verifyUser.js";
import {
  adminDashboard,
  associateDashboard,
  createDivision,
  createService,
  deleteDivision,
  deleteService,
  getService,
  getWork,
  listDivisions,
  listNotifications,
  listServices,
  listWorks,
  markNotificationRead,
  submitWork,
  updateDivision,
  updateService,
  updateWorkStatus,
  uploadAdditionalDocuments,
} from "../controller/business.controller.js";

const router = express.Router();

router.get("/divisions", verifyToken, listDivisions);
router.post("/divisions", verifyToken, adminOnly, createDivision);
router.put("/divisions/:id", verifyToken, adminOnly, updateDivision);
router.delete("/divisions/:id", verifyToken, adminOnly, deleteDivision);

router.get("/services", verifyToken, listServices);
router.get("/services/:id", verifyToken, getService);
router.post("/services", verifyToken, adminOnly, createService);
router.put("/services/:id", verifyToken, adminOnly, updateService);
router.delete("/services/:id", verifyToken, adminOnly, deleteService);

router.get("/works", verifyToken, listWorks);
router.post("/works", verifyToken, upload.array("documents", 20), submitWork);
router.get("/works/:id", verifyToken, getWork);
router.post("/works/:id/status", verifyToken, adminOnly, upload.array("documents", 20), updateWorkStatus);
router.post("/works/:id/documents", verifyToken, upload.array("documents", 20), uploadAdditionalDocuments);

router.get("/dashboard/admin", verifyToken, adminOnly, adminDashboard);
router.get("/dashboard/associate", verifyToken, associateDashboard);

router.get("/notifications", verifyToken, listNotifications);
router.patch("/notifications/:id/read", verifyToken, markNotificationRead);

export default router;
