const pool = require("../config/db");

const createOrder = async (req, res) => {
  const client = await pool.connect();

  try {
    const userId = req.user.id;
    const {
      receiver_name,
      receiver_phone,
      shipping_address,
      note,
      shipping_fee,
      payment_method
    } = req.body;

    if (!receiver_name || !receiver_phone || !shipping_address || !payment_method) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập đầy đủ thông tin người nhận, địa chỉ và phương thức thanh toán"
      });
    }

    await client.query("BEGIN");

    const cartResult = await client.query(
      "SELECT id FROM carts WHERE user_id = $1",
      [userId]
    );

    if (cartResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        success: false,
        message: "Giỏ hàng không tồn tại"
      });
    }

    const cartId = cartResult.rows[0].id;

    const cartItemsResult = await client.query(
      `SELECT
        ci.id,
        ci.product_id,
        ci.quantity,
        ci.size,
        ci.color,
        p.name,
        p.price,
        p.discount_percent,
        p.status
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.id
      WHERE ci.cart_id = $1
      ORDER BY ci.id ASC`,
      [cartId]
    );

    if (cartItemsResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        success: false,
        message: "Giỏ hàng đang trống"
      });
    }

    const cartItems = cartItemsResult.rows;

    for (const item of cartItems) {
      if (item.status !== "active") {
        await client.query("ROLLBACK");
        return res.status(400).json({
          success: false,
          message: `Sản phẩm "${item.name}" hiện không khả dụng`
        });
      }
    }

    let productsTotal = 0;
    const normalizedItems = cartItems.map((item) => {
      const price = Number(item.price);
      const discountPercent = Number(item.discount_percent || 0);
      const finalPrice = price - (price * discountPercent) / 100;
      const quantity = Number(item.quantity);
      const subtotal = finalPrice * quantity;

      productsTotal += subtotal;

      return {
        ...item,
        final_price: finalPrice,
        subtotal
      };
    });

    const finalShippingFee = Number(shipping_fee || 0);
    const totalAmount = productsTotal + finalShippingFee;

    const orderResult = await client.query(
      `INSERT INTO orders (
        user_id,
        receiver_name,
        receiver_phone,
        shipping_address,
        note,
        total_amount,
        shipping_fee,
        payment_method,
        payment_status,
        order_status
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      RETURNING *`,
      [
        userId,
        receiver_name,
        receiver_phone,
        shipping_address,
        note || null,
        totalAmount,
        finalShippingFee,
        payment_method,
        "pending",
        "pending"
      ]
    );

    const order = orderResult.rows[0];

    for (const item of normalizedItems) {
      await client.query(
        `INSERT INTO order_items (
          order_id,
          product_id,
          product_name,
          price,
          quantity,
          size,
          color
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [
          order.id,
          item.product_id,
          item.name,
          item.final_price,
          item.quantity,
          item.size || null,
          item.color || null
        ]
      );
    }

    await client.query("DELETE FROM cart_items WHERE cart_id = $1", [cartId]);

    await client.query(
      `UPDATE carts
       SET updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [cartId]
    );

    await client.query("COMMIT");

    return res.status(201).json({
      success: true,
      message: "Đặt hàng thành công",
      data: {
        order_id: order.id,
        receiver_name: order.receiver_name,
        receiver_phone: order.receiver_phone,
        shipping_address: order.shipping_address,
        payment_method: order.payment_method,
        payment_status: order.payment_status,
        order_status: order.order_status,
        shipping_fee: Number(order.shipping_fee),
        total_amount: Number(order.total_amount),
        created_at: order.created_at
      }
    });
  } catch (error) {
    await client.query("ROLLBACK");
    return res.status(500).json({
      success: false,
      message: "Lỗi đặt hàng",
      error: error.message
    });
  } finally {
    client.release();
  }
};

const getMyOrders = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT
        id,
        receiver_name,
        receiver_phone,
        shipping_address,
        total_amount,
        shipping_fee,
        payment_method,
        payment_status,
        order_status,
        created_at,
        updated_at
      FROM orders
      WHERE user_id = $1
      ORDER BY id DESC`,
      [userId]
    );

    return res.status(200).json({
      success: true,
      data: result.rows.map((item) => ({
        ...item,
        total_amount: Number(item.total_amount),
        shipping_fee: Number(item.shipping_fee)
      }))
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Lỗi lấy danh sách đơn hàng",
      error: error.message
    });
  }
};

const getMyOrderById = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const orderResult = await pool.query(
      `SELECT
        id,
        receiver_name,
        receiver_phone,
        shipping_address,
        note,
        total_amount,
        shipping_fee,
        payment_method,
        payment_status,
        order_status,
        created_at,
        updated_at
      FROM orders
      WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy đơn hàng"
      });
    }

    const orderItemsResult = await pool.query(
      `SELECT
        id,
        product_id,
        product_name,
        price,
        quantity,
        size,
        color
      FROM order_items
      WHERE order_id = $1
      ORDER BY id ASC`,
      [id]
    );

    const order = orderResult.rows[0];

    return res.status(200).json({
      success: true,
      data: {
        ...order,
        total_amount: Number(order.total_amount),
        shipping_fee: Number(order.shipping_fee),
        items: orderItemsResult.rows.map((item) => ({
          ...item,
          price: Number(item.price)
        }))
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Lỗi lấy chi tiết đơn hàng",
      error: error.message
    });
  }
};

module.exports = {
  createOrder,
  getMyOrders,
  getMyOrderById
};