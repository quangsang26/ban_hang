const pool = require("../config/db");

const getCurrentUser = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT id, full_name, email, phone, avatar_url, role, is_active, created_at
       FROM users
       WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Lấy thông tin người dùng thành công",
      data: result.rows[0]
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Lỗi lấy thông tin người dùng",
      error: error.message
    });
  }
};

const adminOnlyTest = async (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Chào admin, bạn đã truy cập thành công khu vực quản trị",
    user: req.user
  });
};

module.exports = {
  getCurrentUser,
  adminOnlyTest
};