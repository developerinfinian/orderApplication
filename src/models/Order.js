const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    items: [
      {
        product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
        qty: Number,
      },
    ],

    totalAmount: Number,

    paymentStatus: { 
      type: String, 
      enum: ["PENDING", "PAID"], 
      default: "PENDING" 
    },

    orderStatus: { 
      type: String,
      enum: ["PLACED", "PROCESSING", "DELIVERED", "CANCELLED"],
      default: "PLACED",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
