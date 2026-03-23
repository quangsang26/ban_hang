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

// Tổng quan hệ thống
router.get("/summary", verifyToken, adminOnly, async (req, res) => {
  try {
    const usersResult = await pool.query(`SELECT COUNT(*)::int AS total_users FROM users`);
    const productsResult = await pool.query(`SELECT COUNT(*)::int AS total_products FROM products`);
    const ordersResult = await pool.query(`SELECT COUNT(*)::int AS total_orders FROM orders`);
    const revenueResult = await pool.query(`
      SELECT COALESCE(SUM(total_amount), 0)::bigint AS total_revenue
      FROM orders
      WHERE payment_status = 'paid'
    `);

    return res.status(200).json({
      success: true,
      data: {
        total_users: usersResult.rows[0].total_users,
        total_products: productsResult.rows[0].total_products,
        total_orders: ordersResult.rows[0].total_orders,
        total_revenue: Number(revenueResult.rows[0].total_revenue || 0)
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Lỗi lấy báo cáo tổng quan",
      error: error.message
    });
  }
});

// Doanh thu theo ngày / tháng / năm
router.get("/revenue", verifyToken, adminOnly, async (req, res) => {
  try {
    const type = String(req.query.type || "month").toLowerCase();

    let sql = "";
    if (type === "day") {
      sql = `
        SELECT
          TO_CHAR(created_at, 'DD/MM/YYYY') AS label,
          COALESCE(SUM(total_amount), 0)::bigint AS revenue
        FROM orders
        WHERE payment_status = 'paid'
        GROUP BY DATE(created_at), TO_CHAR(created_at, 'DD/MM/YYYY')
        ORDER BY DATE(created_at) ASC
      `;
    } else if (type === "year") {
      sql = `
        SELECT
          TO_CHAR(created_at, 'YYYY') AS label,
          COALESCE(SUM(total_amount), 0)::bigint AS revenue
        FROM orders
        WHERE payment_status = 'paid'
        GROUP BY TO_CHAR(created_at, 'YYYY')
        ORDER BY TO_CHAR(created_at, 'YYYY') ASC
      `;
    } else {
      sql = `
        SELECT
          TO_CHAR(DATE_TRUNC('month', created_at), 'MM/YYYY') AS label,
          COALESCE(SUM(total_amount), 0)::bigint AS revenue
        FROM orders
        WHERE payment_status = 'paid'
        GROUP BY DATE_TRUNC('month', created_at)
        ORDER BY DATE_TRUNC('month', created_at) ASC
      `;
    }

    const result = await pool.query(sql);

    return res.status(200).json({
      success: true,
      data: result.rows.map(item => ({
        label: item.label,
        revenue: Number(item.revenue || 0)
      }))
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Lỗi lấy báo cáo doanh thu",
      error: error.message
    });
  }
});

// Thống kê trạng thái đơn hàng
router.get("/order-status", verifyToken, adminOnly, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        order_status,
        COUNT(*)::int AS total_orders
      FROM orders
      GROUP BY order_status
      ORDER BY order_status ASC
    `);

    return res.status(200).json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Lỗi lấy báo cáo trạng thái đơn hàng",
      error: error.message
    });
  }
});

// Cảnh báo tồn kho thấp
router.get("/low-stock", verifyToken, adminOnly, async (req, res) => {
  try {
    const threshold = Number(req.query.threshold || 10);

    const result = await pool.query(
      `
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
      WHERE i.quantity <= $1
      ORDER BY i.quantity ASC, i.id ASC
      `,
      [threshold]
    );

    return res.status(200).json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Lỗi lấy cảnh báo tồn kho thấp",
      error: error.message
    });
  }
});

module.exports = router;