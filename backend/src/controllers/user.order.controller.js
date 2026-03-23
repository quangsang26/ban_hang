const pool = require("../config/db");

async function tableExists(tableName) {
  const result = await pool.query(
    `
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = $1
    LIMIT 1
    `,
    [tableName]
  );
  return result.rows.length > 0;
}

async function hasColumn(tableName, columnName) {
  const result = await pool.query(
    `
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = $1
      AND column_name = $2
    LIMIT 1
    `,
    [tableName, columnName]
  );
  return result.rows.length > 0;
}

async function getImageExpression() {
  const hasProductsImage = await hasColumn("products", "image_url");
  const hasProductImagesTable = await tableExists("product_images");
  const hasProductImagesImage =
    hasProductImagesTable && await hasColumn("product_images", "image_url");

  if (hasProductsImage) {
    return "p.image_url";
  }

  if (hasProductImagesImage) {
    return `(SELECT pi.image_url FROM product_images pi WHERE pi.product_id = oi.product_id ORDER BY pi.id ASC LIMIT 1)`;
  }

  return "NULL";
}

const getMyOrders = async (req, res) => {
  try {
    const userId = req.user.id;
    const imageExpr = await getImageExpression();

    const result = await pool.query(
      `
      SELECT
        o.id,
        o.user_id,
        o.receiver_name,
        o.receiver_phone,
        o.shipping_address,
        o.note,
        o.shipping_fee,
        o.total_amount,
        o.payment_method,
        o.order_status,
        o.payment_status,
        o.created_at,
        COUNT(oi.id)::int AS total_items,
        COALESCE(SUM(oi.quantity), 0)::int AS total_quantity,
        MAX(${imageExpr}) AS image_url
      FROM orders o
      LEFT JOIN order_items oi ON oi.order_id = o.id
      LEFT JOIN products p ON p.id = oi.product_id
      WHERE o.user_id = $1
      GROUP BY o.id
      ORDER BY o.created_at DESC
      `,
      [userId]
    );

    return res.status(200).json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Lỗi lấy danh sách đơn hàng: " + error.message
    });
  }
};

const getMyOrderDetail = async (req, res) => {
  try {
    const userId = req.user.id;
    const orderId = Number(req.params.id);

    if (!orderId || Number.isNaN(orderId)) {
      return res.status(400).json({
        success: false,
        message: "Mã đơn hàng không hợp lệ"
      });
    }

    const orderResult = await pool.query(
      `
      SELECT
        o.id,
        o.user_id,
        o.receiver_name,
        o.receiver_phone,
        o.shipping_address,
        o.note,
        o.shipping_fee,
        o.total_amount,
        o.payment_method,
        o.order_status,
        o.payment_status,
        o.created_at,
        COUNT(oi.id)::int AS total_items,
        COALESCE(SUM(oi.quantity), 0)::int AS total_quantity
      FROM orders o
      LEFT JOIN order_items oi ON oi.order_id = o.id
      WHERE o.id = $1 AND o.user_id = $2
      GROUP BY o.id
      LIMIT 1
      `,
      [orderId, userId]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy đơn hàng"
      });
    }

    const hasUnitPrice = await hasColumn("order_items", "unit_price");
    const hasSubtotal = await hasColumn("order_items", "subtotal");
    const hasSize = await hasColumn("order_items", "size");
    const hasColor = await hasColumn("order_items", "color");
    const hasProductPrice = await hasColumn("products", "price");

    const unitPriceExpr = hasUnitPrice
      ? "COALESCE(oi.unit_price, 0)"
      : hasProductPrice
        ? "COALESCE(p.price, 0)"
        : "0";

    const subtotalExpr = hasSubtotal
      ? "COALESCE(oi.subtotal, 0)"
      : `(${unitPriceExpr}) * COALESCE(oi.quantity, 0)`;

    const sizeExpr = hasSize ? "oi.size" : "NULL";
    const colorExpr = hasColor ? "oi.color" : "NULL";
    const imageExpr = await getImageExpression();

    const itemsResult = await pool.query(
      `
      SELECT
        oi.id,
        oi.order_id,
        oi.product_id,
        COALESCE(p.name, 'Sản phẩm') AS name,
        COALESCE(oi.quantity, 0)::int AS quantity,
        ${unitPriceExpr} AS unit_price,
        ${subtotalExpr} AS subtotal,
        ${sizeExpr} AS size,
        ${colorExpr} AS color,
        ${imageExpr} AS image_url
      FROM order_items oi
      LEFT JOIN products p ON p.id = oi.product_id
      WHERE oi.order_id = $1
      ORDER BY oi.id ASC
      `,
      [orderId]
    );

    const order = orderResult.rows[0];
    order.items = itemsResult.rows;

    return res.status(200).json({
      success: true,
      data: order
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Lỗi lấy chi tiết đơn hàng: " + error.message
    });
  }
};

module.exports = {
  getMyOrders,
  getMyOrderDetail
};