// routes/admindashboard.routes.js
const express = require("express");
const Order = require("../models/Order");
const User = require("../models/User");
const Product = require("../models/Product");
const { protect } = require("../middleware/auth");

const router = express.Router();

// CHECK ADMIN / MANAGER ROLE
const isAdminOrManager = (user) =>
  user.role === "ADMIN" || user.role === "MANAGER";

/* =====================================================
    ⭐ GET DASHBOARD CHARTS (Monthly, Daily, Product Pie)
===================================================== */
router.get("/charts", protect, async (req, res) => {
  try {
    if (!isAdminOrManager(req.user)) {
      return res.status(403).json({ message: "Access denied" });
    }

    // MONTHLY REVENUE
    const monthly = await Order.aggregate([
      {
        $group: {
          _id: {
            month: { $month: "$createdAt" },
            year: { $year: "$createdAt" },
          },
          total: { $sum: "$totalAmount" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    // LAST 7 DAYS ORDERS
    const last7 = new Date();
    last7.setDate(last7.getDate() - 7);

    const daily = await Order.aggregate([
      { $match: { createdAt: { $gte: last7 } } },
      {
        $group: {
          _id: { day: { $dayOfMonth: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.day": 1 } },
    ]);

    // PRODUCT SALES
    const products = await Order.aggregate([
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.product",
          qty: { $sum: "$items.qty" },
        },
      },
      { $sort: { qty: -1 } },
    ]);

    res.json({
      success: true,
      charts: {
        monthlyRevenue: monthly || [],
        dailyOrders: daily || [],
        productSales: products || [],
      },
    });
  } catch (err) {
    console.log("CHART ERROR:", err.message);
    res.status(500).json({ message: "Failed to load charts" });
  }
});

/* =====================================================
    ⭐ ADMIN DASHBOARD STATS (Cards + Hot Products + Stock)
===================================================== */
router.get("/stats", protect, async (req, res) => {
  try {
    if (!isAdminOrManager(req.user)) {
      return res.status(403).json({ message: "Access denied" });
    }

    // TOTAL USERS
    const totalUsers = await User.countDocuments();

    // TOTAL ORDERS
    const totalOrders = await Order.countDocuments();

    // TODAY REVENUE
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todaysOrders = await Order.find({ createdAt: { $gte: today } });

    const todaysRevenue = todaysOrders.reduce(
      (sum, o) => sum + (o.totalAmount || 0),
      0
    );

    // MONTHLY REVENUE
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const monthOrders = await Order.find({ createdAt: { $gte: monthStart } });

    const monthlyRevenue = monthOrders.reduce(
      (sum, o) => sum + (o.totalAmount || 0),
      0
    );

    // TOP PRODUCTS (PRODUCT NAME + QTY)
    const productAgg = await Order.aggregate([
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.product",
          totalQty: { $sum: "$items.qty" },
        },
      },
      { $sort: { totalQty: -1 } },
      { $limit: 5 },
    ]);

    const topProducts = await Product.find({
      _id: { $in: productAgg.map((p) => p._id) },
    });

    // MERGE PRODUCT NAME + QTY
    const hotProducts = topProducts.map((p) => ({
      name: p.name,
      stock: p.stock,
      totalQty:
        productAgg.find((x) => x._id.toString() === p._id.toString())?.totalQty ||
        0,
    }));

    // LAST 5 ORDERS
    const recentOrders = await Order.find()
      .populate("user", "name email role")
      .sort({ createdAt: -1 })
      .limit(5);

    // LOW STOCK PRODUCTS
    const lowStock = await Product.find({ stock: { $lte: 10 } })
      .sort({ stock: 1 })
      .limit(10);

    res.json({
      success: true,
      stats: {
        totalUsers,
        totalOrders,
        todaysRevenue,
        monthlyRevenue,
        topProducts: hotProducts,
        lowStock,
        recentOrders,
      },
    });
  } catch (err) {
    console.log("STATS ERROR:", err.message);
    res.status(500).json({ message: "Failed to load stats" });
  }
});

module.exports = router;
