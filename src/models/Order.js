// models/Order.js
const mongoose = require("mongoose");
const crypto = require("crypto");

const orderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      unique: true,
      default: () => crypto.randomUUID(),
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    items: [
      {
        product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
        qty: Number,
      },
    ],

    totalAmount: {
      type: Number,
      required: true,
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

    // ⭐ NEW FIELD
    invoiceNumber: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
