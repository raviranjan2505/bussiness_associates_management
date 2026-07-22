import multer from "multer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// ✅ Resolve the actual backend/ folder regardless of where the Node
// process was launched from. `path.resolve()` with no arguments returns
// `process.cwd()` (the launch directory), which only happens to match this
// folder if the process is started from inside backend/ — if it's ever
// started from the repo root or anywhere else (a root-level npm script,
// PM2, nodemon with a different cwd, etc.), uploaded files get written to
// the wrong place while index.js's express.static only serves from the
// real backend/uploads — so the upload "succeeds" but the resulting image
// URL 404s. This mirrors the same fileURLToPath approach index.js uses.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.join(__dirname, "..");

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB — shared across all upload routes

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath = path.join(backendRoot, "uploads");

    if (req.originalUrl.includes("/create")) {
      uploadPath = path.join(backendRoot, "uploads", "attachments");
    } else if (req.originalUrl.includes("/submit") && req.originalUrl.includes("/kyc")) {
      uploadPath = path.join(backendRoot, "uploads", "kyc");
    } else if (req.originalUrl.includes("/submit")) {
      uploadPath = path.join(backendRoot, "uploads", "userFiles");
    } else if(req.originalUrl.includes("/add-details") || req.originalUrl.includes("/business/works")) {
      uploadPath = path.join(backendRoot,"uploads", "documents");
    }
     else {
      uploadPath = path.join(backendRoot, "uploads", "images");
    }

    // ✅ Always ensure folder exists
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },

  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ["image/jpeg", "image/png", "image/jpg", "application/pdf"];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    // Give this error a statusCode so the global error handler in index.js
    // returns a clean 400 instead of a generic 500.
    const error = new Error("Invalid file type. Only JPG, PNG, and PDF files are allowed.");
    error.statusCode = 400;
    cb(error, false);
  }
};

const upload = multer({ storage, fileFilter, limits: { fileSize: MAX_FILE_SIZE } });

// ── Profile image upload (scoped) ───────────────────────────────────────
// Stricter than the shared `upload` above (images only, no PDF, smaller
// size cap) — used only by /auth/upload-image, so KYC docs, attachments,
// and other document uploads elsewhere keep their existing 10MB/PDF-allowed
// behavior untouched.
const PROFILE_IMAGE_MAX_SIZE = 5 * 1024 * 1024; // 5MB
const PROFILE_IMAGE_TYPES = ["image/jpeg", "image/png", "image/jpg", "image/webp"];

const profileImageFileFilter = (req, file, cb) => {
  if (PROFILE_IMAGE_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    const error = new Error("Only JPG, PNG, or WEBP images are allowed for a profile picture.");
    error.statusCode = 400;
    cb(error, false);
  }
};

export const uploadProfileImage = multer({
  storage,
  fileFilter: profileImageFileFilter,
  limits: { fileSize: PROFILE_IMAGE_MAX_SIZE },
});

export default upload;