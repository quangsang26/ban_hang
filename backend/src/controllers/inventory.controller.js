const pool = require("../config/db");

const getAllInventory = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        i.id,
        i.product_id,
        p.name AS product_name,
        i.size,
        i.color,
        i.quantity,
        i.sku,
        i.updated_at
      FROM inventory i
      JOIN products p ON i.product_id = p.id
      ORDER BY i.id DESC`
    );

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
};

const getInventoryByProductId = async (req, res) => {
  try {
    const { productId } = req.params;

    const result = await pool.query(
      `SELECT
        id,
        product_id,
        size,
        color,
        quantity,
        sku,
        updated_at
      FROM inventory
      WHERE product_id = $1
      ORDER BY id ASC`,
      [productId]
    );

    return res.status(200).json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Lỗi lấy tồn kho theo sản phẩm",
      error: error.message
    });
  }
};

const createInventory = async (req, res) => {
  try {
    const { product_id, size, color, quantity, sku } = req.body;

    if (!product_id || quantity === undefined || quantity === null) {
      return res.status(400).json({
        success: false,
        message: "product_id và quantity không được để trống"
      });
    }

    const productCheck = await pool.query(
      "SELECT id FROM products WHERE id = $1",
      [product_id]
    );

    if (productCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Sản phẩm không tồn tại"
      });
    }

    const duplicateCheck = await pool.query(
      `SELECT id
       FROM inventory
       WHERE product_id = $1
         AND size IS NOT DISTINCT FROM $2
         AND color IS NOT DISTINCT FROM $3`,
      [product_id, size || null, color || null]
    );

    if (duplicateCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Biến thể size/màu này đã tồn tại trong kho"
      });
    }

    const result = await pool.query(
      `INSERT INTO inventory (product_id, size, color, quantity, sku)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [product_id, size || null, color || null, quantity, sku || null]
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
};

const updateInventory = async (req, res) => {
  try {
    const { id } = req.params;
    const { size, color, quantity, sku } = req.body;

    const check = await pool.query(
      "SELECT id, product_id FROM inventory WHERE id = $1",
      [id]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy dòng tồn kho"
      });
    }

    const current = check.rows[0];

    const duplicateCheck = await pool.query(
      `SELECT id
       FROM inventory
       WHERE product_id = $1
         AND size IS NOT DISTINCT FROM $2
         AND color IS NOT DISTINCT FROM $3
         AND id <> $4`,
      [current.product_id, size || null, color || null, id]
    );

    if (duplicateCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Biến thể size/màu này đã tồn tại trong kho"
      });
    }

    const result = await pool.query(
      `UPDATE inventory
       SET size = $1,
           color = $2,
           quantity = $3,
           sku = $4,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING *`,
      [size || null, color || null, quantity, sku || null, id]
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
};

const deleteInventory = async (req, res) => {
  try {
    const { id } = req.params;

    const check = await pool.query(
      "SELECT id FROM inventory WHERE id = $1",
      [id]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy dòng tồn kho"
      });
    }

    await pool.query("DELETE FROM inventory WHERE id = $1", [id]);

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
};

module.exports = {
  getAllInventory,
  getInventoryByProductId,
  createInventory,
  updateInventory,
  deleteInventory
};