const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      unique: true,
    },

    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    userSnapshot: {
      name: String,
      phone: String,
    },

    items: [
      {
        product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
        qty: Number,
      },
    ],

    totalAmount: { type: Number, required: true },

    dealerPriceUsed: { type: Boolean, default: false },

    finalAmount: { type: Number, default: 0 },

    paymentStatus: {
      type: String,
      enum: ["PENDING", "PAID"],
      default: "PENDING",
    },

    orderStatus: {
      type: String,
      enum: ["PENDING", "PROCESSING", "COMPLETED", "CANCELLED"],
      default: "PENDING",
    },

    invoiceNumber: { type: String, default: "" },
  },
  { timestamps: true }
);

/* ============================================================
   AUTO-GENERATE UNIQUE ORDER ID (CO1, CO2, DO1, DO2)
============================================================ */
orderSchema.pre("save", async function (next) {
  if (this.orderId) return next(); // Already generated

  try {
    // Load user role
    const User = mongoose.model("User");
    const user = await User.findById(this.user);

    if (!user) return next(new Error("User not found while creating order ID"));

    const prefix = user.role === "DEALER" ? "DO" : "CO";

    // Count existing orders of same type
    const count = await mongoose.model("Order").countDocuments({
      orderId: { $regex: `^${prefix}` },
    });

    this.orderId = `${prefix}${count + 1}`;

    next();
  } catch (err) {
    next(err);
  }
});

module.exports = mongoose.model("Order", orderSchema);
