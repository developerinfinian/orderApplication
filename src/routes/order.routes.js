const express = require("express");
const Cart = require("../models/Cart");
const Order = require("../models/Order");
const Product = require("../models/Product");
const { protect } = require("../middleware/auth");

const router = express.Router();

// ➤ ADMIN: Get All Orders
router.get("/all", protect, async (req, res) => {
  try {
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Access denied" });
    }

    const orders = await Order.find()
      .populate("user", "name email phone")
      .populate("items.product")
      .sort({ createdAt: -1 });

    res.json({ success: true, orders });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ➤ ADMIN: Update Order Status
router.put("/status/:id", protect, async (req, res) => {
  try {
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Access denied" });
    }

    const { status } = req.body;

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    order.orderStatus = status;
    await order.save();

    res.json({ success: true, message: "Order status updated", order });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ➤ User Orders
router.get("/", protect, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id })
      .populate("items.product")
      .sort({ createdAt: -1 });

    res.json({ success: true, orders });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ➤ Place Order
router.post("/create", protect, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id }).populate(
      "items.product"
    );

    if (!cart || cart.items.length === 0)
      return res.status(400).json({ message: "Cart is empty" });

    let total = 0;
    cart.items.forEach((item) => {
      total += item.product.price * item.qty;
    });

    const order = await Order.create({
      user: req.user.id,
      items: cart.items.map((i) => ({
        product: i.product._id,
        qty: i.qty,
      })),
      totalAmount: total,
      orderStatus: "PLACED",
      paymentStatus: "PENDING",
    });

    // Update stock
    for (const item of cart.items) {
      const product = await Product.findById(item.product._id);
      product.stockQty -= item.qty;

      product.alertLevel =
        product.stockQty < 5
          ? "CRITICAL"
          : product.stockQty < 20
          ? "LOW"
          : product.stockQty < 50
          ? "WARNING"
          : "NONE";

      await product.save();
    }

    // Clear cart
    cart.items = [];
    await cart.save();

    res.json({
      success: true,
      message: "Order placed successfully",
      order,
    });
  } catch (err) {
    console.log("Order Create Error:", err.message);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
