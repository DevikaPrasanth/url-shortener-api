const express = require('express');
const authMiddleware = require('../middlewares/authMiddleware');

const {
  createShortUrl,
  redirectUrl,
  getAllUrls,
  deleteUrl,
  updateUrl,
  getUrlAnalytics,
  generateQrCode
} = require('../controllers/urlController');

const router = express.Router();

/**
 * @swagger
 * /api/url/shorten:
 *   post:
 *     summary: Create short URL
 *     tags: [URLs]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               originalUrl:
 *                 type: string
 *               customCode:
 *                 type: string
 *               expiresAt:
 *                 type: string
 *     responses:
 *       201:
 *         description: Short URL created
 */
router.post('/shorten', authMiddleware, createShortUrl);

/**
 * @swagger
 * /api/url:
 *   get:
 *     summary: Get all URLs for logged-in user
 *     tags: [URLs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of URLs
 */
router.get('/', authMiddleware, getAllUrls);

/**
 * @swagger
 * /api/url/analytics/{shortCode}:
 *   get:
 *     summary: Get URL analytics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: shortCode
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Analytics fetched
 */
router.get(
  '/analytics/:shortCode',
  authMiddleware,
  getUrlAnalytics
);

/**
 * @swagger
 * /api/url/qr/{shortCode}:
 *   get:
 *     summary: Generate QR code
 *     tags: [QR]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: shortCode
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: QR code generated
 */
router.get(
  '/qr/:shortCode',
  authMiddleware,
  generateQrCode
);

router.put('/:id', authMiddleware, updateUrl);

router.delete('/:id', authMiddleware, deleteUrl);

router.get('/:shortCode', redirectUrl);

module.exports = router;
