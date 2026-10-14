import { Router } from 'express';
import { requirePermission } from '@pospe/permissions';
import { listCodes } from '../lib/devOutbox';
import { smtpConfigured } from '../lib/mailer';

const router = Router();

// Platform admin only: the sign-in codes that couldn't be emailed because no
// mail server is set up yet. Empty (and never filled) once SMTP_HOST is set.
router.get('/dev-codes', requirePermission('platform:manage'), (_req, res) => {
  res.json({ emailConfigured: smtpConfigured(), codes: smtpConfigured() ? [] : listCodes() });
});

export default router;
