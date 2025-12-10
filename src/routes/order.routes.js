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
      .populate({ path: "user", select: "name email phone role" })
      .populate({ path: "items.product", select: "name price" })
      .sort({ createdAt: -1 });

    res.json({ success: true, orders });
  } catch (err) {
    console.error("GET /all orders error", err);
    res.status(500).json({ message: err.message });
  }
});

/* ====================================================================
   ADMIN / MANAGER: Accept Order
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

    res.json({ success: true, message: "Order accepted", order });
  } catch (err) {
    console.error("ACCEPT order error", err);
    res.status(500).json({ message: err.message });
  }
});

/* ====================================================================
   ADMIN / MANAGER: Reject Order
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
   EDIT ORDER (Restore old stock → apply new stock difference)
==================================================================== */
router.put("/edit/:id", protect, async (req, res) => {
  try {
    const allowed = ["ADMIN", "MANAGER", "USER"];
    if (!allowed.includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const { items } = req.body;

    const order = await Order.findById(req.params.id).populate("items.product");
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (order.orderStatus !== "PENDING") {
      return res.status(400).json({ message: "Only pending orders can be edited" });
    }

    /* ==========================
       STEP 1: RESTORE OLD STOCK
    =========================== */
    for (const old of order.items) {
      const product = await Product.findById(old.product._id);
      if (product) {
        product.stockQty += old.qty;
        await product.save();
      }
    }

    /* ==========================
       STEP 2: APPLY NEW ITEMS
    =========================== */
    let total = 0;
    const newItems = [];

    for (const it of items) {
      const prod = await Product.findById(it.product);
      if (!prod) return res.status(404).json({ message: "Product not found" });

      const qty = Number(it.qty);
      if (qty <= 0) return res.status(400).json({ message: "Invalid quantity" });

      if (prod.stockQty < qty) {
        return res.status(400).json({
          message: `Only ${prod.stockQty} available for ${prod.name}`,
        });
      }

      // Deduct new qty
      prod.stockQty -= qty;
      prod.alertLevel =
        prod.stockQty < 5
          ? "CRITICAL"
          : prod.stockQty < 20
          ? "LOW"
          : prod.stockQty < 50
          ? "WARNING"
          : "NONE";

      await prod.save();

      newItems.push({ product: prod._id, qty });
      total += prod.price * qty;
    }

    /* ==========================
       STEP 3: SAVE ORDER UPDATE
    =========================== */
    order.items = newItems;
    order.totalAmount = total;

    await order.save();

    res.json({
      success: true,
      message: "Order updated & stock adjusted",
      order,
    });
  } catch (err) {
    console.error("EDIT ORDER ERROR:", err);
    res.status(500).json({ message: err.message });
  }
});

/* ====================================================================
   ADD INVOICE → COMPLETE ORDER
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

    const existing = await Order.findOne({ invoiceNumber });
    if (existing && existing._id.toString() !== req.params.id) {
      return res.status(400).json({ message: "Invoice number already exists" });
    }

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    order.invoiceNumber = invoiceNumber;
    order.orderStatus = "COMPLETED";
    await order.save();

    res.json({ success: true, message: "Invoice added", order });
  } catch (err) {
    console.error("INVOICE ERROR:", err);
    res.status(500).json({ message: err.message });
  }
});

/* ====================================================================
   DELETE ORDER → RESTORE STOCK
==================================================================== */
router.delete("/delete/:id", protect, async (req, res) => {
  try {
    const allowed = ["ADMIN", "MANAGER", "USER"];
    if (!allowed.includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const order = await Order.findById(req.params.id).populate("items.product");
    if (!order) return res.status(404).json({ message: "Order not found" });

    // users can delete only pending orders
    if (req.user.role === "USER" && order.orderStatus !== "PENDING") {
      return res.status(403).json({ message: "Only pending orders can be deleted" });
    }

    /* ================================================
       RESTORE STOCK BACK WHEN ORDER IS DELETED
    ================================================= */
    for (const item of order.items) {
      const product = await Product.findById(item.product._id);
      if (product) {
        product.stockQty += item.qty;

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

    await order.deleteOne();

    res.json({ success: true, message: "Order deleted & stock restored." });
  } catch (err) {
    console.error("DELETE ORDER ERROR:", err);
    res.status(500).json({ message: err.message });
  }
});

/* ====================================================================
   USER: Get Own Orders
==================================================================== */
router.get("/", protect, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id })
      .populate("items.product")
      .sort({ createdAt: -1 });

    res.json({ success: true, orders });
  } catch (err) {
    console.error("GET USER ORDERS ERROR:", err);
    res.status(500).json({ message: err.message });
  }
});

/* ====================================================================
   CREATE ORDER FROM CART
==================================================================== */
router.post("/create", protect, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id }).populate("items.product");

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    let total = 0;

    // compute total
    cart.items.forEach((i) => {
      total += i.product.price * i.qty;
    });

    const order = await Order.create({
      user: req.user.id,
      items: cart.items.map((i) => ({ product: i.product._id, qty: i.qty })),
      totalAmount: total,
      orderStatus: "PENDING",
      paymentStatus: "PENDING",
    });

    // reduce stock
    for (const i of cart.items) {
      const product = await Product.findById(i.product._id);
      if (product) {
        product.stockQty -= i.qty;

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

    // clear cart
    cart.items = [];
    await cart.save();

    res.json({ success: true, message: "Order placed", order });
  } catch (err) {
    console.error("CREATE ORDER ERROR:", err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
