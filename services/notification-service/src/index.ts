import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { metricsMiddleware } from '@pospe/utilities';
import healthRouter from './routes/health';
import notificationsRouter from './routes/notifications';

process.env.SERVICE_NAME = process.env.SERVICE_NAME || 'notification-service';

const app = express();
const PORT = process.env.PORT || 4007;

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(pinoHttp());
metricsMiddleware(app, 'notification-service');

app.use('/', healthRouter);
app.use('/', notificationsRouter);

app.listen(PORT, () => {
  console.log(`[notification-service] listening on port ${PORT}`);
});
