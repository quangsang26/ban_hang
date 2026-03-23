const axios = require("axios");
const crypto = require("crypto");
const pool = require("../config/db");

function signMomo(rawSignature, secretKey) {
  return crypto
    .createHmac("sha256", secretKey)
    .update(rawSignature)
    .digest("hex");
}

function toBase64Json(data) {
  return Buffer.from(JSON.stringify(data)).toString("base64");
}

function createUniqueId(prefix) {
  return `${prefix}_${Date.now()}_${crypto.randomBytes(6).toString("hex")}`;
}

const createMomoPayment = async (req, res) => {
  const client = await pool.connect();
  let localOrderId = null;

  try {
    const userId = req.user.id;
    const {
      receiver_name,
      receiver_phone,
      shipping_address,
      note,
      shipping_fee
    } = req.body;

    if (!receiver_name || !receiver_phone || !shipping_address) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập đầy đủ thông tin nhận hàng"
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
      const finalPrice = Math.round(price - (price * discountPercent) / 100);
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
    const totalAmount = Math.round(productsTotal + finalShippingFee);

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
        "momo",
        "pending",
        "pending"
      ]
    );

    const order = orderResult.rows[0];
    localOrderId = order.id;

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

    const momoOrderId = createUniqueId(`STM_${order.id}`);
    const requestId = createUniqueId("REQ");

    await client.query(
      `UPDATE orders
       SET momo_order_id = $1,
           momo_request_id = $2
       WHERE id = $3`,
      [momoOrderId, requestId, order.id]
    );

    await client.query("COMMIT");

    const redirectUrl = `${process.env.BACKEND_PUBLIC_URL}/api/payments/momo/return`;
    const ipnUrl = `${process.env.BACKEND_PUBLIC_URL}/api/payments/momo/ipn`;
    const requestType = "captureWallet";
    const orderInfo = `Thanh toan don hang STM #${order.id}`;
    const extraData = toBase64Json({
      localOrderId: order.id,
      userId
    });

    const rawSignature =
      `accessKey=${process.env.MOMO_ACCESS_KEY}` +
      `&amount=${totalAmount}` +
      `&extraData=${extraData}` +
      `&ipnUrl=${ipnUrl}` +
      `&orderId=${momoOrderId}` +
      `&orderInfo=${orderInfo}` +
      `&partnerCode=${process.env.MOMO_PARTNER_CODE}` +
      `&redirectUrl=${redirectUrl}` +
      `&requestId=${requestId}` +
      `&requestType=${requestType}`;

    const signature = signMomo(rawSignature, process.env.MOMO_SECRET_KEY);

    const momoPayload = {
      partnerCode: process.env.MOMO_PARTNER_CODE,
      requestType,
      ipnUrl,
      redirectUrl,
      orderId: momoOrderId,
      amount: String(totalAmount),
      orderInfo,
      requestId,
      extraData,
      autoCapture: true,
      lang: "vi",
      items: normalizedItems.map((item) => ({
        id: String(item.product_id),
        name: item.name,
        price: item.final_price,
        quantity: item.quantity,
        totalPrice: item.subtotal
      })),
      deliveryInfo: {
        deliveryAddress: shipping_address,
        deliveryFee: String(finalShippingFee),
        quantity: String(
          normalizedItems.reduce((sum, item) => sum + Number(item.quantity), 0)
        )
      },
      userInfo: {
        name: receiver_name,
        phoneNumber: receiver_phone
      },
      signature
    };

    const momoResponse = await axios.post(
      "https://test-payment.momo.vn/v2/gateway/api/create",
      momoPayload,
      {
        headers: {
          "Content-Type": "application/json; charset=UTF-8"
        },
        timeout: 30000
      }
    );

    const momoData = momoResponse.data;

    if (!momoData || Number(momoData.resultCode) !== 0 || !momoData.payUrl) {
      await pool.query(
        `UPDATE orders
         SET payment_status = 'failed',
             momo_result_code = $1,
             payment_message = $2,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [
          momoData?.resultCode || null,
          momoData?.message || "Không tạo được link thanh toán MoMo",
          order.id
        ]
      );

      return res.status(400).json({
        success: false,
        message: momoData?.message || "Không tạo được link thanh toán MoMo"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Tạo link thanh toán MoMo thành công",
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
        created_at: order.created_at,
        payUrl: momoData.payUrl
      }
    });
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {}

    if (localOrderId) {
      try {
        await pool.query(
          `UPDATE orders
           SET payment_status = 'failed',
               payment_message = $1,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $2`,
          [error.message, localOrderId]
        );
      } catch (updateError) {}
    }

    return res.status(500).json({
      success: false,
      message: "Lỗi tạo thanh toán MoMo",
      error: error.message
    });
  } finally {
    client.release();
  }
};

const momoIpn = async (req, res) => {
  try {
    const {
      partnerCode,
      orderId,
      requestId,
      amount,
      orderInfo,
      orderType,
      transId,
      resultCode,
      message,
      payType,
      responseTime,
      extraData,
      signature
    } = req.body;

    const rawSignature =
      `accessKey=${process.env.MOMO_ACCESS_KEY}` +
      `&amount=${amount}` +
      `&extraData=${extraData || ""}` +
      `&message=${message}` +
      `&orderId=${orderId}` +
      `&orderInfo=${orderInfo}` +
      `&orderType=${orderType}` +
      `&partnerCode=${partnerCode}` +
      `&payType=${payType}` +
      `&requestId=${requestId}` +
      `&responseTime=${responseTime}` +
      `&resultCode=${resultCode}` +
      `&transId=${transId}`;

    const expectedSignature = signMomo(rawSignature, process.env.MOMO_SECRET_KEY);

    if (signature !== expectedSignature) {
      console.error("MoMo IPN: signature không hợp lệ");
      return res.status(204).send();
    }

    if (partnerCode !== process.env.MOMO_PARTNER_CODE) {
      console.error("MoMo IPN: partnerCode không khớp");
      return res.status(204).send();
    }

    const orderResult = await pool.query(
      `SELECT id, total_amount
       FROM orders
       WHERE momo_order_id = $1
       LIMIT 1`,
      [orderId]
    );

    if (orderResult.rows.length === 0) {
      console.error("MoMo IPN: không tìm thấy đơn hàng");
      return res.status(204).send();
    }

    const order = orderResult.rows[0];

    if (Number(order.total_amount) !== Number(amount)) {
      console.error("MoMo IPN: amount không khớp với DB");
      return res.status(204).send();
    }

    if (Number(resultCode) === 0) {
      await pool.query(
        `UPDATE orders
         SET payment_status = 'paid',
             order_status = CASE
               WHEN order_status = 'pending' THEN 'processing'
               ELSE order_status
             END,
             momo_trans_id = $1,
             momo_result_code = $2,
             payment_message = $3,
             paid_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $4`,
        [transId, resultCode, message, order.id]
      );
    } else {
      await pool.query(
        `UPDATE orders
         SET payment_status = 'failed',
             momo_trans_id = $1,
             momo_result_code = $2,
             payment_message = $3,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $4`,
        [transId || null, resultCode, message, order.id]
      );
    }
  } catch (error) {
    console.error("MoMo IPN error:", error.message);
  }

  return res.status(204).send();
};

const momoReturn = async (req, res) => {
  try {
    const { orderId, resultCode, message } = req.query;

    let localOrderId = "";

    if (orderId) {
      const orderResult = await pool.query(
        `SELECT id
         FROM orders
         WHERE momo_order_id = $1
         LIMIT 1`,
        [orderId]
      );

      if (orderResult.rows.length > 0) {
        localOrderId = String(orderResult.rows[0].id);
      }
    }

    const status = Number(resultCode) === 0 ? "success" : "failed";

    const params = new URLSearchParams();
    params.set("status", status);

    if (localOrderId) {
      params.set("orderId", localOrderId);
    }

    if (typeof resultCode !== "undefined") {
      params.set("resultCode", String(resultCode));
    }

    if (message) {
      params.set("message", String(message));
    }

    return res.redirect(
      `${process.env.FRONTEND_BASE_URL}/payment-result.html?${params.toString()}`
    );
  } catch (error) {
    return res.redirect(
      `${process.env.FRONTEND_BASE_URL}/payment-result.html?status=failed`
    );
  }
};

module.exports = {
  createMomoPayment,
  momoIpn,
  momoReturn
};