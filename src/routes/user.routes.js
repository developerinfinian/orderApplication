const express = require("express");
const User = require("../models/User");
const { protect } = require("../middleware/auth");

const router = express.Router();

/* ====================================================================
   ROLE VALIDATION HELPER
==================================================================== */
const allowRoles = (userRole, roles) => roles.includes(userRole);

/* ====================================================================
   GET ALL USERS (ADMIN + MANAGER)
==================================================================== */
router.get("/", protect, async (req, res) => {
  try {
    if (!allowRoles(req.user.role, ["ADMIN", "MANAGER"])) {
      return res.status(403).json({ message: "Access denied" });
    }

    const users = await User.find().sort({ createdAt: -1 });
    res.json({ success: true, users });
  } catch (err) {
    console.error("FETCH USERS ERROR:", err);
    res.status(500).json({ message: err.message });
  }
});

/* ====================================================================
   ADD USER (ADMIN ONLY)
==================================================================== */
router.post("/", protect, async (req, res) => {
  try {
    if (!allowRoles(req.user.role, ["ADMIN"])) {
      return res.status(403).json({ message: "Only admin can add users" });
    }

    const { name, email, phone, password, role, address, gstNumber, profileImage } = req.body;

    // Duplicate check
    const exists = await User.findOne({ $or: [{ email }, { phone }] });
    if (exists) {
      return res.status(400).json({ message: "Email or Phone already exists" });
    }

    const user = await User.create({
      name,
      email,
      phone,
      password,
      role,
      address,
      gstNumber,
      profileImage,
    });

    res.json({ success: true, message: "User created", user });
  } catch (err) {
    console.error("ADD USER ERROR:", err);
    res.status(500).json({ message: err.message });
  }
});

/* ====================================================================
   GET SPECIFIC USER (ADMIN + MANAGER)
==================================================================== */
router.get("/:id", protect, async (req, res) => {
  try {
    if (!allowRoles(req.user.role, ["ADMIN", "MANAGER"])) {
      return res.status(403).json({ message: "Access denied" });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ success: true, user });
  } catch (err) {
    console.error("FETCH USER ERROR:", err);
    res.status(500).json({ message: err.message });
  }
});

/* ====================================================================
   UPDATE USER (ADMIN ONLY)
==================================================================== */
router.put("/:id", protect, async (req, res) => {
  try {
    if (!allowRoles(req.user.role, ["ADMIN"])) {
      return res.status(403).json({ message: "Only admin can edit users" });
    }

    const { name, email, phone, role, address, gstNumber, profileImage } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Check duplicates except itself
    const duplicate = await User.findOne({
      $or: [{ email }, { phone }],
      _id: { $ne: user._id },
    });

    if (duplicate) {
      return res.status(400).json({ message: "Email or Phone already in use" });
    }

    user.name = name ?? user.name;
    user.email = email ?? user.email;
    user.phone = phone ?? user.phone;
    user.role = role ?? user.role;
    user.address = address ?? user.address;
    user.gstNumber = gstNumber ?? user.gstNumber;
    user.profileImage = profileImage ?? user.profileImage;

    await user.save();

    res.json({ success: true, message: "User updated", user });
  } catch (err) {
    console.error("UPDATE USER ERROR:", err);
    res.status(500).json({ message: err.message });
  }
});

/* ====================================================================
   TOGGLE ACTIVE/INACTIVE (ADMIN + MANAGER)
==================================================================== */
router.put("/:id/status", protect, async (req, res) => {
  try {
    if (!allowRoles(req.user.role, ["ADMIN", "MANAGER"])) {
      return res.status(403).json({ message: "Access denied" });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.isActive = !user.isActive;
    await user.save();

    res.json({ success: true, message: "User status updated", isActive: user.isActive });
  } catch (err) {
    console.error("STATUS ERROR:", err);
    res.status(500).json({ message: err.message });
  }
});

/* ====================================================================
   DELETE USER (ADMIN ONLY)
==================================================================== */
router.delete("/:id", protect, async (req, res) => {
  try {
    if (!allowRoles(req.user.role, ["ADMIN"])) {
      return res.status(403).json({ message: "Only admin can delete users" });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    await user.deleteOne();

    res.json({ success: true, message: "User deleted successfully" });
  } catch (err) {
    console.error("DELETE USER ERROR:", err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
