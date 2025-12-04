const express = require("express");
const Order = require("../models/Order");
const User = require("../models/User");
const Product = require("../models/Product");
const { protect } = require("../middleware/auth");

const router = express.Router();

// Admin or Manager only
const isAdminOrManager = (user) => {
  return user.role === "ADMIN" || user.role === "MANAGER";
};
/* -------------------------------------------------------
   CHART DATA: Monthly Revenue, Daily Orders, Product Share
---------------------------------------------------------*/
router.get("/charts", protect, async (req, res) => {
  try {
    if (!isAdminOrManager(req.user)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const currentYear = new Date().getFullYear();

    // Monthly Revenue
    const monthly = await Order.aggregate([
      {
        $group: {
          _id: { month: { $month: "$createdAt" } },
          total: { $sum: "$totalAmount" }
        }
      },
      { $sort: { "_id.month": 1 } }
    ]);

    // Daily Orders (last 7 days)
    const last7Days = new Date();
    last7Days.setDate(last7Days.getDate() - 7);

    const daily = await Order.aggregate([
      { $match: { createdAt: { $gte: last7Days } } },
      {
        $group: {
          _id: { day: { $dayOfMonth: "$createdAt" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id.day": 1 } }
    ]);

    // Product Sales Pie Chart
    const products = await Order.aggregate([
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.product",
          qty: { $sum: "$items.qty" }
        }
      },
      { $sort: { qty: -1 } }
    ]);

    res.json({
      success: true,
      charts: {
        monthlyRevenue: monthly,
        dailyOrders: daily,
        productSales: products
      }
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* -------------------------------------------------------
      ADMIN DASHBOARD STATS API
-------------------------------------------------------- */
router.get("/stats", protect, async (req, res) => {
  try {
    if (!isAdminOrManager(req.user)) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Total Users
    const totalUsers = await User.countDocuments();

    // Total Orders
    const totalOrders = await Order.countDocuments();

    // Today's Revenue
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todaysOrders = await Order.find({
      createdAt: { $gte: today },
    });

    const todaysRevenue = todaysOrders.reduce(
      (sum, o) => sum + o.totalAmount,
      0
    );

    // Monthly Revenue
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const monthOrders = await Order.find({
      createdAt: { $gte: monthStart },
    });

    const monthlyRevenue = monthOrders.reduce(
      (sum, o) => sum + o.totalAmount,
      0
    );

    // Top Products
    const productAggregation = await Order.aggregate([
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
      _id: { $in: productAggregation.map((p) => p._id) },
    });

    // Last 5 Orders
    const recentOrders = await Order.find()
      .populate("user", "name role")
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      success: true,
      stats: {
        totalUsers,
        totalOrders,
        todaysRevenue,
        monthlyRevenue,
        topProducts,
        recentOrders,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
