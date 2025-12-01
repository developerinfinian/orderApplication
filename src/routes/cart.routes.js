const express = require("express");
const Cart = require("../models/Cart");
const Product = require("../models/Product");
const { protect } = require("../middleware/auth");

const router = express.Router();

// ➤ Get User Cart
router.get("/", protect, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id }).populate(
      "items.product"
    );

    res.json({
      success: true,
      items: cart?.items || [],
      totalItems: cart?.items?.length || 0,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ➤ Add item / Update qty
router.post("/add", protect, async (req, res) => {
  try {
    const { productId, qty } = req.body;

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: "Product not found" });

    if (product.stockQty <= 0)
      return res.status(400).json({ message: "Out of Stock" });

    let cart = await Cart.findOne({ user: req.user.id });

    if (!cart) cart = await Cart.create({ user: req.user.id, items: [] });

    const existingItem = cart.items.find(
      (i) => i.product.toString() === productId
    );

    if (existingItem) existingItem.qty += qty;
    else cart.items.push({ product: productId, qty });

    await cart.save();

    res.json({ success: true, items: cart.items });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ➤ Remove Item
router.delete("/:productId", protect, async (req, res) => {
  try {
    let cart = await Cart.findOne({ user: req.user.id });
    if (!cart) return res.json({ success: true, items: [] });

    cart.items = cart.items.filter(
      (i) => i.product.toString() !== req.params.productId
    );

    await cart.save();
    res.json({ success: true, items: cart.items });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
