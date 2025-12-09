const express = require("express");
const Cart = require("../models/Cart");
const Order = require("../models/Order");
const Product = require("../models/Product");
const { protect } = require("../middleware/auth");

const router = express.Router();

/* ====================================================================
   ADMIN / MANAGER: Get ALL Orders
==================================================================== */
router.get("/all", protect, async (req, res) => {
  try {
    const allowed = ["ADMIN", "MANAGER"];
    if (!allowed.includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const orders = await Order.find()
      .populate({
        path: "user",
        select: "name email phone role",
      })
      .populate({
        path: "items.product",
        select: "name price",
      })
      .sort({ createdAt: -1 });

    res.json({ success: true, orders });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ====================================================================
   ADMIN / MANAGER: Update ORDER STATUS
==================================================================== */
router.put("/status/:id", protect, async (req, res) => {
  try {
    const allowed = ["ADMIN", "MANAGER"];
    if (!allowed.includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const { status } = req.body;
    if (!status)
      return res.status(400).json({ message: "Missing 'status' field" });

    const order = await Order.findById(req.params.id);
    if (!order)
      return res.status(404).json({ message: "Order not found" });

    order.orderStatus = status;
    await order.save();

    res.json({
      success: true,
      message: "Order status updated successfully",
      order,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ====================================================================
   ⭐ NEW: ADMIN / MANAGER — Add Invoice Number
   → Automatically marks order as COMPLETED
==================================================================== */
router.put("/invoice/:id", protect, async (req, res) => {
  try {
    const allowed = ["ADMIN", "MANAGER"];
    if (!allowed.includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const { invoiceNumber } = req.body;

    if (!invoiceNumber || invoiceNumber.trim() === "") {
      return res.status(400).json({ message: "Invoice number required" });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Save invoice
    order.invoiceNumber = invoiceNumber;
    order.orderStatus = "COMPLETED"; // Auto-complete
    await order.save();

    res.json({
      success: true,
      message: "Invoice added & order marked as completed",
      order,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ====================================================================
   ADMIN / MANAGER: DELETE Order
==================================================================== */
router.delete("/delete/:id", protect, async (req, res) => {
  try {
    const allowed = ["ADMIN", "MANAGER"];
    if (!allowed.includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const order = await Order.findById(req.params.id);
    if (!order)
      return res.status(404).json({ message: "Order not found" });

    await order.deleteOne();

    res.json({
      success: true,
      message: "Order deleted successfully",
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ====================================================================
   USER: Get their own orders
==================================================================== */
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

/* ====================================================================
   USER: Create Order from Cart
==================================================================== */
router.post("/create", protect, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id }).populate(
      "items.product"
    );

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    // Calculate total
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
      orderStatus: "PENDING",
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
/* ============================================================
   USER: Create Order for Single Cart Item
============================================================ */
router.post("/create-single", protect, async (req, res) => {
  try {
    const { productId } = req.body;

    const cart = await Cart.findOne({ user: req.user.id }).populate(
      "items.product"
    );

    if (!cart) return res.status(400).json({ message: "Cart not found" });

    const item = cart.items.find(
      (i) => i.product._id.toString() === productId
    );

    if (!item)
      return res.status(404).json({ message: "Item not found in cart" });

    const total = item.product.price * item.qty;

    const order = await Order.create({
      user: req.user.id,
      items: [
        {
          product: item.product._id,
          qty: item.qty,
        },
      ],
      totalAmount: total,
      orderStatus: "PENDING",
      paymentStatus: "PENDING",
    });

    // Reduce stock
    const product = await Product.findById(item.product._id);
    product.stockQty -= item.qty;
    await product.save();

    // Remove item from cart
    cart.items = cart.items.filter(
      (i) => i.product._id.toString() !== productId
    );
    await cart.save();

    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
