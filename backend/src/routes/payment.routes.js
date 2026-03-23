const express = require("express");
const router = express.Router();

const { verifyToken } = require("../middlewares/auth.middleware");
const {
  createMomoPayment,
  momoIpn,
  momoReturn
} = require("../controllers/payment.controller");

router.post("/momo/create", verifyToken, createMomoPayment);
router.post("/momo/ipn", momoIpn);
router.get("/momo/return", momoReturn);

module.exports = router;