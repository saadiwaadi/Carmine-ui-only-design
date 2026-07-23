const express = require('express');
const prisma = require('../prisma');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/', async (req, res) => {
  const items = await prisma.workItem.findMany({ orderBy: { order: 'asc' } });
  res.json(items);
});

router.post('/', requireAdmin, async (req, res) => {
  const { vehicle, imageUrl, statusLabel, reported, resolution, rating, quote, order } = req.body || {};
  if (!vehicle || !imageUrl || !reported || !resolution) {
    return res.status(400).json({ error: 'vehicle, imageUrl, reported, and resolution are required.' });
  }
  const item = await prisma.workItem.create({
    data: {
      vehicle,
      imageUrl,
      statusLabel: statusLabel || 'Closed',
      reported,
      resolution,
      rating: Number(rating) || 5,
      quote: quote || '',
      order: Number.isFinite(Number(order)) ? Number(order) : 0,
    },
  });
  res.status(201).json(item);
});

router.put('/:id', requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const { vehicle, imageUrl, statusLabel, reported, resolution, rating, quote, order } = req.body || {};
  try {
    const item = await prisma.workItem.update({
      where: { id },
      data: {
        ...(vehicle !== undefined && { vehicle }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(statusLabel !== undefined && { statusLabel }),
        ...(reported !== undefined && { reported }),
        ...(resolution !== undefined && { resolution }),
        ...(rating !== undefined && { rating: Number(rating) }),
        ...(quote !== undefined && { quote }),
        ...(order !== undefined && { order: Number(order) }),
      },
    });
    res.json(item);
  } catch (err) {
    res.status(404).json({ error: 'Work item not found.' });
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  try {
    await prisma.workItem.delete({ where: { id } });
    res.status(204).end();
  } catch (err) {
    res.status(404).json({ error: 'Work item not found.' });
  }
});

module.exports = router;
