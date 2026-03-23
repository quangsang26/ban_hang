const express = require("express");
const router = express.Router();

const {
  getMyOrders,
  getMyOrderDetail
} = require("../controllers/user.order.controller");

const { verifyToken } = require("../middlewares/auth.middleware");

router.get("/", verifyToken, getMyOrders);
router.get("/:id", verifyToken, getMyOrderDetail);

module.exports = router;