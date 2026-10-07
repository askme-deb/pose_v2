import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { metricsMiddleware, apiDocsMiddleware, installAsyncErrorHandling, errorHandler, initObservability } from '@pospe/utilities';
import { requireAuth, requirePermission } from '@pospe/permissions';
import healthRouter from './routes/health';
import tenantsRouter from './routes/tenants';
import platformInvoicesRouter from './routes/platformInvoices';
import cnameDomainsRouter from './routes/cnameDomains';
import auditLogsRouter from './routes/auditLogs';

process.env.SERVICE_NAME = process.env.SERVICE_NAME || 'subscription-service';
installAsyncErrorHandling();
initObservability(process.env.SERVICE_NAME);

const app = express();
// Reached through the api-gateway, which forwards X-Forwarded-For.
app.set('trust proxy', 1);
const PORT = process.env.PORT || 4008;

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(pinoHttp());
metricsMiddleware(app, 'subscription-service');

app.use('/', healthRouter);
apiDocsMiddleware(app, 'subscription-service', 'Platform tenants, billing invoices, CNAME domains & audit logs');
// The platform's own SaaS-admin backend (manages every tenant). Gated on
// platform:manage, which only super_admin holds — a tenant_owner's '*'
// deliberately does not reach platform:* permissions (see roles.ts).
app.use(requireAuth, requirePermission('platform:manage'));
app.use('/', tenantsRouter);
app.use('/', platformInvoicesRouter);
app.use('/', cnameDomainsRouter);
app.use('/', auditLogsRouter);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`[subscription-service] listening on port ${PORT}`);
});
