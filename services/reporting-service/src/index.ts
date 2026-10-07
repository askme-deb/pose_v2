import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { metricsMiddleware, apiDocsMiddleware, installAsyncErrorHandling, errorHandler, initObservability } from '@pospe/utilities';
import { requireAuth, requirePermission } from '@pospe/permissions';
import healthRouter from './routes/health';
import dashboardRouter from './routes/dashboard';
import reportsRouter from './routes/reports';
import { startReportScheduler } from './lib/scheduler';

process.env.SERVICE_NAME = process.env.SERVICE_NAME || 'reporting-service';
installAsyncErrorHandling();
initObservability(process.env.SERVICE_NAME);

const app = express();
// Reached through the api-gateway, which forwards X-Forwarded-For.
app.set('trust proxy', 1);
const PORT = process.env.PORT || 4009;

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(pinoHttp());
metricsMiddleware(app, 'reporting-service');

app.use('/', healthRouter);
apiDocsMiddleware(app, 'reporting-service', 'Revenue analytics & dashboard aggregates');
app.use(requireAuth, requirePermission('report:view'));
app.use('/', dashboardRouter);
app.use('/', reportsRouter);

app.use(errorHandler);

startReportScheduler();

app.listen(PORT, () => {
  console.log(`[reporting-service] listening on port ${PORT}`);
});
