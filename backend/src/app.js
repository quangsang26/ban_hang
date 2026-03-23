const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const path = require("path");
const fs = require("fs");

const app = express();

app.use(helmet({
  crossOriginResourcePolicy: false
}));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

app.get("/", (req, res) => {
  return res.status(200).json({
    success: true,
    message: "STM Fashion Backend API is running"
  });
});

function safeUseRoute(urlPrefix, relativeRoutePath) {
  try {
    const fullPath = path.join(__dirname, "routes", relativeRoutePath);

    if (!fs.existsSync(fullPath)) {
      console.warn(`⚠️ Không tìm thấy route: ${relativeRoutePath}`);
      return;
    }

    const route = require(fullPath);
    app.use(urlPrefix, route);
    console.log(`✅ Loaded route: ${urlPrefix} -> ${relativeRoutePath}`);
  } catch (error) {
    console.error(`❌ Lỗi khi load route ${relativeRoutePath}: ${error.message}`);
  }
}

safeUseRoute("/api/auth", "auth.routes.js");
safeUseRoute("/api/categories", "category.routes.js");
safeUseRoute("/api/products", "product.routes.js");
safeUseRoute("/api/cart", "cart.routes.js");
safeUseRoute("/api/orders", "order.routes.js");
safeUseRoute("/api/payments", "payment.routes.js");

safeUseRoute("/api/admin/orders", "admin.order.routes.js");
safeUseRoute("/api/admin/reports", "admin.report.routes.js");
safeUseRoute("/api/admin/inventory", "admin.inventory.routes.js");
safeUseRoute("/api/admin/uploads", "upload.routes.js");

safeUseRoute("/api/user/orders", "user.order.routes.js");
safeUseRoute("/api/user/profile", "user.profile.routes.js");

app.use((req, res) => {
  return res.status(404).json({
    success: false,
    message: "Route không tồn tại"
  });
});

app.use((error, req, res, next) => {
  console.error("🔥 Internal server error:", error);
  return res.status(500).json({
    success: false,
    message: "Lỗi server nội bộ",
    error: error.message
  });
});

module.exports = app;