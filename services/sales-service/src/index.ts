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
import { UPLOAD_ROOT } from './lib/uploads';

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
// Public like /health — a brand logo isn't sensitive, and its filename
// already isn't guessable (tenantId + timestamp), same trust level as an
// S3 public-read URL would have. helmet()'s default Cross-Origin-Resource-
// Policy is "same-origin", which silently blocks the browser from rendering
// an <img> loaded across the web-admin (5173) / api-gateway (4000) origin
// gap even though the request itself succeeds — this route needs the
// looser policy; nothing else in this service does.
app.use('/uploads', (_req, res, next) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
});
app.use('/uploads', express.static(UPLOAD_ROOT));
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
