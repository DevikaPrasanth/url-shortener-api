const pool = require("../config/db");
const crypto = require("crypto");
const { isValidUrl } = require("../utils/validators");
const redisClient = require("../config/redis");
const QRCode = require("qrcode");
const logger = require("../utils/logger");

const createShortUrl = async (req, res) => {
  try {
    const originalUrl = req.body?.originalUrl;
    const customCode = req.body?.customCode;
    const expiresAt = req.body?.expiresAt;

    // validation
    if (!originalUrl) {
      return res.status(400).json({
        success: false,
        message: "Original URL is required",
      });
    }

    // URL validation
    if (!isValidUrl(originalUrl)) {
      return res.status(400).json({
        success: false,
        message: "Invalid URL",
      });
    }

    // check if URL already exists
    const existingUrl = await pool.query(
      "SELECT * FROM urls WHERE original_url = $1 AND user_id = $2",
      [originalUrl, req.user.id],
    );

    if (existingUrl.rows.length > 0) {
      return res.status(200).json({
        success: true,
        message: "Short URL already exists",
        data: {
          id: existingUrl.rows[0].id,
          originalUrl: existingUrl.rows[0].original_url,
          shortCode: existingUrl.rows[0].short_code,
          shortUrl: `${process.env.BASE_URL}/api/url/${existingUrl.rows[0].short_code}`,
          clickCount: existingUrl.rows[0].click_count,
          createdAt: existingUrl.rows[0].created_at,
        },
      });
    }

    let shortCode;

    // if custom code provided
    if (customCode) {
      // check availability
      const existingCode = await pool.query(
        "SELECT * FROM urls WHERE short_code = $1",
        [customCode]
      );

      if (existingCode.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: "Custom code already taken",
        });
      }

      shortCode = customCode;
    } else {
      // generate random code
      shortCode = crypto.randomBytes(3).toString("hex");
    }

    // save to DB
    const result = await pool.query(
      `INSERT INTO urls (
         original_url,
         short_code,
         user_id,
         expires_at
       )
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [originalUrl, shortCode, req.user.id, expiresAt || null],
    );

    return res.status(201).json({
      success: true,
      message: "Short URL created",
      data: result.rows[0],
    });
  } catch (error) {
    logger.error(error.message);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const redirectUrl = async (req, res) => {
  try {
    const { shortCode } = req.params;

    // check Redis cache
    const cachedUrl = await redisClient.get(shortCode);

    if (cachedUrl) {
      console.log("Cache HIT");

      await pool.query(
        `UPDATE urls
         SET click_count = click_count + 1
         WHERE short_code = $1`,
        [shortCode]
      );

      return res.redirect(cachedUrl);
    }

    console.log("Cache MISS");

    // fetch from DB
    const result = await pool.query(
      `SELECT * FROM urls WHERE short_code = $1`,
      [shortCode]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "URL not found",
      });
    }

    const url = result.rows[0];

    // check expiration
    if (
      url.expires_at &&
      new Date(url.expires_at) < new Date()
    ) {
      return res.status(410).json({
        success: false,
        message: "This link has expired",
      });
    }

    // increment click count
    await pool.query(
      `UPDATE urls
       SET click_count = click_count + 1
       WHERE short_code = $1`,
      [shortCode]
    );

    const cacheExpirySeconds = url.expires_at
      ? Math.min(
          3600,
          Math.max(1, Math.floor((new Date(url.expires_at) - new Date()) / 1000))
        )
      : 3600;

    // store in Redis cache
    await redisClient.set(
      shortCode,
      url.original_url,
      {
        EX: cacheExpirySeconds
      }
    );

    return res.redirect(url.original_url);
  } catch (error) {
    logger.error(error.message);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const getAllUrls = async (req, res) => {
  try {

    const result = await pool.query(
      `SELECT * FROM urls
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [req.user.id]
    );

    return res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });

  } catch (error) {
    logger.error(error.message);

    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

const deleteUrl = async (req, res) => {
  try {

    const { id } = req.params;

    // check if URL exists
    const existingUrl = await pool.query(
      'SELECT * FROM urls WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );

    if (existingUrl.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'URL not found'
      });
    }

    // delete URL
    await pool.query(
      'DELETE FROM urls WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );

    return res.status(200).json({
      success: true,
      message: 'URL deleted successfully'
    });

  } catch (error) {
    logger.error(error.message);

    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

const updateUrl = async (req, res) => {
  try {

    const { id } = req.params;
    const originalUrl = req.body?.originalUrl;

    // validation
    if (!originalUrl) {
      return res.status(400).json({
        success: false,
        message: 'Original URL is required'
      });
    }

    // validate URL
    if (!isValidUrl(originalUrl)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid URL'
      });
    }

    // check if URL exists
    const existingUrl = await pool.query(
      'SELECT * FROM urls WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );

    if (existingUrl.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'URL not found'
      });
    }

    // update URL
    const updatedUrl = await pool.query(
      `UPDATE urls
       SET original_url = $1
       WHERE id = $2 AND user_id = $3
       RETURNING *`,
      [originalUrl, id, req.user.id]
    );

    return res.status(200).json({
      success: true,
      message: 'URL updated successfully',
      data: updatedUrl.rows[0]
    });

  } catch (error) {

    logger.error(error.message);

    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

const getUrlAnalytics = async (req, res) => {
  try {
    const { shortCode } = req.params;

    const result = await pool.query(
      `SELECT
        id,
        original_url,
        short_code,
        click_count,
        created_at,
        expires_at
       FROM urls
       WHERE short_code = $1
       AND user_id = $2`,
      [shortCode, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'URL not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    logger.error(error.message);

    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

const generateQrCode = async (req, res) => {
  try {
    const { shortCode } = req.params;

    // find URL
    const result = await pool.query(
      `SELECT * FROM urls
       WHERE short_code = $1
       AND user_id = $2`,
      [shortCode, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'URL not found'
      });
    }

    const shortUrl =
      `${process.env.BASE_URL}/api/url/${shortCode}`;

    // generate QR code
    const qrCodeImage = await QRCode.toDataURL(shortUrl);

    return res.status(200).json({
      success: true,
      shortUrl,
      qrCode: qrCodeImage
    });
  } catch (error) {
    logger.error(error.message);

    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

module.exports = {
  createShortUrl,
  redirectUrl,
  getAllUrls,
  deleteUrl,
  updateUrl,
  getUrlAnalytics,
  generateQrCode
};
