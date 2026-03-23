const express = require("express");
const router = express.Router();

const {
  getMyCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart
} = require("../controllers/cart.controller");

const { verifyToken } = require("../middlewares/auth.middleware");

router.get("/", verifyToken, getMyCart);
router.post("/", verifyToken, addToCart);
router.put("/items/:itemId", verifyToken, updateCartItem);
router.delete("/items/:itemId", verifyToken, removeCartItem);
router.delete("/clear", verifyToken, clearCart);

module.exports = router;