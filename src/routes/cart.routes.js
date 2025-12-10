const express = require("express");
const Cart = require("../models/Cart");
const Product = require("../models/Product");
const { protect } = require("../middleware/auth");

const router = express.Router();

/* ============================================================
   HELPER: POPULATE CART
============================================================ */
const populateCart = async (userId) => {
  return await Cart.findOne({ user: userId }).populate({
    path: "items",
    populate: {
      path: "product",
      model: "Product",
      select: "name price image stockQty",
    },
  });
};

/* ============================================================
    GET USER CART (FULL FIXED)
============================================================ */
router.get("/", protect, async (req, res) => {
  try {
    const cart = await populateCart(req.user.id);

    if (!cart) {
      return res.json({
        success: true,
        items: [],
        totalItems: 0,
      });
    }

    res.json({
      success: true,
      items: cart.items,
      totalItems: cart.items.length,
    });
  } catch (err) {
    console.log("GET CART ERROR:", err.message);
    res.status(500).json({ message: err.message });
  }
});

/* ============================================================
    ADD TO CART
============================================================ */
router.post("/add", protect, async (req, res) => {
  try {
    const { productId, qty } = req.body;

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: "Product not found" });

    if (product.stockQty <= 0)
      return res.status(400).json({ message: "Out of Stock" });

    let cart = await Cart.findOne({ user: req.user.id });

    if (!cart) {
      cart = await Cart.create({
        user: req.user.id,
        items: [],
      });
    }

    const existing = cart.items.find(
      (i) => i.product.toString() === productId
    );

    if (existing) {
      existing.qty += qty;
    } else {
      cart.items.push({ product: productId, qty });
    }

    await cart.save();

    const populated = await populateCart(req.user.id);

    res.json({
      success: true,
      items: populated.items,
    });
  } catch (err) {
    console.log("ADD CART ERROR:", err.message);
    res.status(500).json({ message: err.message });
  }
});

/* ============================================================
    UPDATE QTY
============================================================ */
router.put("/update", protect, async (req, res) => {
  try {
    const { productId, type } = req.body;

    let cart = await Cart.findOne({ user: req.user.id });
    if (!cart) return res.json({ success: true, items: [] });

    const item = cart.items.find(
      (i) => i.product.toString() === productId
    );

    if (!item)
      return res.status(404).json({ message: "Product not in cart" });

    if (type === "inc") item.qty += 1;
    if (type === "dec") item.qty = Math.max(1, item.qty - 1);

    await cart.save();

    const populated = await populateCart(req.user.id);

    res.json({
      success: true,
      items: populated.items,
    });
  } catch (err) {
    console.log("UPDATE CART ERROR:", err.message);
    res.status(500).json({ message: err.message });
  }
});

/* ============================================================
    REMOVE ITEM
============================================================ */
router.delete("/:productId", protect, async (req, res) => {
  try {
    let cart = await Cart.findOne({ user: req.user.id });

    if (!cart) return res.json({ success: true, items: [] });

    cart.items = cart.items.filter(
      (i) => i.product.toString() !== req.params.productId
    );

    await cart.save();

    const populated = await populateCart(req.user.id);

    res.json({
      success: true,
      items: populated.items,
    });
  } catch (err) {
    console.log("REMOVE ITEM ERROR:", err.message);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
