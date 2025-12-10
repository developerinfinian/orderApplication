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

    // optional snapshot of user (if you want to store edited name/phone)
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

    invoiceNumber: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
