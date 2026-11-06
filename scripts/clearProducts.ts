import 'dotenv/config';
import { prisma } from '../src/lib/prisma';

async function main() {
  const result = await prisma.product.deleteMany({});
  console.log(`Deleted ${result.count} products.`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  });
