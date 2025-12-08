const express = require("express");
const Bill = require("../models/Bill");
const Order = require("../models/Order");
const { protect } = require("../middleware/auth");

const router = express.Router();

/* ----------------------------------------------------
   GET BILL DETAILS FROM ORDER
----------------------------------------------------- */
router.get("/:orderId", protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId)
      .populate("user")
      .populate("items.product");

    if (!order) return res.status(404).json({ message: "Order not found" });

    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ----------------------------------------------------
   SAVE BILL DETAILS (EDITED BY ADMIN)
----------------------------------------------------- */
router.post("/save/:orderId", protect, async (req, res) => {
  try {
    const { items, subtotal, discount, shippingCharge, totalAmount } = req.body;

    const existing = await Bill.findOne({ orderId: req.params.orderId });

    if (existing) {
      existing.items = items;
      existing.subtotal = subtotal;
      existing.discount = discount;
      existing.shippingCharge = shippingCharge;
      existing.totalAmount = totalAmount;
      await existing.save();
      return res.json({ success: true, bill: existing });
    }

    const bill = await Bill.create({
      orderId: req.params.orderId,
      items,
      subtotal,
      discount,
      shippingCharge,
      totalAmount,
    });

    res.json({ success: true, bill });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
