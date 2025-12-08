const express = require("express");
const Product = require("../models/Product");
const upload = require("../middleware/upload"); // Multer middleware

const router = express.Router();

/* ============================================================
   GET ALL ACTIVE PRODUCTS
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
   GET PRODUCT BY ID
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
   CREATE PRODUCT WITH IMAGE (ADD)
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

/* ============================================================
   UPDATE PRODUCT (EDIT) WITH OPTIONAL NEW IMAGE
============================================================ */
router.put("/:id", upload.single("image"), async (req, res) => {
  try {
    let updateData = { ...req.body };

    // If new image uploaded, override imageUrl
    if (req.file) {
      updateData.imageUrl = "/uploads/products/" + req.file.filename;
    }

    // Convert numbers properly
    if (updateData.price) updateData.price = Number(updateData.price);
    if (updateData.stockQty) updateData.stockQty = Number(updateData.stockQty);

    const updated = await Product.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
    });

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.json({
      success: true,
      message: "Product updated successfully",
      product: updated,
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
    const deleted = await Product.findByIdAndDelete(req.params.id);

    if (!deleted) {
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
