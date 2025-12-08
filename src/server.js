require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const connectDB = require("./config/db");
const errorHandler = require("./middleware/errorHandler");
const path = require("path");
const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes");
const productRoutes = require("./routes/product.routes");
const orderRoutes = require("./routes/order.routes");
const cartRoutes = require("./routes/cart.routes");
const dealerorder = require("./routes/dealer.orders");
const billRoutes = require("./routes/bill.routes");
const adminstats=require("./routes/adminDashboard.routes");

const app = express();

// 🔥 REQUIRED FOR RENDER — fixes token missing issue
app.set("trust proxy", 1);

// DB
connectDB();

// CORS FIX (Allow Authorization header)
app.use(
  cors({
    origin: "*",
    methods: "GET,POST,PUT,DELETE",
    allowedHeaders: "Content-Type,Authorization",
  })
);

// Middleware
app.use(express.json({ limit: "10mb" }));
app.use(morgan("dev"));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/bill", billRoutes);
app.use("/api/dashboard", adminstats);
app.use("/uploads", express.static(path.join(__dirname, "src/uploads/products")));

// test route
app.get("/", (req, res) => {
  res.send("Order Management API is running");
});

app.use(errorHandler);

// Start
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
