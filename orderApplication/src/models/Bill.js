const mongoose = require("mongoose");

const billSchema = new mongoose.Schema(
  {
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
    items: [
      {
        product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
        qty: Number,
        price: Number,
        amount: Number,
      }
    ],
    customerName: String,
    customerPhone: String,
    customerAddress: String,

    subtotal: Number,
    discount: { type: Number, default: 0 },
    shippingCharge: { type: Number, default: 0 },
    totalAmount: Number,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Bill", billSchema);
