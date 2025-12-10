const mongoose = require("mongoose");
const crypto = require("crypto");

const orderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      unique: true,
      default: () => crypto.randomUUID(),
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

    // Original retail total before checking role
    totalAmount: { type: Number, required: true },

    /** ⭐ NEW LOGIC FIELDS */
    dealerPriceUsed: {
      type: Boolean,
      default: false, // true = dealer price applied
    },

    finalAmount: {
      type: Number,
      default: 0, // final payable amount after applying dealer/retail pricing
    },

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

module.exports = mongoose.model("Order", orderSchema);
