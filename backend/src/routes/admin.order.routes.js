const express = require("express");
const router = express.Router();

const {
  getAllOrdersAdmin,
  getOrderByIdAdmin,
  updateOrderStatusAdmin,
  updatePaymentStatusAdmin
} = require("../controllers/admin.order.controller");

const { verifyToken, authorizeRoles } = require("../middlewares/auth.middleware");

router.get("/", verifyToken, authorizeRoles("admin"), getAllOrdersAdmin);
router.get("/:id", verifyToken, authorizeRoles("admin"), getOrderByIdAdmin);
router.patch("/:id/order-status", verifyToken, authorizeRoles("admin"), updateOrderStatusAdmin);
router.patch("/:id/payment-status", verifyToken, authorizeRoles("admin"), updatePaymentStatusAdmin);

module.exports = router;