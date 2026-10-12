import { Router } from 'express';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: process.env.SERVICE_NAME, uptime: process.uptime() });
});

export default router;
