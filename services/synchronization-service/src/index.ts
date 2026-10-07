import 'dotenv/config';
import http from 'node:http';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { metricsMiddleware, apiDocsMiddleware, installAsyncErrorHandling, errorHandler, initObservability } from '@pospe/utilities';
import { requireAuth } from '@pospe/permissions';
import healthRouter from './routes/health';
import syncRouter from './routes/sync';
import { initRealtime } from './lib/realtime';

process.env.SERVICE_NAME = process.env.SERVICE_NAME || 'synchronization-service';
installAsyncErrorHandling();
initObservability(process.env.SERVICE_NAME);

const app = express();
// Reached through the api-gateway, which forwards X-Forwarded-For.
app.set('trust proxy', 1);
const PORT = process.env.PORT || 4010;

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(pinoHttp());
metricsMiddleware(app, 'synchronization-service');

app.use('/', healthRouter);
apiDocsMiddleware(app, 'synchronization-service', 'Offline device sync, push/heartbeat & conflict resolution');
app.use(requireAuth);
app.use('/', syncRouter);

// Socket.IO needs the raw http server (not just app.listen) so its own
// upgrade handling can sit alongside Express on the same port.
app.use(errorHandler);

const httpServer = http.createServer(app);
initRealtime(httpServer);

httpServer.listen(PORT, () => {
  console.log(`[synchronization-service] listening on port ${PORT}`);
});
