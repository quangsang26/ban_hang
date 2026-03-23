const express = require("express");
const router = express.Router();

const { getAllCategories, createCategory } = require("../controllers/category.controller");
const { verifyToken, authorizeRoles } = require("../middlewares/auth.middleware");

router.get("/", getAllCategories);
router.post("/", verifyToken, authorizeRoles("admin"), createCategory);

module.exports = router;