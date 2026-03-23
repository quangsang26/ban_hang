const express = require("express");
const router = express.Router();

const {
  getDashboardSummary,
  getRevenueReport,
  getOrderStatusReport,
  getInventoryReport,
  getLowStockReport
} = require("../controllers/report.controller");

const { verifyToken, authorizeRoles } = require("../middlewares/auth.middleware");

router.get("/summary", verifyToken, authorizeRoles("admin"), getDashboardSummary);
router.get("/revenue", verifyToken, authorizeRoles("admin"), getRevenueReport);
router.get("/order-status", verifyToken, authorizeRoles("admin"), getOrderStatusReport);
router.get("/inventory", verifyToken, authorizeRoles("admin"), getInventoryReport);
router.get("/low-stock", verifyToken, authorizeRoles("admin"), getLowStockReport);

module.exports = router;