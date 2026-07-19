import express from "express";
import upload from "../utils/multer.js";
import { adminOnly, verifyToken } from "../utils/verifyUser.js";
import {
  adminDashboard,
  associateDashboard,
  createDivision,
  createClient,
  exportClients,
  getClient,
  updateClient,
  deleteClient,
  createService,
  deleteDivision,
  deleteService,
  getService,
  getWork,
  getWorksSummary,
  listDivisions,
  listClients,
  listNotifications,
  getUnreadNotificationCount,
  listServices,
  listWorks,
  groupWorksByClientForAssociate,
  markNotificationRead,
  deleteNotification,
  submitWork,
  submitMultiWork,
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
router.get("/works/summary", verifyToken, getWorksSummary);
router.get("/works/by-associate/:associateId/grouped", verifyToken, adminOnly, groupWorksByClientForAssociate);
router.post("/works", verifyToken, upload.array("documents", 20), submitWork);
router.post("/works/multi", verifyToken, upload.any(), submitMultiWork);
router.get("/works/:id", verifyToken, getWork);
router.post("/works/:id/status", verifyToken, adminOnly, upload.array("documents", 20), updateWorkStatus);
router.post("/works/:id/documents", verifyToken, upload.array("documents", 20), uploadAdditionalDocuments);

router.get("/clients", verifyToken, listClients);
router.post("/clients", verifyToken, createClient);
router.get("/clients/export", verifyToken, exportClients);
router.get("/clients/:id", verifyToken, getClient);
router.put("/clients/:id", verifyToken, updateClient);
router.delete("/clients/:id", verifyToken, deleteClient);

router.get("/dashboard/admin", verifyToken, adminOnly, adminDashboard);
router.get("/dashboard/associate", verifyToken, associateDashboard);

router.get("/notifications", verifyToken, listNotifications);
router.get("/notifications/unread-count", verifyToken, getUnreadNotificationCount);
router.patch("/notifications/:id/read", verifyToken, markNotificationRead);
router.delete("/notifications/:id", verifyToken, deleteNotification);

export default router;