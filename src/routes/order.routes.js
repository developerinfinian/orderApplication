const express = require("express");
const Cart = require("../models/Cart");
const Order = require("../models/Order");
const Product = require("../models/Product");
const { protect } = require("../middleware/auth");

const router = express.Router();

/* ============================================================
   ADMIN / MANAGER: Get ALL Orders
============================================================ */
router.get("/all", protect, async (req, res) => {
  try {
    if (!["ADMIN", "MANAGER"].includes(req.user.role))
      return res.status(403).json({ message: "Access denied" });

    const orders = await Order.find()
      .populate({ path: "user", select: "name email phone role" })
      .populate({
        path: "items.product",
        select: "name retailPrice dealerPrice stockQty",
      })
      .sort({ createdAt: -1 });

    res.json({ success: true, orders });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ============================================================
   ADMIN / MANAGER: Accept Order
============================================================ */
router.put("/accept/:id", protect, async (req, res) => {
  try {
    if (!["ADMIN", "MANAGER"].includes(req.user.role))
      return res.status(403).json({ message: "Access denied" });

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (order.orderStatus !== "PENDING")
      return res
        .status(400)
        .json({ message: "Only pending orders can be accepted" });

    order.orderStatus = "PROCESSING";
    await order.save();

    res.json({ success: true, message: "Order accepted", order });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ============================================================
   ADMIN / MANAGER: Reject Order
============================================================ */
router.put("/reject/:id", protect, async (req, res) => {
  try {
    if (!["ADMIN", "MANAGER"].includes(req.user.role))
      return res.status(403).json({ message: "Access denied" });

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (order.orderStatus === "COMPLETED")
      return res
        .status(400)
        .json({ message: "Cannot reject a completed order" });

    order.orderStatus = "CANCELLED";
    await order.save();

    res.json({ success: true, message: "Order rejected", order });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ============================================================
   UPDATE ORDER
============================================================ */
router.put("/update/:id", protect, async (req, res) => {
  try {
    if (!["ADMIN", "MANAGER", "CUSTOMER", "DEALER"].includes(req.user.role))
      return res.status(403).json({ message: "Access denied" });

    const { items, user } = req.body;

    const order = await Order.findById(req.params.id).populate(
      "items.product user"
    );

    if (!order) return res.status(404).json({ message: "Order not found" });

    if (["COMPLETED", "CANCELLED"].includes(order.orderStatus)) {
      return res.status(400).json({
        message: "Completed or cancelled orders cannot be edited",
      });
    }

    if (order.invoiceNumber) {
      return res.status(400).json({
        message: "Order cannot be edited after invoice is generated",
      });
    }

    if (!["PENDING", "PROCESSING"].includes(order.orderStatus)) {
      return res.status(400).json({
        message: "Only pending or processing orders can be edited",
      });
    }

    for (const old of order.items) {
      const prod = await Product.findById(old.product._id);
      if (prod) {
        prod.stockQty += old.qty;
        await prod.save();
      }
    }

    let total = 0;
    let finalAmount = 0;
    const newItems = [];

    for (const it of items) {
      const prodId = it.product?._id || it.product;
      const prod = await Product.findById(prodId);

      if (!prod)
        return res.status(404).json({ message: "Product not found" });

      const qty = Number(it.qty);
      if (qty <= 0)
        return res.status(400).json({ message: "Invalid quantity" });

      if (prod.stockQty < qty)
        return res.status(400).json({
          message: `Only ${prod.stockQty} available for ${prod.name}`,
        });

      prod.stockQty -= qty;
      await prod.save();

      newItems.push({ product: prod._id, qty });

      const isDealer = order.user.role === "DEALER";
      total += prod.retailPrice * qty;
      finalAmount += (isDealer ? prod.dealerPrice : prod.retailPrice) * qty;
    }

    order.items = newItems;
    order.totalAmount = total;
    order.finalAmount = finalAmount;

    if (user) {
      order.user.name = user.name || order.user.name;
      order.user.phone = user.phone || order.user.phone;
      await order.user.save();
    }

    await order.save();

    res.json({ success: true, message: "Order updated", order });
  } catch (err) {
    console.error("UPDATE ORDER ERROR:", err);
    res.status(500).json({ message: err.message });
  }
});

/* ============================================================
   COMPLETE ORDER → ADD INVOICE NUMBER
============================================================ */
router.put("/invoice/:id", protect, async (req, res) => {
  try {
    if (!["ADMIN", "MANAGER"].includes(req.user.role))
      return res.status(403).json({ message: "Access denied" });

    const { invoiceNumber } = req.body;

    if (!invoiceNumber || invoiceNumber.trim() === "")
      return res.status(400).json({ message: "Invoice number required" });

    const exists = await Order.findOne({ invoiceNumber });
    if (exists && exists._id.toString() !== req.params.id)
      return res
        .status(400)
        .json({ message: "Invoice number already exists" });

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    order.invoiceNumber = invoiceNumber;
    order.orderStatus = "COMPLETED";

    await order.save();

    res.json({ success: true, message: "Order completed", order });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ============================================================
   DELETE ORDER → RESTORE STOCK
============================================================ */
router.delete("/delete/:id", protect, async (req, res) => {
  try {
    if (!["ADMIN", "MANAGER", "USER"].includes(req.user.role))
      return res.status(403).json({ message: "Access denied" });

    const order = await Order.findById(req.params.id).populate(
      "items.product"
    );
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (req.user.role === "USER" && order.orderStatus !== "PENDING")
      return res
        .status(403)
        .json({ message: "Only pending orders can be deleted" });

    for (const item of order.items) {
      const prod = await Product.findById(item.product._id);
      if (prod) {
        prod.stockQty += item.qty;
        await prod.save();
      }
    }

    await order.deleteOne();

    res.json({
      success: true,
      message: "Order deleted & stock restored",
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ============================================================
   USER: Get Own Orders
============================================================ */
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

/* ============================================================
   CREATE ORDER
============================================================ */
router.post("/create", protect, async (req, res) => {
  try {
    const { productId, qty = 1 } = req.body;

    let itemsToOrder = [];

    if (productId) {
      const product = await Product.findById(productId);

      if (!product)
        return res.status(404).json({ message: "Product not found" });

      if (product.stockQty < qty)
        return res
          .status(400)
          .json({ message: `Only ${product.stockQty} available` });

      itemsToOrder.push({ product, qty });
    } else {
      const cart = await Cart.findOne({ user: req.user.id }).populate(
        "items.product"
      );

      if (!cart || cart.items.length === 0)
        return res.status(400).json({ message: "Cart is empty" });

      cart.items = cart.items.filter((i) => i.product !== null);

      if (cart.items.length === 0)
        return res
          .status(400)
          .json({ message: "Cart contains invalid items" });

      itemsToOrder = cart.items;
    }

    let total = 0;
    let finalAmount = 0;
    const dealerPriceUsed = req.user.role === "DEALER";

    for (const i of itemsToOrder) {
      const p = i.product;

      total += p.retailPrice * i.qty;

      if (req.user.role === "DEALER")
        finalAmount += p.dealerPrice * i.qty;
      else finalAmount += p.retailPrice * i.qty;
    }

    const order = await Order.create({
      user: req.user.id,
      items: itemsToOrder.map((i) => ({
        product: i.product._id,
        qty: i.qty,
      })),
      totalAmount: total,
      finalAmount,
      dealerPriceUsed,
      orderStatus: "PENDING",
      paymentStatus: "PENDING",
    });

    for (const i of itemsToOrder) {
      const prod = await Product.findById(i.product._id);
      prod.stockQty -= i.qty;
      await prod.save();
    }

    if (!productId) {
      await Cart.updateOne(
        { user: req.user.id },
        { $set: { items: [] } }
      );
    }

    res.json({ success: true, message: "Order placed", order });
  } catch (err) {
    console.error("CREATE ORDER ERROR:", err);
    res.status(500).json({ message: err.message });
  }
});

/* ============================================================
   MODULE EXPORT
============================================================ */
module.exports = router;
