require('dotenv').config();
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const services = [
  {
    numberLabel: '01',
    title: 'Diagnostic & Mechanical Care',
    description: 'Full inspection and precision repair, from a persistent rattle to a full engine rebuild.',
    imageUrl: '/images/service-diagnostic.jpg',
    priceLabel: 'From $150',
    order: 1,
  },
  {
    numberLabel: '02',
    title: 'Coachwork & Detailing',
    description: 'Paint correction, ceramic protection, and interior restoration by hand.',
    imageUrl: '/images/service-detailing.jpg',
    priceLabel: 'From $250',
    order: 2,
  },
  {
    numberLabel: '03',
    title: 'Bespoke Restoration',
    description: 'Ground-up restorations for classic and rare marques, documented from teardown to reveal.',
    imageUrl: '/images/service-restoration.jpg',
    priceLabel: 'Quoted after intake',
    order: 3,
  },
  {
    numberLabel: '04',
    title: 'Concierge Collection',
    description: 'We collect, deliver, and store your car, so the atelier is the only place it needs to go.',
    imageUrl: '/images/service-concierge.jpg',
    priceLabel: 'From $75',
    order: 4,
  },
];

const workItems = [
  {
    vehicle: '1991 Mercedes 300CE',
    imageUrl: '/images/mercedes-300ce.png',
    statusLabel: 'Closed — 9 days',
    reported: 'Hesitation on cold start, uneven idle',
    resolution: 'Rebuilt fuel distributor, replaced idle control valve',
    rating: 4.9,
    quote: 'It starts like it did in 1991. Better, honestly.',
    order: 1,
  },
  {
    vehicle: '2019 Porsche 911 GTS',
    imageUrl: '/images/porsche-911-gts.png',
    statusLabel: 'Closed — 4 days',
    reported: 'Swirl marks and clouded headlights',
    resolution: 'Two-stage paint correction, ceramic coat, headlight restoration',
    rating: 5.0,
    quote: 'Looked newer than the day I bought it.',
    order: 2,
  },
  {
    vehicle: '1974 Jaguar E-Type',
    imageUrl: '/images/jaguar-e-type.png',
    statusLabel: 'Closed — 22 days',
    reported: 'Full restoration after 30 years in storage',
    resolution: 'Engine rebuild, wiring loom replaced, interior re-trimmed',
    rating: 5.0,
    quote: "My father's car is finally mine to drive.",
    order: 3,
  },
  {
    vehicle: '2021 Range Rover Sport',
    imageUrl: '/images/range-rover.png',
    statusLabel: 'Closed — 2 days',
    reported: 'Air suspension fault, dashboard warning',
    resolution: 'Replaced rear air spring, recalibrated ride height sensors',
    rating: 4.8,
    quote: 'Explained the fix before I even asked.',
    order: 4,
  },
];

const reviews = [
  { authorName: 'J. Alden', vehicle: '1991 Mercedes 300CE', rating: 5, comment: 'It starts like it did in 1991. Better, honestly.', approved: true },
  { authorName: 'S. Osei', vehicle: '2019 Porsche 911 GTS', rating: 5, comment: 'Looked newer than the day I bought it.', approved: true },
  { authorName: 'R. Voss', vehicle: '1974 Jaguar E-Type', rating: 5, comment: "My father's car is finally mine to drive.", approved: true },
];

async function main() {
  const email = (process.env.ADMIN_EMAIL || 'admin@carmineatelier.com').toLowerCase();
  const password = process.env.ADMIN_PASSWORD || 'change-me-strong-password';
  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.admin.upsert({
    where: { email },
    update: {},
    create: { email, passwordHash },
  });
  console.log(`Admin account ready: ${email}`);

  const existingServices = await prisma.service.count();
  if (existingServices === 0) {
    await prisma.service.createMany({ data: services });
    console.log(`Seeded ${services.length} services.`);
  }

  const existingWork = await prisma.workItem.count();
  if (existingWork === 0) {
    await prisma.workItem.createMany({ data: workItems });
    console.log(`Seeded ${workItems.length} work items.`);
  }

  const existingReviews = await prisma.review.count();
  if (existingReviews === 0) {
    await prisma.review.createMany({ data: reviews });
    console.log(`Seeded ${reviews.length} reviews.`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
