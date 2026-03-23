const express = require("express");
const router = express.Router();

const {
  createOrder,
  getMyOrders,
  getMyOrderById
} = require("../controllers/order.controller");

const { verifyToken } = require("../middlewares/auth.middleware");

router.post("/", verifyToken, createOrder);
router.get("/", verifyToken, getMyOrders);
router.get("/:id", verifyToken, getMyOrderById);

module.exports = router;