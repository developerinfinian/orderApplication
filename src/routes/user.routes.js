// routes/user.routes.js
const express = require("express");
const User = require("../models/User");
const upload = require("../middleware/upload");
const { protect } = require("../middleware/auth");

const router = express.Router();

/* --------------------------------------------------------
   HELPER: Only ADMIN & MANAGER allowed
---------------------------------------------------------*/
const isAdminOrManager = (user) => {
  return user.role === "ADMIN" || user.role === "MANAGER";
};

/* --------------------------------------------------------
   GET ALL USERS (ADMIN & MANAGER ONLY)
---------------------------------------------------------*/
router.get("/", protect, async (req, res) => {
  try {
    if (!isAdminOrManager(req.user)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const users = await User.find().select("-password");
    res.json({ success: true, users });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* --------------------------------------------------------
   CREATE NEW USER
---------------------------------------------------------*/
router.post("/", protect, async (req, res) => {
  try {
    if (!isAdminOrManager(req.user)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const { name, email, phone, password, role, address, gstNumber } = req.body;

    if (!name || !email || !phone || !password)
      return res.status(400).json({ message: "All fields required" });

    const exists = await User.findOne({ email });
    if (exists)
      return res.status(400).json({ message: "Email already exists" });

    const newUser = await User.create({
      name,
      email,
      phone,
      password,
      role: role || "CUSTOMER",
      address,
      gstNumber
    });

    res.status(201).json({
      success: true,
      message: "User created successfully",
      newUser
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* --------------------------------------------------------
   GET SINGLE USER (Admin/Manager or User Himself)
---------------------------------------------------------*/
router.get("/:id", protect, async (req, res) => {
  try {
    if (!isAdminOrManager(req.user) && req.user._id.toString() !== req.params.id) {
      return res.status(403).json({ message: "Access denied" });
    }

    const user = await User.findById(req.params.id).select("-password");
    if (!user)
      return res.status(404).json({ message: "User not found" });

    res.json({ success: true, user });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* --------------------------------------------------------
   UPDATE USER
---------------------------------------------------------*/
router.put("/:id", protect, upload.single("profileImage"), async (req, res) => {
  try {
    if (!isAdminOrManager(req.user)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const { name, email, phone, role, isActive, address, gstNumber } = req.body;

    let updateData = {
      name,
      email,
      phone,
      role,
      isActive,
      address,
      gstNumber
    };

    if (req.file) {
      updateData.profileImage = `/uploads/profile/${req.file.filename}`;
    }

    const updatedUser = await User.findByIdAndUpdate(req.params.id, updateData, {
      new: true
    }).select("-password");

    if (!updatedUser)
      return res.status(404).json({ message: "User not found" });

    res.json({
      success: true,
      message: "User updated successfully",
      updatedUser
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* --------------------------------------------------------
   DELETE USER (ADMIN & MANAGER)
---------------------------------------------------------*/
router.delete("/:id", protect, async (req, res) => {
  try {
    if (!isAdminOrManager(req.user)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const deleted = await User.findByIdAndDelete(req.params.id);
    if (!deleted)
      return res.status(404).json({ message: "User not found" });

    res.json({ success: true, message: "User deleted successfully" });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* --------------------------------------------------------
   TOGGLE ACTIVE STATUS (ADMIN & MANAGER)
---------------------------------------------------------*/
router.put("/:id/status", protect, async (req, res) => {
  try {
    if (!isAdminOrManager(req.user)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const user = await User.findById(req.params.id);
    if (!user)
      return res.status(404).json({ message: "User not found" });

    user.isActive = !user.isActive;
    await user.save();

    res.json({
      success: true,
      message: "Status updated successfully",
      status: user.isActive
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
