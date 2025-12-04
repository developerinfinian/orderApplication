// routes/order.routes.js
const express = require("express");
const Cart = require("../models/Cart");
const Order = require("../models/Order");
const Product = require("../models/Product");
const { protect } = require("../middleware/auth");

const router = express.Router();

/* ------------------------------------------------------------------
   ADMIN: Get ALL Orders
------------------------------------------------------------------ */
router.get("/all", protect, async (req, res) => {
  try {
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Access denied" });
    }

    const orders = await Order.find()
      .populate({ path: "user", select: "name email phone role" })
      .populate({ path: "items.product", select: "name price" })
      .sort({ createdAt: -1 });

    res.json({ success: true, orders });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ------------------------------------------------------------------
   ADMIN: Update Order Status
------------------------------------------------------------------ */
router.put("/status/:id", protect, async (req, res) => {
  try {
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Access denied" });
    }

    const { status } = req.body;
    if (!status) return res.status(400).json({ message: "Missing status" });

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    order.orderStatus = status;
    await order.save();

    res.json({ success: true, message: "Order status updated", order });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ------------------------------------------------------------------
   ADMIN: Delete Order
------------------------------------------------------------------ */
router.delete("/delete/:id", protect, async (req, res) => {
  try {
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Access denied" });
    }

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    await order.deleteOne();

    res.json({ success: true, message: "Order deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ------------------------------------------------------------------
   USER: Get Own Orders
------------------------------------------------------------------ */
router.get("/", protect, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id })
      .populate({ path: "items.product" })
      .sort({ createdAt: -1 });

    res.json({ success: true, orders });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ------------------------------------------------------------------
   USER: Create Order (From Cart)
------------------------------------------------------------------ */
router.post("/create", protect, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id }).populate(
      "items.product"
    );

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

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

    // Clear Cart
    cart.items = [];
    await cart.save();

    res.json({ success: true, message: "Order placed successfully", order });
  } catch (err) {
    console.log("Order Create Error:", err.message);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
