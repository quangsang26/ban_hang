const pool = require("../config/db");
const bcrypt = require("bcrypt");

const getMyProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `
      SELECT id, full_name, email, phone, role, created_at
      FROM users
      WHERE id = $1
      LIMIT 1
      `,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy thông tin người dùng"
      });
    }

    return res.status(200).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Lỗi lấy thông tin tài khoản",
      error: error.message
    });
  }
};

const updateMyProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { full_name, phone } = req.body;

    if (!full_name || String(full_name).trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Họ và tên không được để trống"
      });
    }

    const result = await pool.query(
      `
      UPDATE users
      SET full_name = $1,
          phone = $2
      WHERE id = $3
      RETURNING id, full_name, email, phone, role, created_at
      `,
      [full_name.trim(), phone ? String(phone).trim() : null, userId]
    );

    return res.status(200).json({
      success: true,
      message: "Cập nhật thông tin thành công",
      data: result.rows[0]
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Lỗi cập nhật thông tin tài khoản",
      error: error.message
    });
  }
};

const changeMyPassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { current_password, new_password, confirm_password } = req.body;

    if (!current_password || !new_password || !confirm_password) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập đầy đủ thông tin đổi mật khẩu"
      });
    }

    if (new_password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Mật khẩu mới phải có ít nhất 6 ký tự"
      });
    }

    if (new_password !== confirm_password) {
      return res.status(400).json({
        success: false,
        message: "Mật khẩu xác nhận không khớp"
      });
    }

    const userResult = await pool.query(
      `
      SELECT id, password_hash
      FROM users
      WHERE id = $1
      LIMIT 1
      `,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy tài khoản"
      });
    }

    const user = userResult.rows[0];
    const isMatch = await bcrypt.compare(current_password, user.password_hash);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Mật khẩu hiện tại không đúng"
      });
    }

    const newHash = await bcrypt.hash(new_password, 10);

    await pool.query(
      `
      UPDATE users
      SET password_hash = $1
      WHERE id = $2
      `,
      [newHash, userId]
    );

    return res.status(200).json({
      success: true,
      message: "Đổi mật khẩu thành công"
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Lỗi đổi mật khẩu",
      error: error.message
    });
  }
};

module.exports = {
  getMyProfile,
  updateMyProfile,
  changeMyPassword
};