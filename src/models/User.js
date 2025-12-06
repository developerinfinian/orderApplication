const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const ALLOWED_ROLES = ["ADMIN", "MANAGER", "DEALER", "CUSTOMER"];

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: false, trim: true },
    email: { type: String, required: false, unique: true, lowercase: true },
    phone: { type: String, required: false, unique: true, trim: true },
    password: { type: String, required: false, minlength: 6 },
    role: { type: String, enum: ALLOWED_ROLES, default: "CUSTOMER" },
    address: { type: String, default: "" },
    gstNumber: { type: String, trim: true, default: "" },
    profileImage: { type: String, default: "" }, // URL path for image
    isActive: { type: Boolean, default: false },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
