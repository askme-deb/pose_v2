import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { metricsMiddleware, apiDocsMiddleware, installAsyncErrorHandling, errorHandler, initObservability } from '@pospe/utilities';
import { requireAuth } from '@pospe/permissions';
import healthRouter from './routes/health';
import invoicesRouter from './routes/invoices';

process.env.SERVICE_NAME = process.env.SERVICE_NAME || 'billing-service';
installAsyncErrorHandling();
initObservability(process.env.SERVICE_NAME);

const app = express();
// Reached through the api-gateway, which forwards X-Forwarded-For.
app.set('trust proxy', 1);
const PORT = process.env.PORT || 4002;

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(pinoHttp());
metricsMiddleware(app, 'billing-service');

app.use('/', healthRouter);
apiDocsMiddleware(app, 'billing-service', 'Invoice retrieval, holds & payment status');
app.use(requireAuth);
app.use('/', invoicesRouter);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`[billing-service] listening on port ${PORT}`);
});
