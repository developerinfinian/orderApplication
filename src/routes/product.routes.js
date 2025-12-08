const express = require("express");
const Product = require("../models/Product");
const upload = require("../middleware/upload");

const router = express.Router();

/* ============================================================
   CREATE PRODUCT WITH IMAGE
============================================================ */
router.post("/", upload.single("image"), async (req, res) => {
  try {
    const { name, price, stockQty } = req.body;

    if (!name || !price) {
      return res
        .status(400)
        .json({ success: false, message: "Name & Price are required!" });
    }

    let imageUrl = "";
    if (req.file) {
      imageUrl = "/uploads/products/" + req.file.filename;
    }

    const product = await Product.create({
      ...req.body,
      imageUrl,
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
