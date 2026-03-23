const express = require("express");
const router = express.Router();

const {
  getMyProfile,
  updateMyProfile,
  changeMyPassword
} = require("../controllers/user.profile.controller");

const { verifyToken } = require("../middlewares/auth.middleware");

router.get("/me", verifyToken, getMyProfile);
router.put("/me", verifyToken, updateMyProfile);
router.put("/change-password", verifyToken, changeMyPassword);

module.exports = router;