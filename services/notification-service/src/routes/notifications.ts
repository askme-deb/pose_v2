import { Router } from 'express';
import { z } from 'zod';
import { buildLowStockMessage } from '@pospe/notifications';
import { prisma } from '../lib/prisma';
import { transporter } from '../lib/mailer';

const router = Router();

const lowStockInput = z.object({
  tenantId: z.string().min(1),
  productName: z.string().min(1),
  sku: z.string().min(1),
  stockQty: z.number().int(),
  minThreshold: z.number().int(),
});

router.post('/notifications/low-stock', async (req, res) => {
  const parsed = lowStockInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { tenantId, productName, sku, stockQty, minThreshold } = parsed.data;

  const [profile, tenant] = await Promise.all([
    prisma.tenantProfile.findUnique({ where: { tenantId } }),
    prisma.tenant.findUnique({ where: { id: tenantId } }),
  ]);
  const to = profile?.supportEmail || tenant?.ownerEmail;
  if (!to) return res.status(404).json({ error: 'No notification recipient configured for this tenant' });

  await transporter.sendMail({
    from: '"ApexPOS Alerts" <alerts@apexpos.local>',
    to,
    subject: `Low stock: ${productName}`,
    text: `${buildLowStockMessage(productName, stockQty)} (SKU ${sku}, reorder threshold ${minThreshold})`,
  });

  res.status(202).json({ sent: true, to });
});

export default router;
