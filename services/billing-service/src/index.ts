import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { metricsMiddleware } from '@pospe/utilities';
import healthRouter from './routes/health';

process.env.SERVICE_NAME = process.env.SERVICE_NAME || 'billing-service';

const app = express();
const PORT = process.env.PORT || 4002;

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(pinoHttp());
metricsMiddleware(app, 'billing-service');

app.use('/', healthRouter);

app.listen(PORT, () => {
  console.log(`[billing-service] listening on port ${PORT}`);
});
