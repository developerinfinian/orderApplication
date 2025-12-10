// routes/orders.js
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
    console.error("GET /all orders error", err);
    res.status(500).json({ message: err.message });
  }
});

/* ====================================================================
   ADMIN / MANAGER: Accept Order -> move PENDING -> PROCESSING
==================================================================== */
router.put("/accept/:id", protect, async (req, res) => {
  try {
    const allowed = ["ADMIN", "MANAGER"];
    if (!allowed.includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (order.orderStatus !== "PENDING") {
      return res.status(400).json({ message: "Only pending orders can be accepted" });
    }

    order.orderStatus = "PROCESSING";
    await order.save();

    res.json({ success: true, message: "Order accepted and now processing", order });
  } catch (err) {
    console.error("ACCEPT order error", err);
    res.status(500).json({ message: err.message });
  }
});

/* ====================================================================
   ADMIN / MANAGER: Reject Order -> mark CANCELLED
==================================================================== */
router.put("/reject/:id", protect, async (req, res) => {
  try {
    const allowed = ["ADMIN", "MANAGER"];
    if (!allowed.includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (order.orderStatus === "COMPLETED") {
      return res.status(400).json({ message: "Cannot reject a completed order" });
    }

    order.orderStatus = "CANCELLED";
    await order.save();

    res.json({ success: true, message: "Order rejected", order });
  } catch (err) {
    console.error("REJECT order error", err);
    res.status(500).json({ message: err.message });
  }
});

/* ====================================================================
   ADMIN / MANAGER: Update order items + user details (FULL EDIT)
   body: { items: [{ product: productId, qty }], user: { name, phone } }
==================================================================== */
router.put("/update/:id", protect, async (req, res) => {
  try {
    const allowed = ["ADMIN", "MANAGER"];
    if (!allowed.includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const { items, user: userUpdate } = req.body;

    const order = await Order.findById(req.params.id).populate("items.product");
    if (!order) return res.status(404).json({ message: "Order not found" });

    // Validate items array
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Items array is required" });
    }

    // Validate each product exists and compute total
    let total = 0;
    const newItems = [];
    for (const it of items) {
      const prod = await Product.findById(it.product);
      if (!prod) return res.status(404).json({ message: `Product ${it.product} not found` });

      const qty = Number(it.qty) || 1;
      newItems.push({ product: prod._id, qty });
      total += prod.price * qty;
    }

    // Update order items & total
    order.items = newItems;
    order.totalAmount = total;

    // Optionally update user details saved on order (if you store snapshot fields)
    // Here we update the user subdocument if present (assuming you store userRef only)
    if (userUpdate && typeof userUpdate === "object") {
      // If you store user snapshot fields in order, update them here.
      // Otherwise we cannot change the actual User document here (could be done separately)
      order.userSnapshot = {
        name: userUpdate.name || undefined,
        phone: userUpdate.phone || undefined,
      };
    }

    await order.save();

    const populated = await order.populate([
      { path: "user", select: "name email phone role" },
      { path: "items.product", select: "name price" },
    ]);

    res.json({ success: true, message: "Order updated", order: populated });
  } catch (err) {
    console.error("UPDATE order error", err);
    res.status(500).json({ message: err.message });
  }
});

/* ====================================================================
   ADMIN / MANAGER: Add / Update Invoice (unique check) -> set COMPLETED
   body: { invoiceNumber }
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

    // Unique check: any other order with same invoice number?
    const existing = await Order.findOne({ invoiceNumber: invoiceNumber.trim() });
    if (existing && existing._id.toString() !== req.params.id) {
      return res.status(400).json({ message: "Invoice number already exists. Use a different number." });
    }

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    order.invoiceNumber = invoiceNumber.trim();
    order.orderStatus = "COMPLETED";
    await order.save();

    res.json({ success: true, message: "Invoice added and order completed", order });
  } catch (err) {
    console.error("INVOICE order error", err);
    res.status(500).json({ message: err.message });
  }
});

/* ====================================================================
   ADMIN / MANAGER: Delete Order
==================================================================== */
router.delete("/delete/:id", protect, async (req, res) => {
  try {
    const allowed = ["ADMIN", "MANAGER"];
    if (!allowed.includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    await order.deleteOne();

    res.json({ success: true, message: "Order deleted successfully" });
  } catch (err) {
    console.error("DELETE order error", err);
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
    console.error("GET user orders error", err);
    res.status(500).json({ message: err.message });
  }
});

/* ====================================================================
   USER: Create Order from Cart (unchanged)
==================================================================== */
router.post("/create", protect, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id }).populate("items.product");

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
      items: cart.items.map((i) => ({ product: i.product._id, qty: i.qty })),
      totalAmount: total,
      orderStatus: "PENDING",
      paymentStatus: "PENDING",
    });

    // Update stock
    for (const item of cart.items) {
      const product = await Product.findById(item.product._id);
      if (product) {
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
    }

    // Clear cart
    cart.items = [];
    await cart.save();

    res.json({ success: true, message: "Order placed successfully", order });
  } catch (err) {
    console.error("Order Create Error:", err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
