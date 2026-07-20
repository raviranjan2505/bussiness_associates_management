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
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error("Invalid file type"), false);
};

const upload = multer({ storage, fileFilter });

export default upload;