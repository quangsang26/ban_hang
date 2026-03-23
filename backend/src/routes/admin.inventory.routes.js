const express = require("express");
const router = express.Router();

const pool = require("../config/db");
const { verifyToken } = require("../middlewares/auth.middleware");

function adminOnly(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Bạn không có quyền truy cập chức năng admin"
    });
  }
  next();
}

// Lấy toàn bộ tồn kho
router.get("/", verifyToken, adminOnly, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        i.id,
        i.product_id,
        p.name AS product_name,
        i.size,
        i.color,
        i.quantity,
        i.sku
      FROM inventory i
      LEFT JOIN products p ON p.id = i.product_id
      ORDER BY i.id DESC
    `);

    return res.status(200).json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Lỗi lấy danh sách tồn kho",
      error: error.message
    });
  }
});

// Thêm tồn kho mới
router.post("/", verifyToken, adminOnly, async (req, res) => {
  try {
    const { product_id, size, color, quantity, sku } = req.body;

    if (!product_id) {
      return res.status(400).json({
        success: false,
        message: "Thiếu product_id"
      });
    }

    if (quantity === undefined || quantity === null || Number(quantity) < 0) {
      return res.status(400).json({
        success: false,
        message: "Số lượng không hợp lệ"
      });
    }

    const productCheck = await pool.query(
      `SELECT id FROM products WHERE id = $1 LIMIT 1`,
      [product_id]
    );

    if (productCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Sản phẩm không tồn tại"
      });
    }

    const result = await pool.query(
      `
      INSERT INTO inventory (product_id, size, color, quantity, sku)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, product_id, size, color, quantity, sku
      `,
      [
        Number(product_id),
        size ? String(size).trim() : null,
        color ? String(color).trim() : null,
        Number(quantity),
        sku ? String(sku).trim() : null
      ]
    );

    return res.status(201).json({
      success: true,
      message: "Thêm tồn kho thành công",
      data: result.rows[0]
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Lỗi thêm tồn kho",
      error: error.message
    });
  }
});

// Cập nhật tồn kho
router.put("/:id", verifyToken, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const { size, color, quantity, sku } = req.body;

    if (quantity === undefined || quantity === null || Number(quantity) < 0) {
      return res.status(400).json({
        success: false,
        message: "Số lượng không hợp lệ"
      });
    }

    const check = await pool.query(
      `SELECT id FROM inventory WHERE id = $1 LIMIT 1`,
      [id]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy dòng tồn kho"
      });
    }

    const result = await pool.query(
      `
      UPDATE inventory
      SET size = $1,
          color = $2,
          quantity = $3,
          sku = $4
      WHERE id = $5
      RETURNING id, product_id, size, color, quantity, sku
      `,
      [
        size ? String(size).trim() : null,
        color ? String(color).trim() : null,
        Number(quantity),
        sku ? String(sku).trim() : null,
        id
      ]
    );

    return res.status(200).json({
      success: true,
      message: "Cập nhật tồn kho thành công",
      data: result.rows[0]
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Lỗi cập nhật tồn kho",
      error: error.message
    });
  }
});

// Xóa tồn kho
router.delete("/:id", verifyToken, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;

    const check = await pool.query(
      `SELECT id FROM inventory WHERE id = $1 LIMIT 1`,
      [id]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy dòng tồn kho"
      });
    }

    await pool.query(`DELETE FROM inventory WHERE id = $1`, [id]);

    return res.status(200).json({
      success: true,
      message: "Xóa tồn kho thành công"
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Lỗi xóa tồn kho",
      error: error.message
    });
  }
});

module.exports = router;