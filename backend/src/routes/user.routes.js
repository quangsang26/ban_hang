const express = require("express");
const router = express.Router();

const { getCurrentUser, adminOnlyTest } = require("../controllers/user.controller");
const { verifyToken, authorizeRoles } = require("../middlewares/auth.middleware");

router.get("/me", verifyToken, getCurrentUser);
router.get("/admin-only", verifyToken, authorizeRoles("admin"), adminOnlyTest);

module.exports = router;