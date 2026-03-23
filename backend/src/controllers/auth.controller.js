const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");

const register = async (req, res) => {
  try {
    const { full_name, email, password, phone } = req.body;

    if (!full_name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập đầy đủ họ tên, email và mật khẩu"
      });
    }

    const emailCheck = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [email]
    );

    if (emailCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Email đã tồn tại"
      });
    }

    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    const newUser = await pool.query(
      `INSERT INTO users (full_name, email, password_hash, phone, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, full_name, email, phone, role, created_at`,
      [full_name, email, password_hash, phone || null, "customer"]
    );

    return res.status(201).json({
      success: true,
      message: "Đăng ký tài khoản thành công",
      data: newUser.rows[0]
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Lỗi đăng ký tài khoản",
      error: error.message
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập email và mật khẩu"
      });
    }

    const userResult = await pool.query(
      `SELECT id, full_name, email, password_hash, role, is_active
       FROM users
       WHERE email = $1`,
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Email hoặc mật khẩu không đúng"
      });
    }

    const user = userResult.rows[0];

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: "Tài khoản đã bị khóa"
      });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Email hoặc mật khẩu không đúng"
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(200).json({
      success: true,
      message: "Đăng nhập thành công",
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Lỗi đăng nhập",
      error: error.message
    });
  }
};

module.exports = {
  register,
  login
};