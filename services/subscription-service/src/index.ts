import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { metricsMiddleware, apiDocsMiddleware } from '@pospe/utilities';
import { requireAuth } from '@pospe/permissions';
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
apiDocsMiddleware(app, 'subscription-service', 'Platform tenants, billing invoices, CNAME domains & audit logs');
// Not permission-gated beyond authentication: this is the platform's own
// SaaS-admin backend (managing every tenant), which the current role model
// has no dedicated permission for — tenant_owner's wildcard '*' is scoped to
// their own tenant everywhere else, but would incorrectly pass here too.
// Flagged as a follow-up; a real superadmin identity is a separate feature.
app.use(requireAuth);
app.use('/', tenantsRouter);
app.use('/', platformInvoicesRouter);
app.use('/', cnameDomainsRouter);
app.use('/', auditLogsRouter);

app.listen(PORT, () => {
  console.log(`[subscription-service] listening on port ${PORT}`);
});
