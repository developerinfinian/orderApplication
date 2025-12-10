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

    totalAmount: { type: Number, required: true },

    /** ⭐ ADD THESE TWO FIELDS */
    marginPercent: { type: Number, default: 0 }, // applied dealer margin 
    finalAmount: { type: Number, default: 0 }, // after margin deduction

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
