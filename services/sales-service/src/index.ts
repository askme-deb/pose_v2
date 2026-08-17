import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { metricsMiddleware } from '@pospe/utilities';
import healthRouter from './routes/health';
import invoicesRouter from './routes/invoices';
import customersRouter from './routes/customers';
import gstRouter from './routes/gst';
import businessProfileRouter from './routes/businessProfile';
import branchesRouter from './routes/branches';

process.env.SERVICE_NAME = process.env.SERVICE_NAME || 'sales-service';

const app = express();
const PORT = process.env.PORT || 4005;

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(pinoHttp());
metricsMiddleware(app, 'sales-service');

app.use('/', healthRouter);
app.use('/', invoicesRouter);
app.use('/', customersRouter);
app.use('/', gstRouter);
app.use('/', businessProfileRouter);
app.use('/', branchesRouter);

app.listen(PORT, () => {
  console.log(`[sales-service] listening on port ${PORT}`);
});
