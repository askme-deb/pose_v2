import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { metricsMiddleware, installAsyncErrorHandling, initObservability } from '@pospe/utilities';
import { requireAuth } from '@pospe/permissions';
import { ensureAsyncErrorHandling, messageShim, mobileErrorHandler } from './lib/util';
import healthRouter from './routes/health';
import authRouter, { publicRouter as loginRouter } from './routes/auth';
import catalogRouter from './routes/catalog';
import cartRouter from './routes/cart';
import ordersRouter from './routes/orders';
import insightsRouter from './routes/insights';
import purchaseRouter from './routes/purchase';
import reportsRouter, { publicRouter as downloadRouter } from './routes/reports';

process.env.SERVICE_NAME = process.env.SERVICE_NAME || 'mobile-service';
installAsyncErrorHandling();
ensureAsyncErrorHandling();
initObservability(process.env.SERVICE_NAME);

// The FoodApp's API contract (BACKEND_API.md) mounted as-is: flat paths,
// the app's own envelopes, and `message` on every error. Reached through the
// api-gateway, which strips the /api prefix.
const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 4011;

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(pinoHttp());
app.use(messageShim);
metricsMiddleware(app, 'mobile-service');

app.use('/', healthRouter);
// Public: login issues the token; report downloads carry their own signed proof.
app.use('/', loginRouter);
app.use('/', downloadRouter);

app.use(requireAuth);
app.use('/', authRouter);
app.use('/', catalogRouter);
app.use('/', cartRouter);
app.use('/', ordersRouter);
app.use('/', insightsRouter);
app.use('/', purchaseRouter);
app.use('/', reportsRouter);

app.use(mobileErrorHandler);

app.listen(PORT, () => {
  console.log(`[mobile-service] listening on port ${PORT}`);
});
