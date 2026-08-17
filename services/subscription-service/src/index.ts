import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { metricsMiddleware } from '@pospe/utilities';
import healthRouter from './routes/health';
import tenantsRouter from './routes/tenants';
import platformInvoicesRouter from './routes/platformInvoices';
import cnameDomainsRouter from './routes/cnameDomains';
import auditLogsRouter from './routes/auditLogs';

process.env.SERVICE_NAME = process.env.SERVICE_NAME || 'subscription-service';

const app = express();
const PORT = process.env.PORT || 4008;

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(pinoHttp());
metricsMiddleware(app, 'subscription-service');

app.use('/', healthRouter);
app.use('/', tenantsRouter);
app.use('/', platformInvoicesRouter);
app.use('/', cnameDomainsRouter);
app.use('/', auditLogsRouter);

app.listen(PORT, () => {
  console.log(`[subscription-service] listening on port ${PORT}`);
});
