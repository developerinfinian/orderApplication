const express = require("express");
const User = require("../models/User");
const upload = require("../middleware/upload");

const router = express.Router();

// Get all users
router.get("/", async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Add User
router.post("/", async (req, res) => {
  try {
    const { name, email, phone, password, role, address, gstNumber } = req.body;

    if (!name || !email || !phone || !password)
      return res.status(400).json({ message: "All fields required" });

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: "Email already exists" });

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

// Get single user
router.get("/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update with Image Upload
router.put("/:id", upload.single("profileImage"), async (req, res) => {
  try {
    const { name, email, phone, role, isActive, address, gstNumber } = req.body;

    let updateData = {
      name,
      email,
      phone,
      role,
      isActive,
      address,
      gstNumber,
    };

    // If Image Uploaded
    if (req.file) {
      updateData.profileImage = `/uploads/profile/${req.file.filename}`;
    }

    const updatedUser = await User.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
    }).select("-password");

    if (!updatedUser)
      return res.status(404).json({ message: "User not found" });

    res.json({
      success: true,
      message: "User updated successfully",
      updatedUser,
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await User.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "User not found" });

    res.json({ success: true, message: "User deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Toggle Active/Inactive
router.put("/:id/status", async (req, res) => {
  try {
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
