const pool = require("../config/db");

const getAllOrdersAdmin = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        o.id,
        o.user_id,
        u.full_name AS customer_name,
        u.email AS customer_email,
        o.receiver_name,
        o.receiver_phone,
        o.shipping_address,
        o.total_amount,
        o.shipping_fee,
        o.payment_method,
        o.payment_status,
        o.order_status,
        o.created_at,
        o.updated_at
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      ORDER BY o.id DESC`
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

const getOrderByIdAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    const orderResult = await pool.query(
      `SELECT
        o.id,
        o.user_id,
        u.full_name AS customer_name,
        u.email AS customer_email,
        o.receiver_name,
        o.receiver_phone,
        o.shipping_address,
        o.note,
        o.total_amount,
        o.shipping_fee,
        o.payment_method,
        o.payment_status,
        o.order_status,
        o.created_at,
        o.updated_at
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      WHERE o.id = $1`,
      [id]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy đơn hàng"
      });
    }

    const itemsResult = await pool.query(
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
        items: itemsResult.rows.map((item) => ({
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

const updateOrderStatusAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { order_status } = req.body;

    const validStatuses = [
      "pending",
      "processing",
      "shipping",
      "completed",
      "cancelled"
    ];

    if (!order_status || !validStatuses.includes(order_status)) {
      return res.status(400).json({
        success: false,
        message: "Trạng thái đơn hàng không hợp lệ"
      });
    }

    const check = await pool.query(
      "SELECT id, order_status FROM orders WHERE id = $1",
      [id]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy đơn hàng"
      });
    }

    const result = await pool.query(
      `UPDATE orders
       SET order_status = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [order_status, id]
    );

    return res.status(200).json({
      success: true,
      message: "Cập nhật trạng thái đơn hàng thành công",
      data: {
        ...result.rows[0],
        total_amount: Number(result.rows[0].total_amount),
        shipping_fee: Number(result.rows[0].shipping_fee)
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Lỗi cập nhật trạng thái đơn hàng",
      error: error.message
    });
  }
};

const updatePaymentStatusAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { payment_status } = req.body;

    const validStatuses = [
      "pending",
      "paid",
      "failed",
      "refunded"
    ];

    if (!payment_status || !validStatuses.includes(payment_status)) {
      return res.status(400).json({
        success: false,
        message: "Trạng thái thanh toán không hợp lệ"
      });
    }

    const check = await pool.query(
      "SELECT id, payment_status FROM orders WHERE id = $1",
      [id]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy đơn hàng"
      });
    }

    const result = await pool.query(
      `UPDATE orders
       SET payment_status = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [payment_status, id]
    );

    return res.status(200).json({
      success: true,
      message: "Cập nhật trạng thái thanh toán thành công",
      data: {
        ...result.rows[0],
        total_amount: Number(result.rows[0].total_amount),
        shipping_fee: Number(result.rows[0].shipping_fee)
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Lỗi cập nhật trạng thái thanh toán",
      error: error.message
    });
  }
};

module.exports = {
  getAllOrdersAdmin,
  getOrderByIdAdmin,
  updateOrderStatusAdmin,
  updatePaymentStatusAdmin
};