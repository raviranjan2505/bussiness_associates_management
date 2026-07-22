import express from "express"
import {
  signin,
  signout,
  signup,
  updateUserProfile,
  uploadImage,
  userProfile,
} from "../controller/auth.controller.js"
import { verifyToken } from "../utils/verifyUser.js"
import { uploadProfileImage } from "../utils/multer.js"

const router = express.Router()

router.post("/sign-up", uploadProfileImage.single("image"), signup)

router.post("/sign-in", signin)

router.get("/user-profile", verifyToken, userProfile)

router.put("/update-profile", verifyToken, updateUserProfile)

router.post(
  "/upload-image",
  verifyToken,
  uploadProfileImage.single("image"),
  uploadImage
);

router.post("/sign-out", signout)

export default router
