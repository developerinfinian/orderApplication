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
   🚨 LOW STOCK FIRST — MUST COME BEFORE :id ROUTE
============================================================ */
router.get("/low-stock", async (req, res) => {
  try {
    const all = await Product.find({
      alertLevel: { $in: ["CRITICAL", "LOW", "WARNING"] },
    }).sort({ stockQty: 1 });

    const grouped = {
      critical: all.filter((p) => p.alertLevel === "CRITICAL"),
      low: all.filter((p) => p.alertLevel === "LOW"),
      warning: all.filter((p) => p.alertLevel === "WARNING"),
    };

    return res.json(grouped);
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
   CREATE PRODUCT (DEV MODE)
============================================================ */
router.post("/", async (req, res) => {
  try {
    const { name, price, stockQty } = req.body;

    if (!name || !price) {
      return res
        .status(400)
        .json({ success: false, message: "Name & Price are required!" });
    }

    const product = await Product.create({
      ...req.body,
      alertLevel:
        stockQty < 5
          ? "CRITICAL"
          : stockQty < 20
          ? "LOW"
          : stockQty < 50
          ? "WARNING"
          : "NONE",
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
   UPDATE PRODUCT (DEV MODE)
============================================================ */
router.patch("/:id", async (req, res) => {
  try {
    if (req.body.stockQty !== undefined) {
      req.body.alertLevel =
        req.body.stockQty < 5
          ? "CRITICAL"
          : req.body.stockQty < 20
          ? "LOW"
          : req.body.stockQty < 50
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
