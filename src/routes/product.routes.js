const express = require("express");
const Product = require("../models/Product");

const router = express.Router();

// 📌 GET ALL ACTIVE PRODUCTS (public)
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

// 📌 LOW STOCK PRODUCTS
router.get("/low-stock", async (req, res) => {
  try {
    const products = await Product.find({
      alertLevel: { $in: ["CRITICAL", "LOW", "WARNING"] }
    });

    res.json({ success: true, products });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 📌 GET PRODUCT BY ID (public)
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

// 📌 CREATE PRODUCT (DEV MODE)
router.post("/", async (req, res) => {
  try {
    const { name, customerPrice, dealerPrice } = req.body;

    if (!name || !customerPrice || !dealerPrice) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Name, Customer Price & Dealer Price are required!"
        });
    }

    const product = await Product.create(req.body);

    return res.status(201).json({
      success: true,
      message: "Product created successfully",
      product,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 📌 UPDATE PRODUCT (DEV MODE)
router.patch("/:id", async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

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

// 📌 DELETE PRODUCT
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
