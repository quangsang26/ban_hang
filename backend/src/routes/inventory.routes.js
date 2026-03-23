const express = require("express");
const router = express.Router();

const {
  getAllInventory,
  getInventoryByProductId,
  createInventory,
  updateInventory,
  deleteInventory
} = require("../controllers/inventory.controller");

const { verifyToken, authorizeRoles } = require("../middlewares/auth.middleware");

router.get("/", verifyToken, authorizeRoles("admin"), getAllInventory);
router.get("/product/:productId", verifyToken, authorizeRoles("admin"), getInventoryByProductId);
router.post("/", verifyToken, authorizeRoles("admin"), createInventory);
router.put("/:id", verifyToken, authorizeRoles("admin"), updateInventory);
router.delete("/:id", verifyToken, authorizeRoles("admin"), deleteInventory);

module.exports = router;