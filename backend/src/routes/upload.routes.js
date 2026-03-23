const express = require("express");
const router = express.Router();

const {
  upload,
  uploadProductImage,
  getProductImages,
  setMainProductImage,
  deleteProductImage
} = require("../controllers/upload.controller");

const { verifyToken, authorizeRoles } = require("../middlewares/auth.middleware");

router.get("/products/:productId/images", getProductImages);

router.post(
  "/products/:productId/images",
  verifyToken,
  authorizeRoles("admin"),
  upload.single("image"),
  uploadProductImage
);

router.patch(
  "/images/:imageId/set-main",
  verifyToken,
  authorizeRoles("admin"),
  setMainProductImage
);

router.delete(
  "/images/:imageId",
  verifyToken,
  authorizeRoles("admin"),
  deleteProductImage
);

module.exports = router;