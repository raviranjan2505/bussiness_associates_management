import express from "express"
import { adminOnly, verifyToken } from "../utils/verifyUser.js"
import { exportUsers, getUserById, getUsers } from "../controller/user.controller.js"

const router = express.Router()

// User mangement route
router.get("/get-users", verifyToken, adminOnly, getUsers)
router.get("/export", verifyToken, adminOnly, exportUsers)

router.get("/:id", verifyToken, adminOnly, getUserById)

export default router
