import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // This seed file is optional. Uncomment to populate example data.
  // await prisma.vehicle.create({
  //   data: {
  //     plate: 'ABC123',
  //     driverCc: '1234567',
  //     model: 'Volvo FM',
  //     commercialLine: 'Test Line',
  //     cargoBodyType: 'Test Body',
  //     driverName: 'Test Driver',
  //   },
  // });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });