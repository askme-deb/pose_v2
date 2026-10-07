import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { metricsMiddleware, apiDocsMiddleware, installAsyncErrorHandling, errorHandler, initObservability, createWorker, queueingEnabled } from '@pospe/utilities';
import { requireAuth } from '@pospe/permissions';
import { NOTIFICATION_QUEUE, type NotificationJob } from '@pospe/notifications';
import { deliverNotification } from './lib/deliver';
import healthRouter from './routes/health';
import notificationsRouter from './routes/notifications';

process.env.SERVICE_NAME = process.env.SERVICE_NAME || 'notification-service';
installAsyncErrorHandling();
initObservability(process.env.SERVICE_NAME);

const app = express();
// Reached through the api-gateway, which forwards X-Forwarded-For.
app.set('trust proxy', 1);
const PORT = process.env.PORT || 4007;

app.use(helmet());
app.use(cors());
// Report jobs carry a base64 PDF/XLSX attachment.
app.use(express.json({ limit: '10mb' }));
app.use(pinoHttp());
metricsMiddleware(app, 'notification-service');

app.use('/', healthRouter);
apiDocsMiddleware(app, 'notification-service', 'Low-stock, birthday, auth OTP & payment alerts over email, SMS and WhatsApp');
app.use(requireAuth);
app.use('/', notificationsRouter);

app.use(errorHandler);

// Durable path: other services enqueue jobs (see @pospe/notifications'
// dispatchNotification); failures are retried with exponential backoff.
if (queueingEnabled()) {
  createWorker<NotificationJob>(NOTIFICATION_QUEUE, async (job) => {
    await deliverNotification(job.data);
  });
  console.log('[notification-service] consuming queue', NOTIFICATION_QUEUE);
}

app.listen(PORT, () => {
  console.log(`[notification-service] listening on port ${PORT}`);
});
