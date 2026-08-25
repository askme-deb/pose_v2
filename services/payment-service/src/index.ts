import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { metricsMiddleware, apiDocsMiddleware } from '@pospe/utilities';
import { requireAuth } from '@pospe/permissions';
import healthRouter from './routes/health';
import webhookRouter from './routes/webhook';
import paymentsRouter from './routes/payments';

process.env.SERVICE_NAME = process.env.SERVICE_NAME || 'payment-service';

const app = express();
const PORT = process.env.PORT || 4006;

app.use(helmet());
app.use(cors());
app.use(pinoHttp());
metricsMiddleware(app, 'payment-service');

app.use('/', healthRouter);
apiDocsMiddleware(app, 'payment-service', 'Razorpay payment intents, webhook & payment records');
// Needs the raw request body to verify Razorpay's HMAC signature correctly —
// mounted before express.json() so it never gets JSON-parsed first (same
// reasoning api-gateway's proxy router uses).
app.use(webhookRouter);
app.use(express.json());
app.use(requireAuth);
app.use('/', paymentsRouter);

app.listen(PORT, () => {
  console.log(`[payment-service] listening on port ${PORT}`);
});
