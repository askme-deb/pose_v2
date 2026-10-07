import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { metricsMiddleware, apiDocsMiddleware, installAsyncErrorHandling, errorHandler, initObservability } from '@pospe/utilities';
import { requireAuth } from '@pospe/permissions';
import healthRouter from './routes/health';
import invoicesRouter from './routes/invoices';
import customersRouter from './routes/customers';
import gstRouter from './routes/gst';
import businessProfileRouter from './routes/businessProfile';
import branchesRouter from './routes/branches';
import quotationsRouter from './routes/quotations';
import deliveryChallansRouter from './routes/deliveryChallans';
import creditNotesRouter from './routes/creditNotes';
import debitNotesRouter from './routes/debitNotes';
import membershipPlansRouter from './routes/membershipPlans';
import { startBirthdayCron } from './lib/birthdayCron';

process.env.SERVICE_NAME = process.env.SERVICE_NAME || 'sales-service';
installAsyncErrorHandling();
initObservability(process.env.SERVICE_NAME);

const app = express();
// Reached through the api-gateway, which forwards X-Forwarded-For.
app.set('trust proxy', 1);
const PORT = process.env.PORT || 4005;

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(pinoHttp());
metricsMiddleware(app, 'sales-service');

app.use('/', healthRouter);
// Public like /health — an API doc page carries no business data, and gating
// it behind a Bearer token just adds friction for anyone exploring the API.
apiDocsMiddleware(app, 'sales-service', 'Sales orders, quotations, delivery challans, credit/debit notes, customers, wallet & membership plans');
app.use(requireAuth);
app.use('/', invoicesRouter);
app.use('/', customersRouter);
app.use('/', gstRouter);
app.use('/', businessProfileRouter);
app.use('/', branchesRouter);
app.use('/', quotationsRouter);
app.use('/', deliveryChallansRouter);
app.use('/', creditNotesRouter);
app.use('/', debitNotesRouter);
app.use('/', membershipPlansRouter);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`[sales-service] listening on port ${PORT}`);
});

startBirthdayCron();
