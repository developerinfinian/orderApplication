// backend/routes/product.routes.js
const express = require("express");
const Product = require("../models/Product");

const router = express.Router();

// 📌 GET ALL ACTIVE PRODUCTS (Public)
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

// 📌 GET PRODUCT BY ID (Public)
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

// 📌 CREATE PRODUCT (Admin Only — Dev Mode)
router.post("/", async (req, res) => {
  try {
    const { name, customerPrice, dealerPrice } = req.body;

    if (!name || !customerPrice || !dealerPrice) {
      return res.status(400).json({
        success: false,
        message: "Name, Customer Price & Dealer Price are required!",
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

// 📌 UPDATE PRODUCT (Admin Only — Dev Mode)
router.patch("/:id", async (req, res) => {
  try {
    const { name, customerPrice, dealerPrice } = req.body;

    if (!name || !customerPrice || !dealerPrice) {
      return res.status(400).json({
        success: false,
        message: "Name, Customer Price & Dealer Price are required!",
      });
    }

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
      message: "Product updated successfully",
      product,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 📌 DELETE PRODUCT (Admin Only — Dev Mode)
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
      message: "Product deleted successfully",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
