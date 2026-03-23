const pool = require("../config/db");

const getAllProducts = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        p.id,
        p.name,
        p.description,
        p.price,
        p.discount_percent,
        p.gender,
        p.brand,
        p.material,
        p.is_featured,
        p.is_new,
        p.status,
        p.created_at,
        c.id AS category_id,
        c.name AS category_name,
        (
          SELECT pi.image_url
          FROM product_images pi
          WHERE pi.product_id = p.id
          ORDER BY pi.is_main DESC, pi.id ASC
          LIMIT 1
        ) AS image_url
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      ORDER BY p.id DESC
    `);

    return res.status(200).json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Lỗi lấy danh sách sản phẩm",
      error: error.message
    });
  }
};

const getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    const productResult = await pool.query(
      `SELECT 
        p.id,
        p.name,
        p.description,
        p.price,
        p.discount_percent,
        p.gender,
        p.brand,
        p.material,
        p.is_featured,
        p.is_new,
        p.status,
        p.created_at,
        p.updated_at,
        c.id AS category_id,
        c.name AS category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = $1`,
      [id]
    );

    if (productResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy sản phẩm"
      });
    }

    const imageResult = await pool.query(
      `SELECT id, image_url, is_main
       FROM product_images
       WHERE product_id = $1
       ORDER BY id ASC`,
      [id]
    );

    const inventoryResult = await pool.query(
      `SELECT id, size, color, quantity, sku
       FROM inventory
       WHERE product_id = $1
       ORDER BY id ASC`,
      [id]
    );

    return res.status(200).json({
      success: true,
      data: {
        ...productResult.rows[0],
        images: imageResult.rows,
        inventory: inventoryResult.rows
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Lỗi lấy chi tiết sản phẩm",
      error: error.message
    });
  }
};

const createProduct = async (req, res) => {
  try {
    const {
      category_id,
      name,
      description,
      price,
      discount_percent,
      gender,
      brand,
      material,
      is_featured,
      is_new,
      status
    } = req.body;

    if (!name || !price) {
      return res.status(400).json({
        success: false,
        message: "Tên sản phẩm và giá không được để trống"
      });
    }

    const result = await pool.query(
      `INSERT INTO products (
        category_id, name, description, price, discount_percent,
        gender, brand, material, is_featured, is_new, status
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      RETURNING *`,
      [
        category_id || null,
        name,
        description || null,
        price,
        discount_percent || 0,
        gender || null,
        brand || null,
        material || null,
        is_featured ?? false,
        is_new ?? true,
        status || "active"
      ]
    );

    return res.status(201).json({
      success: true,
      message: "Thêm sản phẩm thành công",
      data: result.rows[0]
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Lỗi thêm sản phẩm",
      error: error.message
    });
  }
};

const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      category_id,
      name,
      description,
      price,
      discount_percent,
      gender,
      brand,
      material,
      is_featured,
      is_new,
      status
    } = req.body;

    const check = await pool.query("SELECT id FROM products WHERE id = $1", [id]);

    if (check.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy sản phẩm"
      });
    }

    const result = await pool.query(
      `UPDATE products
       SET category_id = $1,
           name = $2,
           description = $3,
           price = $4,
           discount_percent = $5,
           gender = $6,
           brand = $7,
           material = $8,
           is_featured = $9,
           is_new = $10,
           status = $11,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $12
       RETURNING *`,
      [
        category_id || null,
        name,
        description || null,
        price,
        discount_percent || 0,
        gender || null,
        brand || null,
        material || null,
        is_featured ?? false,
        is_new ?? true,
        status || "active",
        id
      ]
    );

    return res.status(200).json({
      success: true,
      message: "Cập nhật sản phẩm thành công",
      data: result.rows[0]
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Lỗi cập nhật sản phẩm",
      error: error.message
    });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const check = await pool.query("SELECT id FROM products WHERE id = $1", [id]);

    if (check.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy sản phẩm"
      });
    }

    await pool.query("DELETE FROM products WHERE id = $1", [id]);

    return res.status(200).json({
      success: true,
      message: "Xóa sản phẩm thành công"
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Lỗi xóa sản phẩm",
      error: error.message
    });
  }
};

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
};