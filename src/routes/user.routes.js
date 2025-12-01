const express = require("express");
const User = require("../models/User");

const router = express.Router();

// 🚫 No protect middleware
// 🚫 No authorize middleware

// ➤ Get all users
router.get("/", async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ➤ Add a new user
router.post("/", async (req, res) => {
  try {
    const { name, email, phone, password, role } = req.body;

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
      role: role || "CUSTOMER"
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

// ➤ Get single user by ID
router.get("/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user)
      return res.status(404).json({ message: "User not found" });

    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ➤ Update User
router.put("/:id", async (req, res) => {
  try {
    const { name, email, phone, role, isActive } = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { name, email, phone, role, isActive },
      { new: true }
    ).select("-password");

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

// ➤ Delete User
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await User.findByIdAndDelete(req.params.id);
    if (!deleted)
      return res.status(404).json({ message: "User not found" });

    res.json({
      success: true,
      message: "User deleted successfully"
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ➤ Toggle Active / Inactive
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
