const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { ROLES } = require("../utils/constants");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
};

// 1️⃣ Bootstrap — First Admin Creation Without Token
router.post("/setup-admin", async (req, res) => {
  try {
    const userCount = await User.countDocuments();
    if (userCount > 0) {
      return res.status(403).json({
        message: "Admin already exists. Use admin token to create new admin."
      });
    }

    const { name, email, phone, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: "Email + password required" });

    const user = await User.create({
      name,
      email,
      phone,
      password,
      role: ROLES.ADMIN
    });

    const token = generateToken(user);

    res.status(201).json({
      message: "Admin created successfully",
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 2️⃣ Public Register — Self User Signup ✔
router.post("/register", async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;
    if (!name || !email || !phone || !password)
      return res.status(400).json({ message: "All fields required" });

    const exists = await User.findOne({ $or: [{ email }, { phone }] });
    if (exists) return res.status(400).json({ message: "User already exists" });

    const user = await User.create({
      name,
      email,
      phone,
      password,
      role: ROLES.USER
    });

    res.status(201).json({
      message: "User registered successfully",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
const { sendEmail } = require("../utils/email");

// 📩 Forgot Password - Send email with reset link
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;

  if (!email)
    return res.status(400).json({ message: "Email is required" });

  const user = await User.findOne({ email });
  if (!user)
    return res.status(404).json({ message: "User not found" });

  const token = jwt.sign(
    { id: user._id },
    process.env.JWT_SECRET,
    { expiresIn: "15m" }
  );

  const resetURL = `${process.env.CLIENT_URL}/reset-password/${token}`;

  const html = `
    <h2>Password Reset Request</h2>
    <p>Click the button below to reset your password:</p>
    <a href="${resetURL}"
       style="display:inline-block;padding:10px 20px;
       background:#2563eb;color:white;text-decoration:none;
       border-radius:6px;margin-top:10px;"
    >
      Reset Password
    </a>
    <p>This link expires in 15 minutes.</p>
  `;

  await sendEmail(user.email, "Reset Your Password", html);

  res.json({ message: "Reset link sent successfully to email" });
});


// 🔑 Reset Password using token
router.post("/reset-password/:token", async (req, res) => {
  const { password } = req.body;
  const { token } = req.params;

  if (!password)
    return res.status(400).json({ message: "New password required" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user)
      return res.status(400).json({ message: "Invalid token" });

    user.password = password; // will be hashed by pre-save hook
    await user.save();

    res.json({ message: "Password reset successful" });
  } catch (error) {
    res.status(400).json({ message: "Token expired or invalid" });
  }
});

// 3️⃣ Login
router.post("/login", async (req, res) => {
  try {
    const { emailOrPhone, password } = req.body;

    const user = await User.findOne({
      $or: [{ email: emailOrPhone }, { phone: emailOrPhone }]
    });

    if (!user)
      return res.status(400).json({ message: "Invalid credentials" });

    const isMatch = await user.matchPassword(password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid credentials" });

    if (!user.isActive)
      return res.status(403).json({ message: "User inactive" });

    const token = generateToken(user);

    res.json({ token, user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
