const express = require('express');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const prisma = require('../prisma');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

const ALL_SLOTS = ['09:00', '10:30', '12:00', '13:30', '15:00', '16:30', '18:00', '19:30'];

const submitLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 15,
  standardHeaders: true,
  legacyHeaders: false,
});

function generateConfirmationCode() {
  return `CRM-${crypto.randomInt(10000, 99999)}`;
}

// Public: which slots are already booked for a given date
router.get('/availability', async (req, res) => {
  const { date } = req.query;
  if (!date) {
    return res.status(400).json({ error: 'date query param is required.' });
  }
  const booked = await prisma.reservation.findMany({
    where: { date: String(date), status: { not: 'cancelled' } },
    select: { time: true },
  });
  const bookedTimes = new Set(booked.map((b) => b.time));
  const slots = ALL_SLOTS.map((time) => ({ time, available: !bookedTimes.has(time) }));
  res.json({ date, slots });
});

// Public: create a reservation
router.post('/', submitLimiter, async (req, res) => {
  const { serviceName, servicePrice, make, model, year, mileage, date, time, fullName, phone } = req.body || {};

  if (!serviceName || !make || !model || !year || !mileage || !date || !time || !fullName || !phone) {
    return res.status(400).json({ error: 'All reservation fields are required.' });
  }

  const conflict = await prisma.reservation.findFirst({
    where: { date: String(date), time: String(time), status: { not: 'cancelled' } },
  });
  if (conflict) {
    return res.status(409).json({ error: 'That slot was just booked. Please choose another time.' });
  }

  let confirmationCode = generateConfirmationCode();
  for (let attempts = 0; attempts < 5; attempts += 1) {
    const exists = await prisma.reservation.findUnique({ where: { confirmationCode } });
    if (!exists) break;
    confirmationCode = generateConfirmationCode();
  }

  const reservation = await prisma.reservation.create({
    data: {
      serviceName,
      servicePrice: servicePrice || '',
      make,
      model,
      year,
      mileage,
      date,
      time,
      fullName,
      phone,
      confirmationCode,
    },
  });

  res.status(201).json(reservation);
});

// Admin: list all reservations
router.get('/', requireAdmin, async (req, res) => {
  const reservations = await prisma.reservation.findMany({ orderBy: { createdAt: 'desc' } });
  res.json(reservations);
});

router.put('/:id', requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const { status } = req.body || {};
  const allowed = ['pending', 'confirmed', 'completed', 'cancelled'];
  if (!allowed.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${allowed.join(', ')}` });
  }
  try {
    const reservation = await prisma.reservation.update({ where: { id }, data: { status } });
    res.json(reservation);
  } catch (err) {
    res.status(404).json({ error: 'Reservation not found.' });
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  try {
    await prisma.reservation.delete({ where: { id } });
    res.status(204).end();
  } catch (err) {
    res.status(404).json({ error: 'Reservation not found.' });
  }
});

module.exports = router;
