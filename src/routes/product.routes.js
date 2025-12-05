const express = require("express");
const Product = require("../models/Product");

const router = express.Router();

/* ============================================================
   PUBLIC: GET ALL ACTIVE PRODUCTS
============================================================ */
router.get("/", async (req, res) => {
  try {
    const { search } = req.query;
    const query = { status: "ACTIVE" };

    if (search) {
      query.name = { $regex: search, $options: "i" };
    }

    const products = await Product.find(query).sort({ createdAt: -1 });

    return res.json({ success: true, products });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ============================================================
   🚨 LOW STOCK — AUTO FIX alertLevel FOR ALL PRODUCTS
============================================================ */
router.get("/low-stock", async (req, res) => {
  try {
    let allProducts = await Product.find().sort({ stockQty: 1 });

    // 🛠 Auto update missing or incorrect alertLevel
    for (const p of allProducts) {
      let level = "NONE";

      if (p.stockQty < 5) level = "CRITICAL";
      else if (p.stockQty < 20) level = "LOW";
      else if (p.stockQty < 50) level = "WARNING";

      if (p.alertLevel !== level) {
        p.alertLevel = level;
        await p.save();
      }
    }

    // Now filter correctly
    const critical = allProducts.filter((p) => p.alertLevel === "CRITICAL");
    const low = allProducts.filter((p) => p.alertLevel === "LOW");
    const warning = allProducts.filter((p) => p.alertLevel === "WARNING");

    return res.json({
      critical,
      low,
      warning,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ============================================================
   PUBLIC: GET PRODUCT BY ID
============================================================ */
router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.json({ success: true, product });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ============================================================
   CREATE PRODUCT
============================================================ */
router.post("/", async (req, res) => {
  try {
    const { name, price, stockQty } = req.body;

    if (!name || !price) {
      return res
        .status(400)
        .json({ success: false, message: "Name & Price are required!" });
    }

    let alertLevel = "NONE";

    if (stockQty < 5) alertLevel = "CRITICAL";
    else if (stockQty < 20) alertLevel = "LOW";
    else if (stockQty < 50) alertLevel = "WARNING";

    const product = await Product.create({
      ...req.body,
      alertLevel,
    });

    return res.status(201).json({
      success: true,
      message: "Product created successfully",
      product,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ============================================================
   UPDATE PRODUCT — AUTO UPDATE ALERT LEVEL
============================================================ */
router.patch("/:id", async (req, res) => {
  try {
    if (req.body.stockQty !== undefined) {
      const qty = req.body.stockQty;

      req.body.alertLevel =
        qty < 5
          ? "CRITICAL"
          : qty < 20
          ? "LOW"
          : qty < 50
          ? "WARNING"
          : "NONE";
    }

    const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });

    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    return res.json({
      success: true,
      message: "Product updated",
      product,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ============================================================
   DELETE PRODUCT
============================================================ */
router.delete("/:id", async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    return res.json({
      success: true,
      message: "Product deleted",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
