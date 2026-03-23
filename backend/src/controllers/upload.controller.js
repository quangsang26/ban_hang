const path = require("path");
const fs = require("fs");
const multer = require("multer");
const pool = require("../config/db");

const uploadDir = path.join(__dirname, "..", "uploads", "products");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `product-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];

  if (!allowedMimeTypes.includes(file.mimetype)) {
    return cb(new Error("Chỉ chấp nhận file ảnh jpg, jpeg, png, webp"), false);
  }

  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024
  }
});

const uploadProductImage = async (req, res) => {
  try {
    const { productId } = req.params;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng chọn file ảnh"
      });
    }

    const productCheck = await pool.query(
      "SELECT id FROM products WHERE id = $1",
      [productId]
    );

    if (productCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy sản phẩm"
      });
    }

    const imageUrl = `/uploads/products/${req.file.filename}`;

    const mainImageCheck = await pool.query(
      "SELECT id FROM product_images WHERE product_id = $1 AND is_main = true LIMIT 1",
      [productId]
    );

    const isMain = mainImageCheck.rows.length === 0;

    const result = await pool.query(
      `INSERT INTO product_images (product_id, image_url, is_main)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [productId, imageUrl, isMain]
    );

    return res.status(201).json({
      success: true,
      message: "Upload ảnh sản phẩm thành công",
      data: result.rows[0]
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Lỗi upload ảnh sản phẩm",
      error: error.message
    });
  }
};

const getProductImages = async (req, res) => {
  try {
    const { productId } = req.params;

    const result = await pool.query(
      `SELECT id, product_id, image_url, is_main, created_at
       FROM product_images
       WHERE product_id = $1
       ORDER BY is_main DESC, id ASC`,
      [productId]
    );

    return res.status(200).json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Lỗi lấy danh sách ảnh sản phẩm",
      error: error.message
    });
  }
};

const setMainProductImage = async (req, res) => {
  try {
    const { imageId } = req.params;

    const imageResult = await pool.query(
      `SELECT id, product_id
       FROM product_images
       WHERE id = $1`,
      [imageId]
    );

    if (imageResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy ảnh"
      });
    }

    const productId = imageResult.rows[0].product_id;

    await pool.query(
      "UPDATE product_images SET is_main = false WHERE product_id = $1",
      [productId]
    );

    const result = await pool.query(
      `UPDATE product_images
       SET is_main = true
       WHERE id = $1
       RETURNING *`,
      [imageId]
    );

    return res.status(200).json({
      success: true,
      message: "Đặt ảnh chính thành công",
      data: result.rows[0]
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Lỗi đặt ảnh chính",
      error: error.message
    });
  }
};

const deleteProductImage = async (req, res) => {
  try {
    const { imageId } = req.params;

    const imageResult = await pool.query(
      `SELECT id, product_id, image_url, is_main
       FROM product_images
       WHERE id = $1`,
      [imageId]
    );

    if (imageResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy ảnh"
      });
    }

    const image = imageResult.rows[0];

    await pool.query("DELETE FROM product_images WHERE id = $1", [imageId]);

    const filePath = path.join(__dirname, "..", image.image_url.replace("/uploads/", "uploads/"));
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    if (image.is_main) {
      const nextImage = await pool.query(
        `SELECT id
         FROM product_images
         WHERE product_id = $1
         ORDER BY id ASC
         LIMIT 1`,
        [image.product_id]
      );

      if (nextImage.rows.length > 0) {
        await pool.query(
          "UPDATE product_images SET is_main = true WHERE id = $1",
          [nextImage.rows[0].id]
        );
      }
    }

    return res.status(200).json({
      success: true,
      message: "Xóa ảnh thành công"
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Lỗi xóa ảnh",
      error: error.message
    });
  }
};

module.exports = {
  upload,
  uploadProductImage,
  getProductImages,
  setMainProductImage,
  deleteProductImage
};