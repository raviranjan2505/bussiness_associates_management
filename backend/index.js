import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";
import db from "../backend/config/db.js"

// Routes
import authRoutes from "./routes/auth.route.js";
import userRoutes from "./routes/user.route.js";
import businessRoutes from "./routes/business.route.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
db()

const app = express();

app.use(cors({ origin: ["http://localhost:5173"], credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/business", businessRoutes);

// Error middleware
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    statusCode,
    message: err.message || "Internal Server Error",
  });
});

app.listen(3000, () => console.log("Server running on port 3000!"));
