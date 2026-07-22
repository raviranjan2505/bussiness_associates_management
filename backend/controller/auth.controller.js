import User from "../models/user.model.js"
import bcryptjs from "bcryptjs"
import { errorHandler } from "../utils/error.js"
import jwt from "jsonwebtoken"
import fs from "fs"

export const signup = async (req, res, next) => {
  const { name, email, password, adminJoinCode } = req.body
   const profileImageUrl = req.file ? `${req.protocol}://${req.get("host")}/uploads/images/${req.file.filename}` : "";
 
  if (
    !name ||
    !email ||
    !password ||
    name === "" ||
    email === "" ||
    password === ""
  ) {
    return next(errorHandler(400, "All fields are required"))
  }

  //   Check if user already exists
  const isAlreadyExist = await User.findOne({ email })

  if (isAlreadyExist) {
    return next(errorHandler(400, "User already exists"))
  }

  //   check user role
  let role = "associate"

  if (adminJoinCode && adminJoinCode === process.env.ADMIN_JOIN_CODE) {
    role = "admin"
  } else if (req.body.role === "associate") {
    role = "associate"
  }

  const hashedPassword = bcryptjs.hashSync(password, 10)

  const newUser = new User({
    name,
    email,
    password: hashedPassword,
    profileImageUrl,
    role,
    // Admins are auto-approved; new associates always start as "Pending KYC"
    // until an admin reviews their KYC submission.
    kycStatus: role === "admin" ? "Approved" : "Pending",
  })

  try {
    await newUser.save()
    res.json("Signup successful")
  } catch (error) {
    next(error.message,"error from signup")
  }
}

export const signin = async (req, res, next) => {
  try {
    const { email, password } = req.body

    if (!email || !password || email === "" || password === "") {
      return next(errorHandler(400, "All fields are required"))
    }

    const validUser = await User.findOne({ email })

    if (!validUser) {
      return next(errorHandler(404, "User not found!"))
    }

    // compare password
    const validPassword = bcryptjs.compareSync(password, validUser.password)

    if (!validPassword) {
      return next(errorHandler(400, "Wrong Credentials"))
    }

    const token = jwt.sign(
      { id: validUser._id, role: validUser.role },
      process.env.JWT_SECRET
    )

    const { password: pass, ...rest } = validUser._doc

    res.status(200).cookie("access_token", token, { httpOnly: true }).json(rest)
  } catch (error) {
    next(error)
  }
}

// ✅ Get profile
export const userProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return next(errorHandler(404, "User not found!"));
    }

    const { password, ...rest } = user._doc;
    res.status(200).json(rest);
  } catch (error) {
    next(error);
  }
};

// ✅ Update profile (name, email, password, or profileImageUrl)
export const updateUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return next(errorHandler(404, "User not found!"));

    // Update allowed fields
    if (req.body.name) user.name = req.body.name;
    if (req.body.email) user.email = req.body.email;
    if (req.body.profileImageUrl) user.profileImageUrl = req.body.profileImageUrl;

    if (req.body.password) {
      user.password = bcryptjs.hashSync(req.body.password, 10);
    }

    const updatedUser = await user.save();

    const { password, ...rest } = updatedUser._doc;
    res.status(200).json(rest);
  } catch (error) {
    next(error);
  }
};

// ✅ Upload image and save to user profile
export const uploadImage = async (req, res, next) => {
  try {
    if (!req.file) return next(errorHandler(400, "No file uploaded"));

    // The shared upload middleware also allows PDFs (needed for KYC/work
    // documents on other routes), but a profile photo must be an actual
    // image. Re-check here and clean up the file multer already wrote to
    // disk before rejecting it.
    if (!req.file.mimetype.startsWith("image/")) {
      fs.unlink(req.file.path, () => {});
      return next(errorHandler(400, "Profile photo must be an image (JPG or PNG)."));
    }

    const imageUrl = `${req.protocol}://${req.get("host")}/uploads/images/${req.file.filename}`;

    // ✅ Save uploaded image to user's profile
    const user = await User.findById(req.user.id);
    if (user) {
      user.profileImageUrl = imageUrl;
      await user.save();
    }

    res.status(200).json({ imageUrl });
  } catch (error) {
    next(error);
  }
};

export const signout = async (req, res, next) => {
  try {
    res
      .clearCookie("access_token")
      .status(200)
      .json("User has been loggedout successfully!")
  } catch (error) {
    next(error)
  }
}