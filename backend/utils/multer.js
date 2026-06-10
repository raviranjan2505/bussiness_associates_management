import multer from "multer";
import fs from "fs";
import path from "path";

// ✅ Resolve absolute path so it works even if server starts from /src
const __dirname = path.resolve();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath = path.join(__dirname, "uploads");

    if (req.originalUrl.includes("/create")) {
      uploadPath = path.join(__dirname, "uploads", "attachments");
    } else if (req.originalUrl.includes("/submit")) {
      uploadPath = path.join(__dirname, "uploads", "userFiles");
    } else if(req.originalUrl.includes("/add-details") || req.originalUrl.includes("/business/works")) {
      uploadPath = path.join(__dirname,"uploads", "documents");
    }
     else {
      uploadPath = path.join(__dirname, "uploads", "images");
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
