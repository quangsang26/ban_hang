const pool = require("../config/db");

const getOrCreateCart = async (userId) => {
  let cartResult = await pool.query(
    "SELECT id FROM carts WHERE user_id = $1",
    [userId]
  );

  if (cartResult.rows.length === 0) {
    cartResult = await pool.query(
      `INSERT INTO carts (user_id)
       VALUES ($1)
       RETURNING id`,
      [userId]
    );
  }

  return cartResult.rows[0].id;
};

const getMyCart = async (req, res) => {
  try {
    const userId = req.user.id;

    const cartResult = await pool.query(
      "SELECT id FROM carts WHERE user_id = $1",
      [userId]
    );

    if (cartResult.rows.length === 0) {
      return res.status(200).json({
        success: true,
        message: "Giỏ hàng đang trống",
        data: {
          cart_id: null,
          items: [],
          total_quantity: 0,
          total_amount: 0
        }
      });
    }

    const cartId = cartResult.rows[0].id;

    const itemsResult = await pool.query(
      `SELECT
        ci.id,
        ci.product_id,
        ci.quantity,
        ci.size,
        ci.color,
        p.name,
        p.price,
        p.discount_percent,
        p.status,
        (
          SELECT pi.image_url
          FROM product_images pi
          WHERE pi.product_id = p.id AND pi.is_main = true
          ORDER BY pi.id ASC
          LIMIT 1
        ) AS image_url
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.id
      WHERE ci.cart_id = $1
      ORDER BY ci.id ASC`,
      [cartId]
    );

    const items = itemsResult.rows.map((item) => {
      const price = Number(item.price);
      const discountPercent = Number(item.discount_percent || 0);
      const finalPrice = price - (price * discountPercent) / 100;
      const subtotal = finalPrice * Number(item.quantity);

      return {
        ...item,
        price,
        discount_percent: discountPercent,
        final_price: finalPrice,
        subtotal
      };
    });

    const totalQuantity = items.reduce((sum, item) => sum + Number(item.quantity), 0);
    const totalAmount = items.reduce((sum, item) => sum + Number(item.subtotal), 0);

    return res.status(200).json({
      success: true,
      data: {
        cart_id: cartId,
        items,
        total_quantity: totalQuantity,
        total_amount: totalAmount
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Lỗi lấy giỏ hàng",
      error: error.message
    });
  }
};

const addToCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const { product_id, quantity, size, color } = req.body;

    if (!product_id || !quantity) {
      return res.status(400).json({
        success: false,
        message: "product_id và quantity không được để trống"
      });
    }

    if (Number(quantity) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Số lượng phải lớn hơn 0"
      });
    }

    const productResult = await pool.query(
      `SELECT id, name, price, discount_percent, status
       FROM products
       WHERE id = $1`,
      [product_id]
    );

    if (productResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Sản phẩm không tồn tại"
      });
    }

    const product = productResult.rows[0];

    if (product.status !== "active") {
      return res.status(400).json({
        success: false,
        message: "Sản phẩm hiện không khả dụng"
      });
    }

    const cartId = await getOrCreateCart(userId);

    const existingItemResult = await pool.query(
      `SELECT id, quantity
       FROM cart_items
       WHERE cart_id = $1
         AND product_id = $2
         AND size IS NOT DISTINCT FROM $3
         AND color IS NOT DISTINCT FROM $4`,
      [cartId, product_id, size || null, color || null]
    );

    let result;

    if (existingItemResult.rows.length > 0) {
      const existingItem = existingItemResult.rows[0];
      const newQuantity = Number(existingItem.quantity) + Number(quantity);

      result = await pool.query(
        `UPDATE cart_items
         SET quantity = $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2
         RETURNING *`,
        [newQuantity, existingItem.id]
      );
    } else {
      result = await pool.query(
        `INSERT INTO cart_items (cart_id, product_id, quantity, size, color)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [cartId, product_id, quantity, size || null, color || null]
      );
    }

    await pool.query(
      `UPDATE carts
       SET updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [cartId]
    );

    return res.status(201).json({
      success: true,
      message: "Thêm vào giỏ hàng thành công",
      data: result.rows[0]
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Lỗi thêm vào giỏ hàng",
      error: error.message
    });
  }
};

const updateCartItem = async (req, res) => {
  try {
    const userId = req.user.id;
    const { itemId } = req.params;
    const { quantity } = req.body;

    if (!quantity || Number(quantity) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Số lượng phải lớn hơn 0"
      });
    }

    const cartResult = await pool.query(
      "SELECT id FROM carts WHERE user_id = $1",
      [userId]
    );

    if (cartResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy giỏ hàng"
      });
    }

    const cartId = cartResult.rows[0].id;

    const checkItem = await pool.query(
      `SELECT id
       FROM cart_items
       WHERE id = $1 AND cart_id = $2`,
      [itemId, cartId]
    );

    if (checkItem.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy sản phẩm trong giỏ hàng"
      });
    }

    const result = await pool.query(
      `UPDATE cart_items
       SET quantity = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [quantity, itemId]
    );

    await pool.query(
      `UPDATE carts
       SET updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [cartId]
    );

    return res.status(200).json({
      success: true,
      message: "Cập nhật giỏ hàng thành công",
      data: result.rows[0]
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Lỗi cập nhật giỏ hàng",
      error: error.message
    });
  }
};

const removeCartItem = async (req, res) => {
  try {
    const userId = req.user.id;
    const { itemId } = req.params;

    const cartResult = await pool.query(
      "SELECT id FROM carts WHERE user_id = $1",
      [userId]
    );

    if (cartResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy giỏ hàng"
      });
    }

    const cartId = cartResult.rows[0].id;

    const checkItem = await pool.query(
      `SELECT id
       FROM cart_items
       WHERE id = $1 AND cart_id = $2`,
      [itemId, cartId]
    );

    if (checkItem.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy sản phẩm trong giỏ hàng"
      });
    }

    await pool.query(
      "DELETE FROM cart_items WHERE id = $1",
      [itemId]
    );

    await pool.query(
      `UPDATE carts
       SET updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [cartId]
    );

    return res.status(200).json({
      success: true,
      message: "Xóa sản phẩm khỏi giỏ hàng thành công"
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Lỗi xóa sản phẩm khỏi giỏ hàng",
      error: error.message
    });
  }
};

const clearCart = async (req, res) => {
  try {
    const userId = req.user.id;

    const cartResult = await pool.query(
      "SELECT id FROM carts WHERE user_id = $1",
      [userId]
    );

    if (cartResult.rows.length === 0) {
      return res.status(200).json({
        success: true,
        message: "Giỏ hàng đã trống"
      });
    }

    const cartId = cartResult.rows[0].id;

    await pool.query(
      "DELETE FROM cart_items WHERE cart_id = $1",
      [cartId]
    );

    await pool.query(
      `UPDATE carts
       SET updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [cartId]
    );

    return res.status(200).json({
      success: true,
      message: "Đã xóa toàn bộ giỏ hàng"
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Lỗi xóa toàn bộ giỏ hàng",
      error: error.message
    });
  }
};

module.exports = {
  getMyCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart
};