import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";
import db from "../backend/config/db.js";

// Routes
import authRoutes from "./routes/auth.route.js";
import userRoutes from "./routes/user.route.js";
import businessRoutes from "./routes/business.route.js";
import quotationRoutes from "./routes/quotation.route.js";
import invoiceRoutes from "./routes/invoice.route.js";
import paymentRoutes from "./routes/payment.route.js";
import payoutRoutes from "./routes/payout.route.js";
import complaintRoutes from "./routes/complaint.route.js";
import announcementRoutes from "./routes/announcement.route.js";
import leadRoutes from "./routes/lead.route.js";
import kycRoutes from "./routes/kyc.route.js";
import paymentSettingsRoutes from "./routes/paymentSettings.route.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
db();

const app = express();

app.use(cors({ origin: ["http://localhost:5173"], credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/business", businessRoutes);
app.use("/api/quotations", quotationRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/leads", leadRoutes);
app.use("/api/payouts", payoutRoutes);
app.use("/api/complaints", complaintRoutes);
app.use("/api/announcements", announcementRoutes);
app.use("/api/kyc", kycRoutes);
app.use("/api/payment-settings", paymentSettingsRoutes);

// Global error handler
app.use((err, req, res, next) => {
  // Multer's own errors (e.g. file too large) come through as a
  // MulterError rather than one of our errorHandler() errors, so they
  // wouldn't otherwise carry a statusCode — give them a clean 400 instead
  // of falling through to a generic 500.
  if (err.name === "MulterError") {
    const message =
      err.code === "LIMIT_FILE_SIZE"
        ? "File is too large. Please choose a smaller file."
        : err.message;
    return res.status(400).json({ success: false, statusCode: 400, message });
  }

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    statusCode,
    message: err.message || "Internal Server Error",
  });
});

app.listen(3000, () => console.log("Server running on port 3000!"));