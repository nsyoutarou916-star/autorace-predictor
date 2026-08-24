import { prisma } from "../lib/db";
import { VENUES } from "../lib/venues";

async function main() {
  for (const v of VENUES) {
    await prisma.venue.upsert({
      where: { code: v.code },
      update: { key: v.key, name: v.name },
      create: { code: v.code, key: v.key, name: v.name },
    });
  }
  console.log(`Seeded ${VENUES.length} venues`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
