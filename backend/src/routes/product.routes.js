const express = require("express");
const router = express.Router();

const {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
} = require("../controllers/product.controller");

const { verifyToken, authorizeRoles } = require("../middlewares/auth.middleware");

router.get("/", getAllProducts);
router.get("/:id", getProductById);

router.post("/", verifyToken, authorizeRoles("admin"), createProduct);
router.put("/:id", verifyToken, authorizeRoles("admin"), updateProduct);
router.delete("/:id", verifyToken, authorizeRoles("admin"), deleteProduct);

module.exports = router;