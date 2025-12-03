const express = require("express");
const Order = require("../models/Order");
const Product = require("../models/Product");
const { protect } = require("../middleware/auth");

const router = express.Router();

/**
 * ============================
 *   GET DEALER ORDERS
 * ============================
 */
router.get("/", protect, async (req, res) => {
  try {
    const orders = await Order.find({ dealer: req.user.id })
      .populate("items.product")
      .sort({ createdAt: -1 });

    return res.json(orders);
  } catch (err) {
    console.log("Dealer Orders Fetch Error:", err.message);
    return res.status(500).json({ message: "Failed to load dealer orders" });
  }
});

/**
 * ============================
 *   CREATE DEALER ORDER
 * ============================
 */
router.post("/", protect, async (req, res) => {
  try {
    const { products, paymentMethod, upiId } = req.body;

    if (!products || products.length === 0) {
      return res.status(400).json({ message: "No products selected" });
    }

    let items = [];
    let total = 0;

    // Convert frontend productName → productId and calculate price
    for (const item of products) {
      const product = await Product.findOne({ name: item.productName });

      if (!product) {
        return res
          .status(400)
          .json({ message: `Product not found: ${item.productName}` });
      }

      // push converted item
      items.push({
        product: product._id,
        qty: item.quantity,
      });

      // dealer price calculation
      total += product.dealerPrice * item.quantity;
    }

    // create order
    const order = await Order.create({
      dealer: req.user.id,
      items,
      paymentMethod,
      upiId,
      totalAmount: total,
      status: "PLACED",
    });

    return res.json({
      success: true,
      message: "Order placed successfully",
      order,
    });
  } catch (err) {
    console.log("Dealer Order Create Error:", err.message);
    return res.status(500).json({ message: "Failed to place order" });
  }
});

module.exports = router;
