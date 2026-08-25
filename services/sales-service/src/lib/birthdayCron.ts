import cron from 'node-cron';
import { notifyBirthdayOffer } from '@pospe/notifications';
import { prisma } from './prisma';

const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:4007';
const BIRTHDAY_BONUS_AMOUNT = 100;

interface BirthdayCustomer {
  id: string;
  tenantId: string;
  name: string;
  email: string | null;
}

// Finds every customer whose date of birth is today and who hasn't already
// been credited this calendar year — the lastBirthdayOfferAt year-check is
// what makes a re-run on the same day, or the job catching up after a missed
// day, safe from paying the bonus twice.
export async function runBirthdayOffers(): Promise<{ processed: number; customers: string[] }> {
  const customers = await prisma.$queryRaw<BirthdayCustomer[]>`
    SELECT id, "tenantId", name, email
    FROM customers
    WHERE "dateOfBirth" IS NOT NULL
      AND EXTRACT(MONTH FROM "dateOfBirth") = EXTRACT(MONTH FROM CURRENT_DATE)
      AND EXTRACT(DAY FROM "dateOfBirth") = EXTRACT(DAY FROM CURRENT_DATE)
      AND (
        "lastBirthdayOfferAt" IS NULL
        OR EXTRACT(YEAR FROM "lastBirthdayOfferAt") < EXTRACT(YEAR FROM CURRENT_DATE)
      )
  `;

  for (const customer of customers) {
    await prisma.$transaction([
      prisma.customerWalletTransaction.create({
        data: {
          tenantId: customer.tenantId,
          customerId: customer.id,
          type: 'BIRTHDAY_BONUS',
          amount: BIRTHDAY_BONUS_AMOUNT,
          note: 'Automated birthday wallet credit',
        },
      }),
      prisma.customer.update({
        where: { id: customer.id },
        data: { walletBalance: { increment: BIRTHDAY_BONUS_AMOUNT }, lastBirthdayOfferAt: new Date() },
      }),
    ]);

    if (customer.email) {
      notifyBirthdayOffer(NOTIFICATION_SERVICE_URL, {
        tenantId: customer.tenantId,
        customerName: customer.name,
        email: customer.email,
        bonusAmount: BIRTHDAY_BONUS_AMOUNT,
      });
    }
  }

  return { processed: customers.length, customers: customers.map((c) => c.id) };
}

export function startBirthdayCron() {
  cron.schedule('0 9 * * *', () => {
    runBirthdayOffers().catch((err) => console.error('[sales-service] birthday cron failed', err));
  });
}
