const express = require('express');
const prisma = require('../prisma');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/', async (req, res) => {
  const services = await prisma.service.findMany({ orderBy: { order: 'asc' } });
  res.json(services);
});

router.post('/', requireAdmin, async (req, res) => {
  const { numberLabel, title, description, imageUrl, priceLabel, order } = req.body || {};
  if (!title || !description || !imageUrl) {
    return res.status(400).json({ error: 'title, description, and imageUrl are required.' });
  }
  const service = await prisma.service.create({
    data: {
      numberLabel: numberLabel || '01',
      title,
      description,
      imageUrl,
      priceLabel: priceLabel || 'Contact for quote',
      order: Number.isFinite(Number(order)) ? Number(order) : 0,
    },
  });
  res.status(201).json(service);
});

router.put('/:id', requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const { numberLabel, title, description, imageUrl, priceLabel, order } = req.body || {};
  try {
    const service = await prisma.service.update({
      where: { id },
      data: {
        ...(numberLabel !== undefined && { numberLabel }),
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(priceLabel !== undefined && { priceLabel }),
        ...(order !== undefined && { order: Number(order) }),
      },
    });
    res.json(service);
  } catch (err) {
    res.status(404).json({ error: 'Service not found.' });
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  try {
    await prisma.service.delete({ where: { id } });
    res.status(204).end();
  } catch (err) {
    res.status(404).json({ error: 'Service not found.' });
  }
});

module.exports = router;
