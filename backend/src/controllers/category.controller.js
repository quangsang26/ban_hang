const pool = require("../config/db");

const getAllCategories = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, description, created_at FROM categories ORDER BY id ASC"
    );

    return res.status(200).json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Lỗi lấy danh sách danh mục",
      error: error.message
    });
  }
};

const createCategory = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Tên danh mục không được để trống"
      });
    }

    const check = await pool.query(
      "SELECT id FROM categories WHERE name = $1",
      [name]
    );

    if (check.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Danh mục đã tồn tại"
      });
    }

    const result = await pool.query(
      `INSERT INTO categories (name, description)
       VALUES ($1, $2)
       RETURNING id, name, description, created_at`,
      [name, description || null]
    );

    return res.status(201).json({
      success: true,
      message: "Tạo danh mục thành công",
      data: result.rows[0]
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Lỗi tạo danh mục",
      error: error.message
    });
  }
};

module.exports = {
  getAllCategories,
  createCategory
};