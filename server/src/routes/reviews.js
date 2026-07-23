const express = require('express');
const rateLimit = require('express-rate-limit');
const prisma = require('../prisma');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

const submitLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

// Public: approved reviews only
router.get('/', async (req, res) => {
  const reviews = await prisma.review.findMany({
    where: { approved: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json(reviews);
});

// Public: submit a new review (goes in as pending, needs admin approval)
router.post('/', submitLimiter, async (req, res) => {
  const { authorName, vehicle, rating, comment } = req.body || {};
  const ratingNum = Number(rating);

  if (!authorName || !comment || !Number.isFinite(ratingNum) || ratingNum < 1 || ratingNum > 5) {
    return res.status(400).json({ error: 'authorName, comment, and a rating between 1 and 5 are required.' });
  }

  const review = await prisma.review.create({
    data: {
      authorName: String(authorName).slice(0, 120),
      vehicle: vehicle ? String(vehicle).slice(0, 120) : null,
      rating: Math.round(ratingNum),
      comment: String(comment).slice(0, 1000),
      approved: false,
    },
  });

  res.status(201).json({ message: 'Thanks — your review is awaiting approval.', review });
});

// Admin: see every review, approved or not
router.get('/all', requireAdmin, async (req, res) => {
  const reviews = await prisma.review.findMany({ orderBy: { createdAt: 'desc' } });
  res.json(reviews);
});

router.put('/:id', requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const { authorName, vehicle, rating, comment, approved } = req.body || {};
  try {
    const review = await prisma.review.update({
      where: { id },
      data: {
        ...(authorName !== undefined && { authorName }),
        ...(vehicle !== undefined && { vehicle }),
        ...(rating !== undefined && { rating: Number(rating) }),
        ...(comment !== undefined && { comment }),
        ...(approved !== undefined && { approved: Boolean(approved) }),
      },
    });
    res.json(review);
  } catch (err) {
    res.status(404).json({ error: 'Review not found.' });
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  try {
    await prisma.review.delete({ where: { id } });
    res.status(204).end();
  } catch (err) {
    res.status(404).json({ error: 'Review not found.' });
  }
});

module.exports = router;
