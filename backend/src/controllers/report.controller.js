const pool = require("../config/db");

const getDashboardSummary = async (req, res) => {
  try {
    const totalUsersResult = await pool.query(
      "SELECT COUNT(*)::int AS total_users FROM users"
    );

    const totalProductsResult = await pool.query(
      "SELECT COUNT(*)::int AS total_products FROM products"
    );

    const totalOrdersResult = await pool.query(
      "SELECT COUNT(*)::int AS total_orders FROM orders"
    );

    const totalRevenueResult = await pool.query(
      `SELECT COALESCE(SUM(total_amount), 0) AS total_revenue
       FROM orders
       WHERE payment_status = 'paid'`
    );

    return res.status(200).json({
      success: true,
      data: {
        total_users: totalUsersResult.rows[0].total_users,
        total_products: totalProductsResult.rows[0].total_products,
        total_orders: totalOrdersResult.rows[0].total_orders,
        total_revenue: Number(totalRevenueResult.rows[0].total_revenue)
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Lỗi thống kê tổng quan",
      error: error.message
    });
  }
};

const getRevenueReport = async (req, res) => {
  try {
    const { type = "day" } = req.query;

    let query = "";

    if (type === "day") {
      query = `
        SELECT
          TO_CHAR(created_at, 'YYYY-MM-DD') AS label,
          COUNT(*)::int AS total_orders,
          COALESCE(SUM(total_amount), 0) AS revenue
        FROM orders
        WHERE payment_status = 'paid'
        GROUP BY TO_CHAR(created_at, 'YYYY-MM-DD')
        ORDER BY label ASC
      `;
    } else if (type === "month") {
      query = `
        SELECT
          TO_CHAR(created_at, 'YYYY-MM') AS label,
          COUNT(*)::int AS total_orders,
          COALESCE(SUM(total_amount), 0) AS revenue
        FROM orders
        WHERE payment_status = 'paid'
        GROUP BY TO_CHAR(created_at, 'YYYY-MM')
        ORDER BY label ASC
      `;
    } else if (type === "year") {
      query = `
        SELECT
          TO_CHAR(created_at, 'YYYY') AS label,
          COUNT(*)::int AS total_orders,
          COALESCE(SUM(total_amount), 0) AS revenue
        FROM orders
        WHERE payment_status = 'paid'
        GROUP BY TO_CHAR(created_at, 'YYYY')
        ORDER BY label ASC
      `;
    } else {
      return res.status(400).json({
        success: false,
        message: "type chỉ được là day, month hoặc year"
      });
    }

    const result = await pool.query(query);

    return res.status(200).json({
      success: true,
      type,
      data: result.rows.map((item) => ({
        ...item,
        revenue: Number(item.revenue)
      }))
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Lỗi báo cáo doanh thu",
      error: error.message
    });
  }
};

const getOrderStatusReport = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        order_status,
        COUNT(*)::int AS total_orders
      FROM orders
      GROUP BY order_status
      ORDER BY order_status ASC`
    );

    return res.status(200).json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Lỗi thống kê trạng thái đơn hàng",
      error: error.message
    });
  }
};

const getInventoryReport = async (req, res) => {
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
      ORDER BY i.quantity ASC, i.id ASC`
    );

    return res.status(200).json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Lỗi báo cáo tồn kho",
      error: error.message
    });
  }
};

const getLowStockReport = async (req, res) => {
  try {
    const threshold = Number(req.query.threshold || 10);

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
      WHERE i.quantity <= $1
      ORDER BY i.quantity ASC, i.id ASC`,
      [threshold]
    );

    return res.status(200).json({
      success: true,
      threshold,
      data: result.rows
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Lỗi cảnh báo tồn kho thấp",
      error: error.message
    });
  }
};

module.exports = {
  getDashboardSummary,
  getRevenueReport,
  getOrderStatusReport,
  getInventoryReport,
  getLowStockReport
};